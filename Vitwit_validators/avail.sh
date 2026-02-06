#!/bin/bash

VALIDATOR="5ECe3ANZA9HaxYexsV8yRGZXhzrTs68ScoYcYHwfLTQmzyki"
API_KEY="f423030fa36b497b985257741f05ded9"
DENOM_DIV=1000000000000000000
AMOUNT_VALUE="AVAIL"
PGUSER="vitwit"
PGDATABASE="validator_dashboard"
PGHOST="localhost"
START_DATE=$(date -u +"%Y-%m-%d")


fetch_avail_price() {
    local price_data
    price_data=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=avail&vs_currencies=usd")
    echo "$price_data" | jq -r '.avail.usd'
}

# Fetch Avail token price
TOKEN_PRICE=$(fetch_avail_price)
echo "Current Avail price: \$$TOKEN_PRICE"

# Check if price is null or empty, try fallback endpoints
if [ "$TOKEN_PRICE" == "null" ] || [ -z "$TOKEN_PRICE" ]; then
    echo "Warning: CoinGecko API failed, trying fallback..."
    # Try alternative source or use cached price from database
    TOKEN_PRICE=$(psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -t -c "SELECT price FROM avail_data ORDER BY timestamp DESC LIMIT 1;" 2>/dev/null | awk '{print $1}' | head -1)
    if [ -z "$TOKEN_PRICE" ] || [ "$TOKEN_PRICE" == "null" ]; then
        TOKEN_PRICE="0"
        echo "Could not fetch price, using default: \$$TOKEN_PRICE"
    else
        echo "Using cached price: \$$TOKEN_PRICE"
    fi
fi

# Endpoints
VAL_ENDPOINT="https://avail.api.subscan.io/api/scan/staking/validator"
REWARD_ENDPOINT="https://avail.api.subscan.io/api/scan/staking/total_reward"

### ✅ Fetch Staking Data (Self + External)
STAKE_RAW=$(curl -s -X POST "$VAL_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{\"stash\": \"$VALIDATOR\", \"page\": 0, \"row\": 10}")

SELF_STAKE=$(echo "$STAKE_RAW" | jq -r ".data.info.bonded_owner | tonumber / $DENOM_DIV")
EXTERNAL_STAKE=$(echo "$STAKE_RAW" | jq -r ".data.info.bonded_nominators | tonumber / $DENOM_DIV")


REWARD_RAW=$(curl -s -X POST "$REWARD_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"address\": \"$VALIDATOR\",
    \"start\": \"$START_DATE\",
    \"end\": \"$START_DATE\"
  }")
TOTAL_REWARDS=$(echo "$REWARD_RAW" | jq -r ".data.sum | tonumber / $DENOM_DIV")




###############################################################################
psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -c "
INSERT INTO avail_data (validator_addr, self_delegations, external_delegations, rewards, total_rewards, price)
VALUES (
  '$VALIDATOR',
  '$SELF_STAKE $AMOUNT_VALUE',
  '$EXTERNAL_STAKE $AMOUNT_VALUE',
  '0 $AMOUNT_VALUE',
  '$TOTAL_REWARDS $AMOUNT_VALUE',
  '$TOKEN_PRICE'
);
"