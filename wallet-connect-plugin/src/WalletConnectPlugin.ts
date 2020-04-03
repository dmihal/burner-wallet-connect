import { BurnerPluginContext, Plugin, Actions } from '@burner-wallet/types';
import Connector from '@walletconnect/core';
import * as cryptoLib from '@walletconnect/browser-crypto';
import AcceptConnectionPage from './ui/AcceptConnectionPage';
import MyElement from './ui/MyElement';

interface PluginActionContext {
  actions: Actions;
}

interface Session {
  name: string;
  description: string;
  icon?: string;
} 

export default class WalletConnectPlugin implements Plugin {
  private pluginContext?: BurnerPluginContext;
  private connector: Connector | null = null;
  public pendingSession: Session | null = null;

  initializePlugin(pluginContext: BurnerPluginContext) {
    this.pluginContext = pluginContext;

    pluginContext.onQRScanned((scannedQR: string, ctx: PluginActionContext) => {
      if (scannedQR.indexOf('wc:') === 0) {
        this.initializeWC(scannedQR, ctx.actions.navigateTo);
        return true;
      }
    });

    pluginContext.addPage('/wallet-connect/session-request', AcceptConnectionPage);
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
    this.getConnector().approveSession({ accounts, chainId: 1 });
  }

  rejectSession() {
    this.getConnector().rejectSession({ message: 'Connection declined' });
  }
}
