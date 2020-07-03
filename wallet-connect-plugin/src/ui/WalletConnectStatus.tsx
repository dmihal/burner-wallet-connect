import React, { useState } from 'react';
import { PluginElementContext } from '@burner-wallet/types';

const WalletConnectStatus: React.FC<PluginElementContext<WalletConnectPlugin>> = ({ plugin }) => {
  const [, rerender] = useState({});

  if (!plugin.connector) {
    return null;
  }

  const disconnect = () => {
    plugin.disconnect();
    rerender({});
  };

  return (
    <div>
      <div>WalletConnect</div>
      <div>Connected{plugin.connector.peerMeta ? ` to ${plugin.connector.peerMeta.name}` : ''}</div>
      <div onClick={disconnect}>Disconnect</div>
    </div>
  );
};

export default WalletConnectStatus;
