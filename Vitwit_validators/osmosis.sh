#!/bin/bash

DELEGATOR="osmo1ddle9tczl87gsvmeva3c48nenyng4n5678s7gh"
VALIDATOR="osmovaloper1ddle9tczl87gsvmeva3c48nenyng4n56yscals"
ENDPOINTS="https://lcd.osmosis.zone/,https://rest.osmosis.goldenratiostaking.net,https://osmosis-lcd.quickapi.com:443,https://lcd-osmosis.blockapsis.com,https://rest.lavenderfive.com:443/osmosis,https://rest-osmosis.ecostake.com,https://api-osmosis-ia.cosmosia.notional.ventures,https://api-osmosis.cosmos-spaces.cloud"
DENOM="uosmo"
AMOUNT_VALUE="osmo"
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

# Insert new row into Postgres
PGPASSWORD="postgres" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -c "
INSERT INTO osmosis_data (validator_addr, self_delegations, external_delegations, rewards)
VALUES (
  '$VALIDATOR',
  '$SELF_DELEGATIONS $AMOUNT_VALUE',
  '$EXTERNAL_DELEGATIONS $AMOUNT_VALUE',
  '$TOTAL_EARNINGS $AMOUNT_VALUE'
);
"





