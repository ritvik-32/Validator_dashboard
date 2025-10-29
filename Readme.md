# Validator Dashboard - Setup and Network Management

## Server Setup

Follow these steps when setting up the project on a new server:

### 1. Install Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    postgresql postgresql-contrib \
    nodejs npm \
    git \
    jq \
    bc \
    curl

# Install Node.js 18.x and postgres if not already installed 


```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE validator_dashboard;
CREATE USER dashboard_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE validator_dashboard TO dashboard_user;

# Connect to the database and grant schema privileges
\c validator_dashboard
GRANT ALL ON SCHEMA public TO dashboard_user;

# Exit psql
\q
```


### to create default db tables
cd ~/validator-dashboard/backend
node scripts/migrate.js



####
FRONTEND
go to the frontend directory and run the following commands:

```bash
# Install dependencies
npm install

# Build the frontend
npm run build 

# Start the frontend
npm install -g serve
serve -s build
```

### BACKEND
npm install
npm run start



### TO ADD NEW NETWORKS

1. create script 
2. Add Network to Backend
/validator-dashboard/backend/src/controllers/networkController.js
```
// Add to the networks array
const networks = [
  // ... existing networks
  'your_network_name'  // must match table name prefix (lowercase, no special chars)
];
```

3. Add Token to Price Fetching
In 
total_rewards_fixed.sh
, add your token to both mappings:
```
# Add to TOKEN_IDS (CoinGecko ID : Token Symbol)
declare -A TOKEN_IDS=(
    # ... existing tokens
    ["coingecko-id"]="TOKEN_SYMBOL"  # e.g., ["cosmos"]="ATOM"
)

# Add to TOKEN_DISPLAY_NAMES
declare -A TOKEN_DISPLAY_NAMES=(
    # ... existing tokens
    ["TOKEN_SYMBOL"]="Display Name"  # e.g., ["ATOM"]="Cosmos"
)
```