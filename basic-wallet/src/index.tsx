import React from 'react';
import ReactDOM from 'react-dom';
import { dai, eth } from '@burner-wallet/assets';
import BurnerCore from '@burner-wallet/core';
import { LocalSigner } from '@burner-wallet/core/signers';
import { InfuraGateway } from '@burner-wallet/core/gateways';
import Exchange, { Uniswap, XDaiBridge } from '@burner-wallet/exchange';
import ModernUI from '@burner-wallet/modern-ui';
import WalletConnectPlugin from 'wallet-connect-plugin';

const core = new BurnerCore({
  signers: [new LocalSigner()],
  gateways: [new InfuraGateway(process.env.REACT_APP_INFURA_KEY)],
  assets: [dai, eth],
});

const exchange = new Exchange({
  pairs: [new Uniswap('dai')],
});

const BurnerWallet = () =>
  <ModernUI
    title="Wallet Connect Burner Wallet"
    core={core}
    plugins={[exchange, new WalletConnectPlugin()]}
  />


ReactDOM.render(<BurnerWallet />, document.getElementById('root'));
