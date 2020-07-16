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
  const { assets } = useBurner();
  const { from, to, value, data, gasPrice, chainId } = params[0];
  const chain = chainId || params[1];

  const isNative = !data || data.length === 0 || data === '0x';
  const [token] = assets.filter((_asset: any) =>
    _asset.network === chain && (_asset.address === to || (isNative && _asset.type === 'native')));

  return (
    <div>
      <div>From: {from}</div>
      <div>To: {to}</div>
      {/* TODO: show token recipient */}
      <div>Value: {fromWei(value, 'ether')} {token!.name}</div>
      {/* TODO: show token value */}
      <div>Gas Price: {fromWei(gasPrice, 'gwei')} Gwei</div>
      <div>Data: {data}</div>
    </div>
  );
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const AutoApprove: React.FC<any> = ({ params }) => {
  const { assets } = useBurner();
  const { from, asset, chainId } = params[0];

  const [token] = assets.filter((_asset: any) =>
    _asset.network === chainId && (_asset.address || ZERO_ADDRESS) === asset);

  return (
    <div>
      <div>Auto-approve transactions</div>
      <div>Allow the connected applications to send multiple transactions without approval?</div>
      <div>From: {from}</div>
      <div>Token: {token ? token.name : `${asset} (${chainId})`}</div>
    </div>
  );
};

const requestTypes: { [request: string]: React.ComponentType<{ params: any }> } = {
  personal_sign: PersonalSign,
  eth_sendTransaction: Transaction,
  wc_setAutoApprove: AutoApprove,
};

export default requestTypes;
