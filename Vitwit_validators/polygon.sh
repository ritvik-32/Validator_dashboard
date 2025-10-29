#!/bin/bash

API_URL="https://staking-api.polygon.technology/api/v2/validators/50"
DENOM="POL"
AMOUNT_VALUE="POL"
PGUSER="postgres"
PGDATABASE="validator_dashboard"
PGHOST="localhost"
COMMISSION_RATE="0.05"

JSON=$(curl -s --max-time 5 "$API_URL")

if ! echo "$JSON" | jq empty >/dev/null 2>&1; then
    echo "Invalid API response!"
    exit 1
fi

SELF_STAKE=$(echo "$JSON" | jq -r '(.result.selfStake // 0 | tonumber) / 1e18')
EXTERNAL_STAKE=$(echo "$JSON" | jq -r '(.result.delegatedStake // 0 | tonumber) / 1e18')

CLAIMED=$(echo "$JSON" | jq -r '(.result.claimedReward // 0 | tonumber)')
VAL_UNCLAIMED=$(echo "$JSON" | jq -r '(.result.validatorUnclaimedRewards // 0 | tonumber)')
DEL_CLAIMED=$(echo "$JSON" | jq -r '(.result.delegatorClaimedRewards // 0 | tonumber)')
DEL_UNCLAIMED=$(echo "$JSON" | jq -r '(.result.delegatorUnclaimedRewards // 0 | tonumber)')

COMMISSION=$(awk "BEGIN {print $COMMISSION_RATE * ($DEL_CLAIMED + $DEL_UNCLAIMED)}")

TOTAL_REWARDS_WEI=$(awk "BEGIN {print $CLAIMED + $VAL_UNCLAIMED + $COMMISSION}")

TOTAL_REWARDS=$(awk "BEGIN {print $TOTAL_REWARDS_WEI / 1e18}")


PGPASSWORD="postgres" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -c "
INSERT INTO polygon_data (validator_addr, self_delegations, external_delegations, rewards)
VALUES (
  '0xae09a7bcbcff2fd81f98f90eda73bd80b6883741',
  '$SELF_STAKE $AMOUNT_VALUE',
  '$EXTERNAL_STAKE $AMOUNT_VALUE',
  '$TOTAL_REWARDS $AMOUNT_VALUE'
);
"

