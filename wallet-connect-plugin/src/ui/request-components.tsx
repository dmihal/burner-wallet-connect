import React from 'react';
import { fromWei } from 'web3-utils';

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

const requestTypes: { string: React.ComponentType } = {
  personal_sign: PersonalSign,
  eth_sendTransaction: Transaction,
};

export default requestTypes;
