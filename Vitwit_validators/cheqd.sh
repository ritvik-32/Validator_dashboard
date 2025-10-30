#!/bin/bash

DELEGATOR="cheqd1svucqaevytxzkp9t2jvkmywj86at7268nyzt84"
VALIDATOR="cheqdvaloper1svucqaevytxzkp9t2jvkmywj86at7268vwudph"
ENDPOINTS="https://api.cheqd.net,https://rest.lavenderfive.com:443/cheqd,https://api-cheqd-ia.cosmosia.notional.ventures/,https://cheqd.api.m.stavr.tech,https://api.cheqd.nodestake.org,https://lcd-cheqd.whispernode.com:443,https://public.stakewolle.com/cosmos/cheqd/rest,https://cheqd-rest.publicnode.com"
DENOM="ncheq"
AMOUNT_VALUE="CHEQ "
PGUSER="postgres"
PGDATABASE="validator_dashboard"
PGHOST="localhost"

fetch_cheq_price() {
    local price_data
    price_data=$(curl -s "https://api.coingecko.com/api/v3/simple/price?ids=cheqd-network&vs_currencies=usd")
    echo "$price_data" | jq -r '.["cheqd-network"].usd'
}

# Fetch CHEQ token price
TOKEN_PRICE=$(fetch_cheq_price)
echo "Current CHEQ price: \$$TOKEN_PRICE"

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
OVERALL_DELEGATIONS=$(echo "$OVERALL_RAW" | jq -r '.validator.tokens | tonumber / 1000000000')

# Fetch self delegations
SELF_RAW=$(curl -s "$BASE_URL/cosmos/staking/v1beta1/delegations/$DELEGATOR")
SELF_DELEGATIONS=$(echo "$SELF_RAW" | jq -r \
  --arg VAL "$VALIDATOR" \
  '.delegation_responses[] | select(.delegation.validator_address==$VAL) | .balance.amount | tonumber / 1000000000')

# Calculate external delegations
EXTERNAL_DELEGATIONS=$(awk "BEGIN {print $OVERALL_DELEGATIONS - $SELF_DELEGATIONS}")

OUTSTANDING_RAW=$(curl -s "$BASE_URL/cosmos/distribution/v1beta1/validators/$VALIDATOR/outstanding_rewards") 
OUTSTANDING_TOTAL=$(echo "$OUTSTANDING_RAW" | jq -r --arg DEN "$DENOM" ' [.rewards.rewards[] | select(.denom==$DEN) | .amount | tonumber / 1000000] | add')
OUTSTANDING_TOTAL=${OUTSTANDING_TOTAL:-0}
# Insert new row into Postgres
PGPASSWORD="postgres" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -c "
INSERT INTO cheqd_data (validator_addr, self_delegations, external_delegations, rewards, price)
VALUES (
  '$VALIDATOR',
  '$SELF_DELEGATIONS $AMOUNT_VALUE',
  '$EXTERNAL_DELEGATIONS $AMOUNT_VALUE',
  '$OUTSTANDING_TOTAL $AMOUNT_VALUE',
  '$TOKEN_PRICE'
);
"





