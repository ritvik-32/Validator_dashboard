#!/bin/bash

DELEGATOR="tnam1qxtfny8cngyyf0ms2fl6rcu65lt0da0ns5a3gxrq"
VALIDATOR="tnam1qxtfny8cngyyf0ms2fl6rcu65lt0da0ns5a3gxrq"
STAKING_ADDR="tnam1qpg63k22856yq3wzum2ksdktardgm2nm4cdxd2gf"
ENDPOINTS="https://namada-indexer.nodes.guru,https://namada-indexer.denodes.xyz,https://namada-mainnet-indexer.crouton.digital,https://namada-indexer.stakeandrelax.net,https://namada-indexer.wavefive.xyz,https://indexer.namada.validatus.com,https://indexer.papadritta.com"
AMOUNT_VALUE="NAM"
PGUSER="postgres"
PGDATABASE="validator_dashboard"
PGHOST="localhost"
fetch_namada_price() {
    local price_data
    price_data=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=namada&vs_currencies=usd")
    echo "$price_data" | jq -r '.namada.usd'
}

# Fetch Namada token price
TOKEN_PRICE=$(fetch_namada_price)
echo "Current Namada price: \$$TOKEN_PRICE"

IFS=',' read -r -a EP_ARR <<< "$ENDPOINTS"
BASE_URL=""

for EP in "${EP_ARR[@]}"; do
    JSON=$(curl -s --max-time 3 "$EP/api/v1/pos/reward/$VALIDATOR")

    if echo "$JSON" | jq empty >/dev/null 2>&1; then
        REWARD_TEST=$(echo "$JSON" | jq -r '.[0].minDenomAmount // empty')
        if [ -n "$REWARD_TEST" ]; then
            BASE_URL="$EP"
            break
        fi
    fi
done

if [ -z "$BASE_URL" ]; then
    echo "❌ No working Namada indexer endpoints!"
    exit 1
fi

echo "✅ Using indexer: $BASE_URL"

# Fetch self stake + total stake
SELF_RAW=$(curl -s "$BASE_URL/api/v1/pos/bond/$STAKING_ADDR")

SELF_STAKE_TEMP=$(echo "$SELF_RAW" | jq -r '.results[0].minDenomAmount | tonumber')
TOTAL_STAKE=$(echo "$SELF_RAW" | jq -r '.results[0].validator.votingPower | tonumber')

SELF_STAKE=$(awk "BEGIN {print $SELF_STAKE_TEMP / 1000000}")

# External Stake
EXTERNAL_STAKE=$(awk "BEGIN {print $TOTAL_STAKE - $SELF_STAKE}")

# Rewards
REWARD_RAW=$(curl -s "$BASE_URL/api/v1/pos/reward/$VALIDATOR")

REWARDS=$(echo "$REWARD_RAW" | jq -r '.[0].minDenomAmount | tonumber')
REWARDS_DIV=$(awk "BEGIN {print $REWARDS / 1000000}")

PGPASSWORD="postgres" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -c "
INSERT INTO namada_data (validator_addr, self_delegations, external_delegations, rewards, total_rewards, price)
VALUES (
  '$VALIDATOR',
  '$SELF_STAKE $AMOUNT_VALUE',
  '$EXTERNAL_STAKE $AMOUNT_VALUE',
  '$REWARDS_DIV $AMOUNT_VALUE',
  '0 $AMOUNT_VALUE',
  $TOKEN_PRICE
);
"

