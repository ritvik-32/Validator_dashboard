#!/bin/bash

API_URL="https://staking-api.polygon.technology/api/v2/validators/50"
DENOM="POL"
AMOUNT_VALUE="POL"
PGUSER="postgres"
PGDATABASE="validator_dashboard"
PGHOST="localhost"
COMMISSION_RATE="0.05"

fetch_matic_price() {
    local price_data
    price_data=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token&vs_currencies=usd")
    echo "$price_data" | jq -r '.["polygon-ecosystem-token"].usd'
}

# Fetch MATIC token price
TOKEN_PRICE=$(fetch_matic_price)
echo "Current MATIC price: \$$TOKEN_PRICE"

JSON=$(curl -s --max-time 5 "$API_URL")

if ! echo "$JSON" | jq empty >/dev/null 2>&1; then
    echo "Invalid API response!"
    exit 1
fi

SELF_STAKE=$(echo "$JSON" | jq -r '(.result.selfStake // 0 | tonumber) / 1e18')
EXTERNAL_STAKE=$(echo "$JSON" | jq -r '(.result.delegatedStake // 0 | tonumber) / 1e18')

VAL_UNCLAIMED=$(echo "$JSON" | jq -r '(.result.validatorUnclaimedRewards // 0 | tonumber)')
VAL_UNCLAIMED_WEI=$(awk "BEGIN {print $VAL_UNCLAIMED}")

VAL_UNCLAIMED_TOTAL=$(awk "BEGIN {print $VAL_UNCLAIMED_WEI / 1e18}")
#####

# Calculate total rewards: claimed + unclaimed + (commission * (delegator_claimed + delegator_unclaimed))
DELEGATOR_CLAIMED=$(echo "$JSON" | jq -r '(.result.delegatorClaimedRewards // 0 | tonumber)')
DELEGATOR_UNCLAIMED_WEI=$(echo "$JSON" | jq -r '(.result.delegatorUnclaimedRewards // "0" | tonumber)')
VALIDATOR_UNCLAIMED_WEI=$(echo "$JSON" | jq -r '(.result.validatorUnclaimedRewards // "0" | tonumber)')
COMMISSION_RATE=$(echo "$JSON" | jq -r '(.result.commissionPercent // 0 | tonumber) / 100')
CLAIMED_REWARDS=$(echo "$JSON" | jq -r '(.result.claimedReward // 0 | tonumber)')

# Calculate commission amount: commission_rate * (delegator_claimed + delegator_unclaimed)
COMMISSION_AMOUNT=$(awk "BEGIN {print $COMMISSION_RATE * ($DELEGATOR_CLAIMED + $DELEGATOR_UNCLAIMED_WEI)}")

# Calculate total rewards in wei
TOTAL_REWARDS_WEI=$(awk "BEGIN {print $CLAIMED_REWARDS + $VALIDATOR_UNCLAIMED_WEI + $COMMISSION_AMOUNT}")

# Convert to POL (1e18 wei = 1 POL)
TOTAL_REWARDS=$(awk "BEGIN {print $TOTAL_REWARDS_WEI / 1e18}")

echo "Claimed Rewards: $(awk "BEGIN {print $CLAIMED_REWARDS / 1e18}") $AMOUNT_VALUE"
echo "Unclaimed Validator Rewards: $(awk "BEGIN {print $VALIDATOR_UNCLAIMED_WEI / 1e18}") $AMOUNT_VALUE"
echo "Commission: $(awk "BEGIN {print $COMMISSION_AMOUNT / 1e18}") $AMOUNT_VALUE"
echo "Total Rewards: $TOTAL_REWARDS $AMOUNT_VALUE"


######
PGPASSWORD="postgres" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -c "
INSERT INTO polygon_data (validator_addr, self_delegations, external_delegations, rewards, total_rewards, price)
VALUES (
  '0xae09a7bcbcff2fd81f98f90eda73bd80b6883741',
  '$SELF_STAKE $AMOUNT_VALUE',
  '$EXTERNAL_STAKE $AMOUNT_VALUE',
  '$VAL_UNCLAIMED_TOTAL $AMOUNT_VALUE',
  '$TOTAL_REWARDS $AMOUNT_VALUE',
  $TOKEN_PRICE
);
"

