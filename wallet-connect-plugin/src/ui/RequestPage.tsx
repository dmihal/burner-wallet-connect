import React, { useState } from 'react';
import { PluginPageContext } from '@burner-wallet/types';
import WalletConnectPlugin, { Request } from '../WalletConnectPlugin';
import requestComponents from './request-components';

const RequestPage: React.FC<PluginPageContext<{}, WalletConnectPlugin>> = ({
  BurnerComponents, actions, plugin
}) => {
  const [, rerender] = useState({});
  const request = plugin.getPendingRequest();
  if (!request) {
    actions.navigateTo('/');
    return null;
  }

  const accept = async () => {
    await plugin.approveRequest();
    rerender({});
  };

  const reject = () => {
    plugin.rejectRequest();
    rerender({});
  };

  const TXComponent = requestComponents[request.type];

  const { Page, Button } = BurnerComponents;
  return (
    <Page title="WalletConnect Request">
      <div>Approve request:</div>
      {TXComponent ? (
        <TXComponent params={request.data} />
      ) : (
        <pre>{JSON.stringify(request, null, '  ')}</pre>
      )}
      <div>
        <Button onClick={reject}>Reject</Button>
        <Button onClick={accept}>Accept</Button>
      </div>
    </Page>
  );
};

export default RequestPage;
