import { CSL } from '.';
import { Asset, Cardano } from '..';
import { Transaction } from '@emurgo/cardano-serialization-lib-nodejs';

export const tx = (_input: Transaction): Cardano.TxAlonzo => {
  throw new Error('Not implemented');
};

export const value = (cslValue: CSL.Value): Cardano.Value => {
  const result: Cardano.Value = {
    coins: BigInt(cslValue.coin().to_str())
  };
  const multiasset = cslValue.multiasset();
  if (!multiasset) {
    return result;
  }
  result.assets = {};
  const scriptHashes = multiasset.keys();
  for (let scriptHashIdx = 0; scriptHashIdx < scriptHashes.len(); scriptHashIdx++) {
    const scriptHash = scriptHashes.get(scriptHashIdx);
    const assets = multiasset.get(scriptHash)!;
    const assetKeys = assets.keys();
    for (let assetIdx = 0; assetIdx < assetKeys.len(); assetIdx++) {
      const assetName = assetKeys.get(assetIdx);
      const assetAmount = BigInt(assets.get(assetName)!.to_str());
      if (assetAmount > 0n) {
        result.assets[Asset.util.createAssetId(scriptHash, assetName)] = assetAmount;
      }
    }
  }
  return result;
};

export const txIn = (input: CSL.TransactionInput, address: Cardano.Address): Cardano.TxIn => ({
  txId: Buffer.from(input.transaction_id().to_bytes()).toString('hex'),
  index: input.index(),
  address
});