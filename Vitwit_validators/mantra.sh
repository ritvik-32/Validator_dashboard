#!/bin/bash

DELEGATOR="mantra1caw6djrt9gz2m4qpgulypdfm8yrrx59fc5vc6n"
VALIDATOR="mantravaloper1caw6djrt9gz2m4qpgulypdfm8yrrx59fu0dkkk"
ENDPOINTS="https://api.mantrachain.io,https://api-mantra.r93axnodes.cloud:443,https://mantrachain-mainnet-lcd.autostake.com:443,https://mantra-rest.publicnode.com,https://mantra-mainnet-api.itrocket.net,https://mantra.api.m.stavr.tech"
DENOM="uom"
AMOUNT_VALUE="om"
PGUSER="vitwit"
PGDATABASE="validator_dashboard"
PGHOST="localhost"
fetch_mantra_price() {
    local price_data
    price_data=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=mantra-dao&vs_currencies=usd")
    echo "$price_data" | jq -r '.["mantra-dao"].usd'
}

# Fetch Mantra token price
TOKEN_PRICE=$(fetch_mantra_price)
echo "Current Mantra price: \$$TOKEN_PRICE"

# Check if price is null or empty, try fallback endpoints
if [ "$TOKEN_PRICE" == "null" ] || [ -z "$TOKEN_PRICE" ]; then
    echo "Warning: CoinGecko API failed, trying fallback..."
    # Try alternative source or use cached price from database
    TOKEN_PRICE=$(psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -t -c "SELECT price FROM mantra_data ORDER BY timestamp DESC LIMIT 1;" 2>/dev/null | awk '{print $1}' | head -1)
    if [ -z "$TOKEN_PRICE" ] || [ "$TOKEN_PRICE" == "null" ]; then
        TOKEN_PRICE="0"
        echo "Could not fetch price, using default: \$$TOKEN_PRICE"
    else
        echo "Using cached price: \$$TOKEN_PRICE"
    fi
fi

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

# Fetch rewards for the given denom
OUTSTANDING_RAW=$(curl -s "$BASE_URL/cosmos/distribution/v1beta1/validators/$VALIDATOR/outstanding_rewards") 
OUTSTANDING_TOTAL=$(echo "$OUTSTANDING_RAW" | jq -r --arg DEN "$DENOM" ' [.rewards.rewards[] | select(.denom==$DEN) | .amount | tonumber / 1000000] | add')
OUTSTANDING_TOTAL=${OUTSTANDING_TOTAL:-0}





DELEGATOR_REWARDS_RAW=$(curl -s "$BASE_URL/cosmos/distribution/v1beta1/delegators/$DELEGATOR/rewards/$VALIDATOR")

DELEGATOR_REWARDS=$(echo "$DELEGATOR_REWARDS_RAW" \
    | jq -r --arg DEN "$DENOM" '
        .rewards[]
        | select(.denom == $DEN)
        | .amount
        | tonumber / 1000000
    ')

DELEGATOR_REWARDS=${DELEGATOR_REWARDS:-0}


VALIDATOR_COMMISSION_RAW=$(curl -s "$BASE_URL/cosmos/distribution/v1beta1/validators/$VALIDATOR/commission")

VALIDATOR_COMMISSION=$(echo "$VALIDATOR_COMMISSION_RAW" \
    | jq -r --arg DEN "$DENOM" '
        .commission.commission[]
        | select(.denom == $DEN)
        | .amount
        | tonumber / 1000000
    ')
VALIDATOR_COMMISSION=${VALIDATOR_COMMISSION:-0}

TOTAL_REWARDS=$(awk "BEGIN {print $DELEGATOR_REWARDS + $VALIDATOR_COMMISSION}")

# Fetch previous total rewards for delta calculation
PREVIOUS_TOTAL_REWARDS=$(psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -t -c \
  "SELECT CAST(SPLIT_PART(total_rewards, ' ', 1) AS NUMERIC) 
   FROM mantra_data 
   ORDER BY timestamp DESC 
   LIMIT 1;" 2>/dev/null | awk '{print $1}' | head -1)

PREVIOUS_TOTAL_REWARDS=${PREVIOUS_TOTAL_REWARDS:-0}
echo "Previous total rewards: $PREVIOUS_TOTAL_REWARDS"

# Calculate delta
REWARDS_DELTA=$(awk "BEGIN {print $TOTAL_REWARDS - $PREVIOUS_TOTAL_REWARDS}")
echo "Rewards delta: $REWARDS_DELTA"

# Insert new row into Postgres
psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -c "
INSERT INTO mantra_data (validator_addr, self_delegations, external_delegations, rewards, total_rewards, price, rewards_delta)
VALUES (
  '$VALIDATOR',
  '$SELF_DELEGATIONS $AMOUNT_VALUE',
  '$EXTERNAL_DELEGATIONS $AMOUNT_VALUE',
  '$OUTSTANDING_TOTAL $AMOUNT_VALUE',
  '$TOTAL_REWARDS $AMOUNT_VALUE',
   $TOKEN_PRICE,
  '$REWARDS_DELTA'
);
"





