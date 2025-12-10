#!/bin/bash

# Database configuration
PGUSER="postgres"
PGPASSWORD="postgres"
PGDATABASE="validator_dashboard"
PGHOST="localhost"

# CoinGecko API endpoint
COINGECKO_API="https://api.coingecko.com/api/v3"

# Function to get network info from database
get_network_info() {
    # Get all network tables that follow the pattern _data
    local query="SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%_data' 
                AND table_name != 'total_rewards'"
    
    # Get the list of networks
    local networks=$(PGPASSWORD="$PGPASSWORD" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -t -c "$query" | xargs -n1 | sed 's/_data//')
    
    # For each network, get the token symbol from its table
    for net in $networks; do
        # Get the token symbol (assuming it's in the rewards field)
        local symbol_query="SELECT split_part(rewards, ' ', 2) FROM ${net}_data WHERE rewards IS NOT NULL AND rewards != '' LIMIT 1"
        local symbol=$(PGPASSWORD="$PGPASSWORD" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -t -c "$symbol_query" 2>/dev/null | xargs)
        
        if [ -n "$symbol" ] && [ "$symbol" != "(0 rows)" ]; then
            # Add to TOKEN_IDS array
            TOKEN_IDS["$net"]="$symbol"
            # Use the network name as the display name (capitalized)
            TOKEN_DISPLAY_NAMES["$symbol"]="$(tr '[:lower:]' '[:upper:]' <<< ${net:0:1})${net:1}"
        fi
    done
}

# Initialize arrays
declare -A TOKEN_IDS
declare -A TOKEN_DISPLAY_NAMES

# Populate the arrays from database
get_network_info


