import { BurnerPluginContext, Plugin, Actions } from '@burner-wallet/types';
import Connector from '@walletconnect/core';
import * as cryptoLib from '@walletconnect/browser-crypto';
import AcceptConnectionPage from './ui/AcceptConnectionPage';
import RequestPage from './ui/RequestPage';
import MyElement from './ui/MyElement';

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

export default class WalletConnectPlugin implements Plugin {
  private pluginContext?: BurnerPluginContext;
  private connector: Connector | null = null;
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
    pluginContext.addElement('home-middle', MyElement);
  }

  initializeWC(uri: string, navigateTo: (path: string) => void) {

    const clientMeta = {
      description: 'Burner Wallet',
      url: 'https://burnerfactory.com',
      icons: ['https://walletconnect.org/walletconnect-logo.png'],
      name: 'Burner Wallet',
    };

    const walletConnector = new Connector(
      cryptoLib,
      { uri },
      null, // transport
      null, // storage
      clientMeta
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
    this.getConnector().approveSession({ accounts, chainId: DEFAULT_CHAIN });
  }

  rejectSession() {
    this.getConnector().rejectSession({ message: 'Connection declined' });
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
      const provider = this.pluginContext.getWeb3(network.toString()).currentProvider;
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
