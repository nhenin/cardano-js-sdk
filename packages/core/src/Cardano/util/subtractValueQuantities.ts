import { Asset } from '../..';
import { BigIntMath } from '@cardano-sdk/util';
import { Value } from '../types';

/**
 * Subtract all quantities
 */
export const subtractValueQuantities = (quantities: Value[]) => ({
  assets: Asset.util.subtractTokenMaps(quantities.map(({ assets }) => assets)),
  coins: BigIntMath.subtract(quantities.map(({ coins }) => coins))
});