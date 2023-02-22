/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sort-keys-fix/sort-keys-fix */
/* eslint-disable promise/no-nesting */
/* eslint-disable promise/catch-or-return */
/* eslint-disable promise/always-return */
/* eslint-disable no-console */
/* eslint-disable no-use-before-define */
import * as A from 'fp-ts/Array';
import * as ACL from '../src/internal/anticorruptionlayer';
import { ContractHeader } from '../src/model/contract/header';
import { ErrorResponse, GetContractsResponse, contractsEndpoint } from '../src/internal/restAPI';
import { FetchResult } from '../src/model/common';
import { Internal } from '../src';
import { matchI } from 'ts-adt';
import { pipe } from 'fp-ts/function';
import axios from 'axios';

describe('@marlowe-runtime-client', () => {
  const baseUrl = 'http://0.0.0.0:32777';
  describe('Contract Headers', () => {
    it('can all be fetched', async () => {
      const marloweRuntime = MarloweRuntimeClient(baseUrl);
      const contracts = await marloweRuntime.contract.header.allInProgress();
      console.log(`# All Contracts : ${contracts.length}`);
      expect(contracts.length).toBeGreaterThan(0);
    });
  });
});

export interface MarloweRuntimeAPI {
  contract: {
    header: {
      filterBy: (predicate: (header: ContractHeader) => boolean) => Promise<ContractHeader[]>;
      allInProgress: () => Promise<ContractHeader[]>;
    };
  };
}

const MarloweRuntimeClient = function (baseURL: string): MarloweRuntimeAPI {
  const restClient = Internal.RestClient(
    axios.create({
      baseURL,
      headers: { Accept: 'application/json', ContentType: 'application/json' }
    })
  );

  const filterByContractHeader = async (predicate: (header: ContractHeader) => boolean) => {
    const headers: ContractHeader[] = [];
    const step = async function (result: FetchResult<ErrorResponse, GetContractsResponse>) {
      await matchI(result)({
        success: async ({ data }) => {
          console.log('data:', data.itemsWithinCurrentRange[0]);
          headers.push(...pipe(data.itemsWithinCurrentRange, A.map(ACL.convert), A.filter(predicate)));
          if (data.nextRange) {
            await step(await restClient.contracts.get(contractsEndpoint, data.nextRange));
          }
        },
        failure: async ({ details }) => console.log('Error:', details)
      });
    };
    const response = await restClient.contracts.get(contractsEndpoint);
    await step(response);
    return headers;
  };

  return {
    contract: {
      header: {
        filterBy: async (predicate: (header: ContractHeader) => boolean) => filterByContractHeader(predicate),
        allInProgress: async () => filterByContractHeader(() => true)
      }
    }
  };
};
