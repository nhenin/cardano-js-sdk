import * as In from '../model/contract/header';
import * as Out from './restAPI';

export const convert = (out: Out.ContractHeaderLinked): In.ContractHeader => ({
  contractId: out.resource.contractId,
  link: out.links,
  metadata: out.resource.metadata,
  roleTokenMintingPolicyId: out.resource.roleTokenMintingPolicyId
});
