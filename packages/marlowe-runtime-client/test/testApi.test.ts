/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sort-keys-fix/sort-keys-fix */
/* eslint-disable promise/no-nesting */
/* eslint-disable promise/catch-or-return */
/* eslint-disable promise/always-return */
/* eslint-disable no-console */
/* eslint-disable no-use-before-define */
import {
  ContractHeaderItem,
  ErrorResponse,
  GetContractsResponse,
  Result,
  contractsEndpoint
} from '../src/internal/restAPI';
import { Internal } from '../src';

import { matchI } from 'ts-adt';
import axios from 'axios';

test('do suffs', async () => {
  const client = MarloweRuntimeClient('http://0.0.0.0:32778');
  const contracts = await client.contracts.allInProgress(() => true);
  console.log(`# Contracts in progress : ${contracts.length}`);
  expect(true).toBe(true);
});

export interface MarloweRuntimeAPI {
  contracts: {
    allInProgress: (filter: (item: ContractHeaderItem) => boolean) => Promise<ContractHeaderItem[]>;
  };
}

const MarloweRuntimeClient = function (baseURL: string): MarloweRuntimeAPI {
  const restClient = Internal.RestClient(
    axios.create({
      baseURL,
      headers: { Accept: 'application/json', ContentType: 'application/json' }
    })
  );
  return {
    contracts: {
      allInProgress: async (filterItem: (item: ContractHeaderItem) => boolean): Promise<ContractHeaderItem[]> => {
        const items: ContractHeaderItem[] = [];
        const step = async function (result: Result<ErrorResponse, GetContractsResponse>) {
          await matchI(result)({
            success: async ({ data }) => {
              console.log(`# Fetch Contract : ${data.items}`);
              items.push(...data.items.filter(filterItem));
              if (data.nextRange) {
                await step(await restClient.contracts.get(contractsEndpoint, data.nextRange));
              }
            },
            failure: async ({ details }) => console.log('Error:', details)
          });
        };
        const response = await restClient.contracts.get(contractsEndpoint);
        await step(response);
        return items;
      }
    }
  };
};