# Create total_rewards table if it doesn't exist
PGPASSWORD="$PGPASSWORD" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" <<EOSQL
CREATE TABLE IF NOT EXISTS total_rewards (
    id SERIAL PRIMARY KEY,
    total_self_delegations_usd NUMERIC(20, 2) NOT NULL,
    total_external_delegations_usd NUMERIC(20, 2) NOT NULL,
    total_rewards_usd NUMERIC(20, 2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
EOSQL

# Function to get price from database for a network
get_network_price() {
    local network=$1
    local token_symbol=${TOKEN_IDS[$network]}
    
    if [ -z "$token_symbol" ]; then
        echo "0"
        return 1
    fi
    
    # Get the latest price from the network's data table
    local query="SELECT price FROM ${network}_data WHERE price IS NOT NULL AND price != 0 ORDER BY timestamp DESC LIMIT 1"
    local price=$(PGPASSWORD="$PGPASSWORD" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -t -c "$query" 2>/dev/null | xargs)
    
    if [ -z "$price" ] || [ "$price" = "(0 rows)" ]; then
        echo "0"
        return 1
    fi
    
    echo "$price"
    return 0
}

# Initialize token prices array
declare -A TOKEN_PRICES

echo "Fetching token prices from database..."

# Get prices for each network
for network in "${!TOKEN_IDS[@]}"; do
    token_symbol="${TOKEN_IDS[$network]}"
    price=$(get_network_price "$network")
    
    if [ "$?" -eq 0 ] && [ "$price" != "0" ]; then
        TOKEN_PRICES["$token_symbol"]="$price"
        echo "Price for $token_symbol: \$$price"
    else
        echo "Warning: Could not find price for $network ($token_symbol) in database" >&2
        TOKEN_PRICES["$token_symbol"]="0"
    fi
done

# Initialize totals
TOTAL_SELF_USD=0
TOTAL_EXTERNAL_USD=0
TOTAL_REWARDS_USD=0

# Get list of all network tables
TABLES=$(PGPASSWORD="$PGPASSWORD" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%_data' AND table_name != 'total_rewards'")

for TABLE in $TABLES; do
    # Extract network name from table name
    NETWORK=$(echo $TABLE | sed 's/_data//')
    echo -n "Processing $NETWORK... "
    
    # Get the latest entry for this network
    DATA=$(PGPASSWORD="$PGPASSWORD" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" -t -c "SELECT self_delegations, external_delegations, rewards, timestamp FROM $TABLE ORDER BY timestamp DESC LIMIT 1")
    
    if [ -n "$DATA" ]; then
        # Parse the data and handle empty values
        SELF_DELEGATION=$(echo "$DATA" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $1); print $1}')
        EXTERNAL_DELEGATION=$(echo "$DATA" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $2); print $2}')
        REWARD=$(echo "$DATA" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $3); print $3}')
        TIMESTAMP=$(echo "$DATA" | awk -F'|' '{gsub(/^[ \t]+|[ \t]+$/, "", $4); print $4}')
        
        # Set default values if empty
        SELF_DELEGATION=${SELF_DELEGATION:-"0"}
        EXTERNAL_DELEGATION=${EXTERNAL_DELEGATION:-"0"}
        REWARD=${REWARD:-"0"}
        
        # Extract numeric values and token symbol
        SELF_AMOUNT=$(echo "$SELF_DELEGATION" | awk '{print $1}')
        EXTERNAL_AMOUNT=$(echo "$EXTERNAL_DELEGATION" | awk '{print $1}')
        REWARD_AMOUNT=$(echo "$REWARD" | awk '{print $1}')
        TOKEN=$(echo "$REWARD" | awk '{print $2}')
        
        # Convert token to uppercase for matching (in case DB has lowercase)
        TOKEN_UPPER=$(echo "$TOKEN" | tr '[:lower:]' '[:upper:]')
        
        # Clean up amounts - handle scientific notation and remove non-numeric characters
        SELF_AMOUNT=$(echo "$SELF_AMOUNT" | grep -oE '[0-9]+\.?[0-9]*([eE][+-]?[0-9]+)?' | head -1 || echo "0")
        EXTERNAL_AMOUNT=$(echo "$EXTERNAL_DELEGATION" | grep -oE '[0-9]+\.?[0-9]*([eE][+-]?[0-9]+)?' | head -1 || echo "0")
        REWARD_AMOUNT=$(echo "$REWARD" | grep -oE '[0-9]+\.?[0-9]*([eE][+-]?[0-9]+)?' | head -1 || echo "0")
        
        # Function to convert scientific notation to decimal
        convert_sci_to_decimal() {
            local num="$1"
            # Check if number is in scientific notation
            if [[ "$num" == *[eE]* ]]; then
                echo "$num" | awk '{printf "%.0f", $1}' 2>/dev/null || echo "0"
            else
                echo "$num"
            fi
        }
        
        # Convert scientific notation to decimal if needed
        SELF_AMOUNT=$(convert_sci_to_decimal "$SELF_AMOUNT")
        EXTERNAL_AMOUNT=$(convert_sci_to_decimal "$EXTERNAL_AMOUNT")
        REWARD_AMOUNT=$(convert_sci_to_decimal "$REWARD_AMOUNT")
        
        # Set to 0 if empty or invalid
        [[ "$SELF_AMOUNT" =~ ^-?[0-9]+(\.[0-9]+)?$ ]] || SELF_AMOUNT=0
        [[ "$EXTERNAL_AMOUNT" =~ ^-?[0-9]+(\.[0-9]+)?$ ]] || EXTERNAL_AMOUNT=0
        [[ "$REWARD_AMOUNT" =~ ^-?[0-9]+(\.[0-9]+)?$ ]] || REWARD_AMOUNT=0
        
        # Skip if no token found
        if [ -z "$TOKEN" ]; then
            echo "Skipping: No token symbol found"
            continue
        fi
        
        # Get token price - try both original case and uppercase
        TOKEN_PRICE=${TOKEN_PRICES[$TOKEN_UPPER]}
        if [ -z "$TOKEN_PRICE" ]; then
            TOKEN_PRICE=${TOKEN_PRICES[$TOKEN]}
        fi
        
        # Skip if no price found or price is zero
        if [ -z "$TOKEN_PRICE" ] || [ "$TOKEN_PRICE" = "0" ]; then
            display_name=${TOKEN_DISPLAY_NAMES[$TOKEN_UPPER]:-$TOKEN_UPPER}
            echo "Skipping: No valid price found for $display_name ($TOKEN_UPPER)"
            continue
        fi
        
        # Function to perform safe floating point math with bc
        # Uses a higher scale (20) for precision with large numbers
        calculate() {
            local expression=$1
            # Use bc with higher scale and remove any scientific notation from output
            echo "scale=20; $expression" | bc -l | tr -d '\n' | sed 's/\..*$//' 2>/dev/null || echo "0"
        }
        
        # Calculate USD values using our safe calculation function
        SELF_USD=$(calculate "$SELF_AMOUNT * $TOKEN_PRICE")
        EXTERNAL_USD=$(calculate "$EXTERNAL_AMOUNT * $TOKEN_PRICE")
        REWARD_USD=$(calculate "$REWARD_AMOUNT * $TOKEN_PRICE")
        
        # Add to running totals
        TOTAL_SELF_USD=$(calculate "$TOTAL_SELF_USD + $SELF_USD")
        TOTAL_EXTERNAL_USD=$(calculate "$TOTAL_EXTERNAL_USD + $EXTERNAL_USD")
        
        # Skip AVAIL rewards from total
        if [ "$NETWORK" = "avail" ]; then
            REWARD_USD=0  # Set rewards to 0 for AVAIL
        fi
        TOTAL_REWARDS_USD=$(calculate "$TOTAL_REWARDS_USD + $REWARD_USD")
        
        # Format and display the values
        display_name=${TOKEN_DISPLAY_NAMES[$TOKEN_UPPER]:-$TOKEN_UPPER}
        printf "%-10s: $%'.2f self, $%'.2f external, $%'.2f rewards\n" \
            "$display_name" "$SELF_USD" "$EXTERNAL_USD" "$REWARD_USD"
    else
        echo "No data found"
    fi
done

# Format the totals with 2 decimal places
FORMATTED_SELF=$(printf "%.2f" "$TOTAL_SELF_USD" 2>/dev/null || echo "0.00")
FORMATTED_EXTERNAL=$(printf "%.2f" "$TOTAL_EXTERNAL_USD" 2>/dev/null || echo "0.00")
FORMATTED_REWARDS=$(printf "%.2f" "$TOTAL_REWARDS_USD" 2>/dev/null || echo "0.00")

# Insert the totals into the database
PGPASSWORD="$PGPASSWORD" psql -U "$PGUSER" -d "$PGDATABASE" -h "$PGHOST" <<EOSQL
INSERT INTO total_rewards (
    total_self_delegations_usd,
    total_external_delegations_usd,
    total_rewards_usd
) VALUES (
    '$FORMATTED_SELF',
    '$FORMATTED_EXTERNAL',
    '$FORMATTED_REWARDS'
);
EOSQL

echo -e "\nTotal Rewards Summary:"
echo "----------------------"
printf "Total Self Delegations:   $%'.2f\n" "$TOTAL_SELF_USD"
printf "Total External Delegations: $%'.2f\n" "$TOTAL_EXTERNAL_USD"
printf "Total Rewards:            $%'.2f\n" "$TOTAL_REWARDS_USD"
echo "----------------------"
echo "Data saved to total_rewards table"
