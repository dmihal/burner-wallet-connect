import { BurnerPluginContext, Plugin, Actions } from '@burner-wallet/types';
import Connector from '@walletconnect/core';
import * as cryptoLib from '@walletconnect/browser-crypto';
import AcceptConnectionPage from './ui/AcceptConnectionPage';
import RequestPage from './ui/RequestPage';
import WalletConnectStatus from './ui/WalletConnectStatus';

interface PluginActionContext {
  actions: Actions;
}

interface Session {
  name: string;
  description: string;
  icon?: string;
}

export interface Request {
  id: number;
  type: string;
  data: any;
}

const URI_KEY = 'walletconnect-uri';

interface WCPluginOptions {
  defaultChainId?: string;
}

export default class WalletConnectPlugin implements Plugin {
  private pluginContext?: BurnerPluginContext;
  public connector: Connector | null = null;
  public pendingSession: Session | null = null;
  public defaultChainId: string;
  private pendingRequests: Request[] = [];
  private autoApprove: { [chain: string]: { [asset: string]: boolean } } = {};

  constructor({ defaultChainId = '1' }: WCPluginOptions = {}) {
    this.defaultChainId = defaultChainId;
  }

  initializePlugin(pluginContext: BurnerPluginContext) {
    this.pluginContext = pluginContext;

    pluginContext.onQRScanned((scannedQR: string, ctx: PluginActionContext) => {
      if (scannedQR.indexOf('wc:') === 0) {
        this.initializeWC(scannedQR, ctx.actions.navigateTo);
        return true;
      }
    });

    pluginContext.addPage('/wallet-connect/session-request', AcceptConnectionPage);
    pluginContext.addPage('/wallet-connect/call-request', RequestPage);
    pluginContext.addElement('home-middle', WalletConnectStatus);

    pluginContext.onStartup((ctx: PluginActionContext) => {
      const storedURI = window.localStorage.getItem(URI_KEY);
      if (storedURI) {
        this.initializeWC(storedURI, ctx.actions.navigateTo);
      }
    });
  }

  initializeWC(uri: string, navigateTo: (path: string) => void) {
    const clientMeta = {
      description: 'Burner Wallet',
      url: 'https://burnerfactory.com',
      icons: ['https://walletconnect.org/walletconnect-logo.png'],
      name: 'Burner Wallet',
    };

    const walletConnector = new Connector({
      cryptoLib,
      connectorOpts: { uri, clientMeta },
    });

    walletConnector.on('session_request', (error: any, payload: any) => {
      if (error) {
        throw error;
      }

      this.pendingSession = {
        name: payload.params[0].peerMeta.name,
        description: payload.params[0].peerMeta.description,
      };
      navigateTo('/wallet-connect/session-request');
    });

    walletConnector.on('call_request', (error, payload) => {
      if (error) {
        throw error;
      }

      if (payload.method.indexOf('bypass_') === 0) {
        payload.method = payload.method.substring(7);
      }

      if (this.tryAutoApprove(payload)) {
        return;
      }

      this.pendingRequests.push({
        id: payload.id,
        type: payload.method,
        data: payload.params,
      });

      navigateTo('/wallet-connect/call-request');
    });

    walletConnector.on('wc_supportsAutoApprove', (error, payload) => {
      this.getConnector().approveRequest({ id: payload.id, result: true });
    });

    walletConnector.on('wc_setAutoApprove', (error, payload) => {
      const data = payload.params[0];
      if (data.on === false && this.autoApprove[data.chainId]) {
        this.autoApprove[data.chainId][data.asset] = false;
        this.getConnector().approveRequest({ id: payload.id, result: true });
      } else {

        this.pendingRequests.push({
          id: payload.id,
          type: payload.method,
          data: payload.params,
        });

        navigateTo('/wallet-connect/call-request');
      }
    });

    walletConnector.on('disconnect', (error: any, payload: any) => {
      if (error) {
        throw error;
      }

      this.connector = null;
    });

    this.connector = walletConnector;
  }

  getConnector(): Connector {
    if (!this.connector) {
      throw new Error('Connector unavailable')
    }
    return this.connector;
  }

  acceptSession(accounts: string[]) {
    const connector = this.getConnector();
    window.localStorage.setItem(URI_KEY, connector.uri);
    connector.approveSession({ accounts, chainId: parseInt(this.defaultChainId) });
  }

  rejectSession() {
    this.getConnector().rejectSession({ message: 'Connection declined' });
  }

  disconnect() {
    this.getConnector().killSession();
    this.connector = null;
  }

  getPendingRequest() {
    return this.pendingRequests.length > 0 ? this.pendingRequests[0] : null;
  }

  async approveRequest() {
    const request = this.pendingRequests.shift();
    if (!request) {
      return;
    }
    if (this.handleRequestInternally(request)) {
      return;
    }

    const network = request.data[1] || (request.data[0] && request.data[0].chainId) || this.defaultChainId;
    const result = await this.providerSend(request.type, request.data, network);
    this.getConnector().approveRequest({ id: request.id, result });
  }

  handleRequestInternally(request: Request) {
    switch (request.type) {
      case 'wc_setAutoApprove':
        this.autoApprove[request.data[0].chainId] = {
          ...this.autoApprove[request.data[0].chainId],
          [request.data[0].asset]: request.data[0].on,
        };
        this.getConnector().approveRequest({ id: request.id, result: true });
        return true;

      default:
        return false;
    }
  }

  rejectRequest() {
    const request = this.pendingRequests.shift();
    if (!request) {
      return;
    }

    this.getConnector().rejectRequest({
      id: request.id,
      error: {
        code: 400,
        message: 'User rejected request',
      }
    });
  }

  private tryAutoApprove(payload: any) {
    if (payload.method === 'eth_sendTransaction') {
      const tx = payload.params[0];
      const chain = tx.chainId || this.defaultChainId;
      const asset = tx.data && tx.data.length === 0
        ? '0x0000000000000000000000000000000000000000'
        : tx.to;

      if ((this.autoApprove[chain] || {})[asset]) {
        this.providerSend(payload.method, payload.params, chain)
          .then((result: any) => this.getConnector().approveRequest({ id: payload.id, result }));

        return true;
      }
    }
    return false;
  }

  private providerSend(method: string, params: any[], network: string = this.defaultChainId): Promise<any> {
    return new Promise((resolve, reject) => {
      const provider: any = this.pluginContext!.getWeb3(network.toString()).currentProvider;
      provider.sendAsync({ method, params }, (err: any, result: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.result);
        }
      });

    });
  }
}
