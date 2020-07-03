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

const DEFAULT_CHAIN = 1;
const URI_KEY = 'walletconnect-uri';

export default class WalletConnectPlugin implements Plugin {
  private pluginContext?: BurnerPluginContext;
  public connector: Connector | null = null;
  public pendingSession: Session | null = null;
  private pendingRequests: Request[] = [];

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
cryptoLib: ICryptoLib;
    connectorOpts: IWalletConnectOptions;
    transport?: ITransportLib;
    sessionStorage?: ISessionStorage;
    pushServerOpts?: IPushServerOptions;
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
    );

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

      this.pendingRequests.push({
        id: payload.id,
        type: payload.method,
        data: payload.params,
      });

      navigateTo('/wallet-connect/call-request');
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
    connector.approveSession({ accounts, chainId: DEFAULT_CHAIN });
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
    const network = request.data[0] && request.data[0].chainId || DEFAULT_CHAIN;
    const result = await this.providerSend(request.type, request.data, network);
    this.getConnector().approveRequest({ id: request.id, result });
  }

  rejectRequest() {
    const request = this.pendingRequests.shift();
    this.getConnector().rejectRequest({
      id: request.id,
      error: {
        code: 'REJECTED',
        message: 'User rejected request',
      }
    });
  }

  private providerSend(method: string, params: any[], network: number = DEFAULT_CHAIN): Promise<any> {
    return new Promise((resolve, reject) => {
      const provider: any = this.pluginContext.getWeb3(network.toString()).currentProvider;
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
