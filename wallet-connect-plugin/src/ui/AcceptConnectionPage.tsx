import React from 'react';
import { PluginPageContext } from '@burner-wallet/types';
import WalletConnectPlugin from '../WalletConnectPlugin';

const AcceptConnectionPage: React.FC<PluginPageContext> = ({ BurnerComponents, accounts, actions, plugin }) => {
  const _plugin = plugin as WalletConnectPlugin;

  if (!_plugin.pendingSession) {
    actions.navigateTo('/');
    return null;
  }

  const accept = () => {
    _plugin.acceptSession(accounts);
    actions.navigateTo('/');
  };

  const reject = () => {
    _plugin.rejectSession();
    actions.navigateTo('/');
  }

  const { Page, Button } = BurnerComponents;
  return (
    <Page title="WalletConnect Request">
      <div>Connect to:</div>
      <div>{_plugin.pendingSession.name}</div>
      <div>{_plugin.pendingSession.description}</div>
      <div>
        <Button onClick={reject}>Reject</Button>
        <Button onClick={accept}>Accept</Button>
      </div>
    </Page>
  );
};

export default AcceptConnectionPage;
