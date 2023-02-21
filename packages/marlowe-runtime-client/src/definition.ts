/* eslint-disable no-use-before-define */
import axios, { AxiosInstance } from 'axios';

type Range = bigint;
type TxOutRef = string;
type PolicyId = string;
type MarloweVersion = 'v1';
type TxStatus = 'unsigned' | 'submitted' | 'confirmed';

export type MetadatumMap = Map<Metadatum, Metadatum>;
export type Metadatum = bigint | MetadatumMap | string | Uint8Array | Metadatum[];
export type TxMetadata = Map<bigint, Metadatum>;

interface BlockHeader {
  slotNo: bigint; // These should be BigInts
  blockNo: bigint;
  blockHeaderHash: string;
}

interface ContractHeader {
  contractId: TxOutRef;
  roleTokenMintingPolicyId: PolicyId;
  version: MarloweVersion;
  metadata: TxMetadata;
  status: TxStatus;
  block?: BlockHeader;
}

export class RuntimeAPI {
  private instance: AxiosInstance;
  public constructor(baseURL: string) {
    this.instance = axios.create({ baseURL });
  }

  // public getContracts = (range : Option <Range> ) : =>
}
