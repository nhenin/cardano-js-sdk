/* eslint-disable sort-keys-fix/sort-keys-fix */
/* eslint-disable no-use-before-define */
import { AxiosInstance } from 'axios';
import { ADT } from 'ts-adt';

// API responses brings us back URLs so we are encouraged to not construct them manually.
// We use a opaque string to represent URLs for that.
//
// Opaque types idiom (like a hidden `newtype` constructor in Haskell)
declare const ContractsEndpoint: unique symbol;

type ContractsEndpoint = string & { _opaque: typeof ContractsEndpoint };

declare const ContractEndpoint: unique symbol;

// It seems like overengeeniring to have a root endpoint defined like this
// but we gonna extend the API and it gonna be served as a part of root response.
export const contractsEndpoint = '/contracts' as ContractsEndpoint;

type ContractEndpoint = string & { _opaque: typeof ContractEndpoint };

// We are cheating in here a bit by hardcoding URLs ;-)
export const contractEndpoint = (contractId: string) => `/contracts/${contractId}` as ContractEndpoint;

declare const TransactionsEndpoint: unique symbol;

type TransactionsEndpoint = string & { _opaque: typeof TransactionsEndpoint };

export const transactionsEndpoint = (contractId: string) =>
  `/contracts/${contractId}/transactions` as TransactionsEndpoint;

declare const TransactionEndpoint: unique symbol;

type TransactionEndpoint = string & { _opaque: typeof TransactionEndpoint };

export const transactionEndpoint = (contractId: string, transactionId: string) =>
  `/contracts/${contractId}/transactions/${transactionId}` as TransactionEndpoint;

type Bech32 = string;

type Version = 'v1';

type Metadata = Record<number, string>;

// Just a stub for Marlowe Contract and State
type Contract = 'close';
type State = any;
type Input = 'input_notify';

// Currently the runtime API doesn't provide any additional information
// beside the error status code like 400, 404, 500 etc.
export interface ErrorResponse {
  statusErrorCode: number;
  message: string;
}

export type Result<Error, Data> = ADT<{
  success: { data: Data };
  failure: { details: Error };
}>;

export const success: <Error, Data>(d: Data) => Result<Error, Data> = (d) => ({ _type: 'success', data: d });
export const failure: <Error, Data>(e: Error) => Result<Error, Data> = (e) => ({ _type: 'failure', details: e });

type TxOutRef = string;
type PolicyId = string;
type TxStatus = 'unsigned' | 'submitted' | 'confirmed';

interface BlockHeader {
  slotNo: number; // These should be BigInts
  blockNo: number;
  blockHeaderHash: string;
}

interface ContractHeader {
  contractId: TxOutRef;
  roleTokenMintingPolicyId: PolicyId;
  version: Version;
  metadata?: Record<number, Object>; // FIXME
  status: TxStatus;
  blockHeader?: BlockHeader;
}

export interface ContractHeaderItem {
  results: ContractHeader;
  links: { contract: ContractEndpoint };
}

declare const ContractsRange: unique symbol;

type ContractsRange = string & { _opaque: typeof ContractsRange };

interface IndexResponse<Response, Range> {
  nextRange?: Range;
  prevRange?: Range;
  items: Response[];
}

export type GetContractsResponse = IndexResponse<ContractHeaderItem, ContractsRange>;

export interface PostContractsRequest {
  contract: Contract;
  roles?: any; // RolesConfig
  version?: Version;
  metadata?: Metadata;
  minUTxODeposit: number;
  changeAddress: Bech32;
  addresses?: Bech32[]; // When skipped we use `[changeAddress]`
  collateralUTxOs?: Bech32[];
}

export interface PostContractsResponse {
  contractId: TxOutRef;
  endpoint: ContractEndpoint;
  // This contains a CBOR of the `TxBody`. The REST API gonna be extended so
  // we can also fetch a whole Transaction (CIP-30 `signTx` expects actually a whole `Tx`).
  txBody: TextEnvelope;
}

interface TextEnvelope {
  type: string;
  description?: string;
  cborHex: string;
}

interface ContractState extends ContractHeader {
  initialContract: Contract;
  currentContract?: Contract;
  state?: State;
  utxo?: TxOutRef;
  txBody?: TextEnvelope;
}

