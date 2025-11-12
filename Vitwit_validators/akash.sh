#!/bin/bash

DELEGATOR="akash1qwlcuf2c2dhtgy8z5y7xxqev96km0n5mynpeqq"
VALIDATOR="akashvaloper1qwlcuf2c2dhtgy8z5y7xxqev96km0n5mw30ls2"
ENDPOINTS="https://rest-akash.ecostake.com,https://akash-api.polkachu.com,https://api-akash-01.stakeflow.io,https://akash-rest.publicnode.com,https://akash-api.validatornode.com,https://akash.api.arcturian.tech,https://akash-api.w3coins.io"
DENOM="uakt"
AMOUNT_VALUE="AKT "
PGUSER="postgres"
PGDATABASE="validator_dashboard"
PGHOST="localhost"

fetch_akash_price() {
    local price_data
    price_data=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=akash-network&vs_currencies=usd")
    echo "$price_data" | jq -r '.["akash-network"].usd'
}

# Fetch Akash token price
TOKEN_PRICE=$(fetch_akash_price)
echo "Current Akash price: \$$TOKEN_PRICE"

IFS=',' read -r -a EP_ARR <<< "$ENDPOINTS"
BASE_URL=""

for EP in "${EP_ARR[@]}"; do
    # Fetch JSON from validator endpoint
    JSON=$(curl -s --max-time 3 "$EP/cosmos/staking/v1beta1/validators/$VALIDATOR")
    
    # Check if JSON is valid
    if echo "$JSON" | jq empty >/dev/null 2>&1; then
        # Check if 'validator.tokens' exists and is non-empty
        TOKENS=$(echo "$JSON" | jq -r '.validator.tokens // empty')
        if [ -n "$TOKENS" ]; then
            BASE_URL="$EP"
            break
        fi
    fi
done

if [ -z "$BASE_URL" ]; then
    echo "No endpoints reachable with valid data!"
    exit 1
fi

echo "Using endpoint: $BASE_URL"

# Fetch overall delegations
OVERALL_RAW=$(curl -s "$BASE_URL/cosmos/staking/v1beta1/validators/$VALIDATOR")
OVERALL_DELEGATIONS=$(echo "$OVERALL_RAW" | jq -r '.validator.tokens | tonumber / 1000000')

# Fetch self delegations
SELF_RAW=$(curl -s "$BASE_URL/cosmos/staking/v1beta1/delegations/$DELEGATOR")
SELF_DELEGATIONS=$(echo "$SELF_RAW" | jq -r \
  --arg VAL "$VALIDATOR" \
  '.delegation_responses[] | select(.delegation.validator_address==$VAL) | .balance.amount | tonumber / 1000000')

# Calculate external delegations
EXTERNAL_DELEGATIONS=$(awk "BEGIN {print $OVERALL_DELEGATIONS - $SELF_DELEGATIONS}")

OUTSTANDING_RAW=$(curl -s "$BASE_URL/cosmos/distribution/v1beta1/validators/$VALIDATOR/outstanding_rewards") 
OUTSTANDING_TOTAL=$(echo "$OUTSTANDING_RAW" | jq -r --arg DEN "$DENOM" ' [.rewards.rewards[] | select(.denom==$DEN) | .amount | tonumber / 1000000] | add')
OUTSTANDING_TOTAL=${OUTSTANDING_TOTAL:-0}

DELEGATOR_REWARDS_RAW=$(curl -s "$BASE_URL/cosmos/distribution/v1beta1/delegators/$DELEGATOR/rewards")
DELEGATOR_REWARDS=$(echo "$DELEGATOR_REWARDS_RAW" | jq -r ".total[0].amount | tonumber / 1000000")
DELEGATOR_REWARDS=${DELEGATOR_REWARDS:-0}

VALIDATOR_COMMISSION_RAW=$(curl -s "$BASE_URL/cosmos/distribution/v1beta1/validators/$VALIDATOR/commission")
VALIDATOR_COMMISSION=$(echo "$VALIDATOR_COMMISSION_RAW" | jq -r ".commission.commission[0].amount | tonumber / 1000000")
VALIDATOR_COMMISSION=${VALIDATOR_COMMISSION:-0}

TOTAL_REWARDS=$(awk "BEGIN {print $DELEGATOR_REWARDS + $VALIDATOR_COMMISSION}")





# Insert new row into Postgres
PGPASSWORD="postgres" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -c "
INSERT INTO akash_data (validator_addr, self_delegations, external_delegations, rewards, total_rewards, price)
VALUES (
  '$VALIDATOR',
  '$SELF_DELEGATIONS $AMOUNT_VALUE',
  '$EXTERNAL_DELEGATIONS $AMOUNT_VALUE',
  '$OUTSTANDING_TOTAL $AMOUNT_VALUE',
  '$TOTAL_REWARDS $AMOUNT_VALUE',
  '$TOKEN_PRICE'
);
"





