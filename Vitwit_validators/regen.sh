#!/bin/bash

DELEGATOR="regen1h5z08rzvrwt3pzdjc03upvuh2x0j3yskr2e95r"
VALIDATOR="regenvaloper1h5z08rzvrwt3pzdjc03upvuh2x0j3yskldyqvj"
ENDPOINTS="http://public-rpc.regen.vitwit.com:1317,https://regen.stakesystems.io,https://regen.api.m.stavr.tech,https://api-regen-ia.cosmosia.notional.ventures/,https://regen-mainnet-lcd.autostake.com:443,https://rest-regen.ecostake.com,https://regen-lcd.easy2stake.com,https://regen-api.w3coins.io"
DENOM="uregen"
AMOUNT_VALUE="regen"
PGUSER="postgres"
PGDATABASE="validator_dashboard"
PGHOST="localhost"

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

# Fetch rewards for the given denom
REWARDS_RAW=$(curl -s "$BASE_URL/cosmos/distribution/v1beta1/delegators/$DELEGATOR/rewards")
REWARDS_TOTAL=$(echo "$REWARDS_RAW" | jq -r --arg VAL "$VALIDATOR" --arg DEN "$DENOM" '
  [.rewards[] | select(.validator_address==$VAL) | .reward[] | select(.denom==$DEN) | .amount | tonumber / 1000000] | add')

# Fetch validator commission for the given denom
COMM_RAW=$(curl -s "$BASE_URL/cosmos/distribution/v1beta1/validators/$VALIDATOR/commission")
COMM_TOTAL=$(echo "$COMM_RAW" | jq -r --arg DEN "$DENOM" '
  [.commission.commission[] | select(.denom==$DEN) | .amount | tonumber / 1000000] | add')

# Calculate total earnings
TOTAL_EARNINGS=$(awk "BEGIN {print $REWARDS_TOTAL + $COMM_TOTAL}")

# Print results
echo "-----------------------------------"
echo "Validator: $VALIDATOR"
echo "Delegator: $DELEGATOR"
echo "Denom     : $DENOM"
echo "-----------------------------------"
echo "Self Delegations    : $SELF_DELEGATIONS $DENOM"
echo "External Delegations: $EXTERNAL_DELEGATIONS $DENOM"
echo "Total Delegations   : $OVERALL_DELEGATIONS $DENOM"
echo "Rewards             : $REWARDS_TOTAL $DENOM"
echo "Validator Commission: $COMM_TOTAL $DENOM"
echo "Total Earnings      : $TOTAL_EARNINGS $DENOM"
echo "-----------------------------------"



# Insert new row into Postgres
PGPASSWORD="postgres" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -c "
INSERT INTO regen_data (validator_addr, self_delegations, external_delegations, rewards)
VALUES (
  '$VALIDATOR',
  '$SELF_DELEGATIONS $AMOUNT_VALUE',
  '$EXTERNAL_DELEGATIONS $AMOUNT_VALUE',
  '$TOTAL_EARNINGS $AMOUNT_VALUE'
);
"
echo "Values inserted into Postgres table 'agoric'."





