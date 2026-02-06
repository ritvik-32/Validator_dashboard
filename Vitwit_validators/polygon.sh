#!/bin/bash

API_URL="https://staking-api.polygon.technology/api/v2/validators/50"
DENOM="POL"
AMOUNT_VALUE="POL"
PGUSER="vitwit"
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

# Check if price is null or empty, try fallback endpoints
if [ "$TOKEN_PRICE" == "null" ] || [ -z "$TOKEN_PRICE" ]; then
    echo "Warning: CoinGecko API failed, trying fallback..."
    # Try alternative source or use cached price from database
    TOKEN_PRICE=$(psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -t -c "SELECT price FROM polygon_data ORDER BY timestamp DESC LIMIT 1;" 2>/dev/null | awk '{print $1}' | head -1)
    if [ -z "$TOKEN_PRICE" ] || [ "$TOKEN_PRICE" == "null" ]; then
        TOKEN_PRICE="0"
        echo "Could not fetch price, using default: \$$TOKEN_PRICE"
    else
        echo "Using cached price: \$$TOKEN_PRICE"
    fi
fi

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

# Fetch previous total rewards for delta calculation
PREVIOUS_TOTAL_REWARDS=$(psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -t -c \
  "SELECT CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC) 
   FROM polygon_data 
   ORDER BY timestamp DESC 
   LIMIT 1;" 2>/dev/null | awk '{print $1}' | head -1)

PREVIOUS_TOTAL_REWARDS=${PREVIOUS_TOTAL_REWARDS:-0}
echo "Previous total rewards: $PREVIOUS_TOTAL_REWARDS"

# Calculate delta
REWARDS_DELTA=$(awk "BEGIN {print $TOTAL_REWARDS - $PREVIOUS_TOTAL_REWARDS}")
echo "Rewards delta: $REWARDS_DELTA"

######
psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -c "
INSERT INTO polygon_data (validator_addr, self_delegations, external_delegations, rewards, total_rewards, price, rewards_delta)
VALUES (
  '0xae09a7bcbcff2fd81f98f90eda73bd80b6883741',
  '$SELF_STAKE $AMOUNT_VALUE',
  '$EXTERNAL_STAKE $AMOUNT_VALUE',
  '$VAL_UNCLAIMED_TOTAL $AMOUNT_VALUE',
  '$TOTAL_REWARDS $AMOUNT_VALUE',
  $TOKEN_PRICE,
  '$REWARDS_DELTA'
);
"

