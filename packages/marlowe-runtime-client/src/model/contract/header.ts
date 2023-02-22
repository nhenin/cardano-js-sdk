import { ContractEndpoint } from '../../internal/restAPI';
import { ContractId, Metadata, PolicyId } from '../common';

export interface ContractHeader {
  contractId: ContractId;
  roleTokenMintingPolicyId: PolicyId;
  metadata?: Record<number, Object>;
  link: { contract: ContractEndpoint };
}
