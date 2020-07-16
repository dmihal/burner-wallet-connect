import React from 'react';
import { fromWei } from 'web3-utils';
import { useBurner } from '@burner-wallet/ui-core';

const PersonalSign: React.FC<any> = ({ params }) => (
  <div>
    <div>Signer: {params[1]}</div>
    <div>Data: {params[0]}</div>
  </div>
);

const Transaction: React.FC<any> = ({ params }) => {
  const { from, to, value, data, gasPrice } = params[0];
  return (
    <div>
      <div>From: {from}</div>
      <div>To: {to}</div>
      <div>Value: {fromWei(value, 'ether')} ETH</div>
      <div>Gas Price: {fromWei(gasPrice, 'gwei')} Gwei</div>
      <div>Data: {data} Gwei</div>
    </div>
  );
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const AutoApprove: React.FC<any> = ({ params }) => {
  const { assets } = useBurner();
  const { from, asset, chainId } = params[0];

  const [token] = assets.filter((_asset: any) => 
    _asset.network === chainId && (_asset.address === asset || asset === ZERO_ADDRESS));

  return (
    <div>
      <div>Auto-approve transactions</div>
      <div>Allow the connected applications to send multiple transactions without approval?</div>
      <div>From: {from}</div>
      <div>Token: {token ? token.name : `${asset} (${chainId})`}</div>
    </div>
  );
};

const requestTypes: { string: React.ComponentType } = {
  personal_sign: PersonalSign,
  eth_sendTransaction: Transaction,
  wc_setAutoApprove: AutoApprove,
};

export default requestTypes;
