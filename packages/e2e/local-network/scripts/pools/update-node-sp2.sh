#!/usr/bin/env bash

# This script updates SP2: This pool has a positive pledge (>0), meets the pledge and doesnt have metadata.
set -euo pipefail

here="$(cd "$(dirname "$0")" >/dev/null 2>&1 && pwd)"
root="$(cd "$here/../.." && pwd)"
cd "$root"
export PATH=$PWD/bin:$PATH

# pool parameters
SP_NODE_ID=2
POOL_PLEDGE=500000000
POOL_OWNER_STAKE=600000000 # Must be greater than pledge
POOL_COST=390000000
POOL_MARGIN=0.15
METADATA_URL="" # Leave it empty and the metadata field will be ignore in the TX

source ./scripts/pools/update-node-utils.sh

trap clean EXIT

updatePool ${SP_NODE_ID} ${POOL_PLEDGE} ${POOL_OWNER_STAKE} ${POOL_COST} ${POOL_MARGIN} "${METADATA_URL}"
