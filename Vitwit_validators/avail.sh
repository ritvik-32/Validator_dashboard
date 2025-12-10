#!/bin/bash

VALIDATOR="5ECe3ANZA9HaxYexsV8yRGZXhzrTs68ScoYcYHwfLTQmzyki"
API_KEY="f423030fa36b497b985257741f05ded9"
DENOM_DIV=1000000000000000000
AMOUNT_VALUE="AVAIL"
PGUSER="postgres"
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
PGPASSWORD="postgres" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -c "
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