type ISO8601 = string;

export interface PostTransactionsRequest {
  inpts: Input[];
  invalidBefore: ISO8601;
  invalidHereafter: ISO8601;
  metadata?: Metadata;
  changeAddress: Bech32;
  addresses?: Bech32[]; // When skipped we use `[changeAddress]`
  collateralUTxOs?: Bech32[];
}

type TxId = string;

export interface TxHeader {
  contractId: TxOutRef;
  transactionId: TxId;
  status: TxStatus;
  block?: BlockHeader;
  utxo?: TxOutRef;
}

interface TxHeaderItem {
  results: TxHeader;
  links: { contract: TransactionEndpoint };
}

export interface GetTransactionsRequestOptions {
  range?: string;
}

declare const TransactionsRange: unique symbol;

type TransactionsRange = string & { _opaque: typeof TransactionsRange };

export type GetTransactionsResponse = IndexResponse<TxHeaderItem, TransactionsRange>;

export interface RestClientAPI {
  contracts: {
    get: (route: ContractsEndpoint, range?: ContractsRange) => Promise<Result<ErrorResponse, GetContractsResponse>>;
    post: (route: ContractsEndpoint, input: PostContractsRequest) => Promise<PostContractsResponse | ErrorResponse>;
  };
  contract: {
    get: (route: ContractEndpoint) => Promise<Result<ErrorResponse, ContractState>>;
    put: (route: ContractEndpoint, input: TextEnvelope) => Promise<TransactionsEndpoint | ErrorResponse>;
  };
  transactions: {
    get: (route: TransactionsEndpoint) => Promise<GetTransactionsResponse | ErrorResponse>;
  };
}

export const RestClient = function (request: AxiosInstance): RestClientAPI {
  return {
    contract: {
      get: async (route: ContractEndpoint): Promise<Result<ErrorResponse, ContractState>> =>
        request
          .get(route as string)
          .then((response) => success<ErrorResponse, ContractState>(response.data.resource))
          .catch((error) => failure({ statusErrorCode: error.status, message: error.message })),
      put: async (route: ContractEndpoint, input: TextEnvelope): Promise<TransactionsEndpoint | ErrorResponse> =>
        request
          .post(route as string, input)
          .then((response) => response.data.links.transactions)
          .catch((error) => error.status)
    },
    contracts: {
      get: async (
        route: ContractsEndpoint,
        range?: ContractsRange
      ): Promise<Result<ErrorResponse, GetContractsResponse>> => {
        const config = range ? { headers: { Range: range as string } } : {};

        return request
          .get(route as string, config)
          .then((response) =>
            success<ErrorResponse, GetContractsResponse>({
              items: response.data.results,
              nextRange: response.headers['next-range'] as ContractsRange,
              prevRange: response.headers['prev-range'] as ContractsRange
            })
          )
          .catch((error) => failure({ statusErrorCode: error.status, message: error.message }));
      },
      post: async (
        route: ContractsEndpoint,
        input: PostContractsRequest
      ): Promise<PostContractsResponse | ErrorResponse> => {
        const data = {
          contract: input.contract,
          metadata: input.metadata ?? {},
          minUTxODeposit: input.minUTxODeposit,
          roles: input.roles ?? null,
          version: input.version ?? 'v1'
        };
        const config = {
          headers: {
            'X-Address': (input.addresses ?? [input.changeAddress]).join(','),
            'X-Change-Address': input.changeAddress,
            ...(input.collateralUTxOs && { 'X-Collateral-UTxOs': input.collateralUTxOs })
          }
        };
        return request
          .post(route as string, data, config)
          .then((response) => ({
            contractId: response.data.resource.contractId,
            endpoint: response.data.links.contract,
            txBody: response.data.resource.txBody
          }))
          .catch((error) => error.status);
      }
    },
    transactions: {
      get: async (
        route: TransactionsEndpoint,
        range?: TransactionsRange
      ): Promise<GetTransactionsResponse | ErrorResponse> => {
        const config = range ? { headers: { Range: range as string } } : {};

        return request
          .get(route as string, config)
          .then((response) => ({
            items: response.data.results,
            nextRange: response.headers['next-range'],
            prevRange: response.headers['prev-range']
          }))
          .catch((error) => error.status);
      }
    }
  };
};
