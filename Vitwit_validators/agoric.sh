#!/bin/bash

DELEGATOR="agoric1ev9nl6pl5trgvrc7chntj937m42aznn2hqs3vx"
VALIDATOR="agoricvaloper1ev9nl6pl5trgvrc7chntj937m42aznn28crcs8"
ENDPOINTS="https://main.api.agoric.net:443,https://agoric-api.polkachu.com,https://agoric.api.kjnodes.com,https://agoric-mainnet-lcd.autostake.com:443,https://api-agoric-01.stakeflow.io,https://agoric-rest.0base.dev,https://agoric-api.w3coins.io,https://api-agoric-ia.cosmosia.notional.ventures"
DENOM="ubld"
AMOUNT_VALUE="BLD "
PGUSER="vitwit"
PGDATABASE="validator_dashboard"
PGHOST="localhost"

fetch_agoric_price() {
    local price_data
    price_data=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=agoric&vs_currencies=usd")
    echo "$price_data" | jq -r '.agoric.usd'
}

# Fetch Agoric token price
TOKEN_PRICE=$(fetch_agoric_price)
echo "Current Agoric price: \$$TOKEN_PRICE"

# Check if price is null or empty, try fallback endpoints
if [ "$TOKEN_PRICE" == "null" ] || [ -z "$TOKEN_PRICE" ]; then
    echo "Warning: CoinGecko API failed, trying fallback..."
    # Try alternative source or use cached price from database
    TOKEN_PRICE=$(psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -t -c "SELECT price FROM agoric_data ORDER BY timestamp DESC LIMIT 1;" 2>/dev/null | awk '{print $1}' | head -1)
    if [ -z "$TOKEN_PRICE" ] || [ "$TOKEN_PRICE" == "null" ]; then
        TOKEN_PRICE="0"
        echo "Could not fetch price, using default: \$$TOKEN_PRICE"
    else
        echo "Using cached price: \$$TOKEN_PRICE"
    fi
fi

# Select first reachable endpoint
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

# Calculate total rewards (delegator rewards + validator commission)
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

echo "Delegator rewards: $DELEGATOR_REWARDS $AMOUNT_VALUE"
echo "Validator commission: $VALIDATOR_COMMISSION $AMOUNT_VALUE"
echo "Total rewards: $TOTAL_REWARDS $AMOUNT_VALUE"

psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -c "
INSERT INTO agoric_data (validator_addr, self_delegations, external_delegations, rewards, total_rewards, price)
VALUES (
  '$VALIDATOR',
  '$SELF_DELEGATIONS $AMOUNT_VALUE',
  '$EXTERNAL_DELEGATIONS $AMOUNT_VALUE',
  '$OUTSTANDING_TOTAL $AMOUNT_VALUE',
  '$TOTAL_REWARDS $AMOUNT_VALUE',
  '$TOKEN_PRICE'
);
"





