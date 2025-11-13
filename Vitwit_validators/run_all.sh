#!/bin/bash

# Change to the correct directory
cd ~/Validator_dashboard/Vitwit_validators

# List of scripts to run in order
SCRIPTS=(
  "agoric.sh"
  "akash.sh"
  "avail.sh"
  "cheqd.sh"
  "cosmos.sh"
  "mantra.sh"
  "nomic.sh"
  "namada.sh"
  "osmosis.sh"
  "passage.sh"
  "polygon.sh"
  "regen.sh"
)

# Run each script with a 10-second delay between
for script in "${SCRIPTS[@]}"; do
  echo "Running $script..."
  bash "$script"
  echo "Finished $script. Waiting 10 seconds..."
  sleep 10
done

# Run total_rewards.sh last
echo "Running total_rewards.sh..."
bash total_rewards.sh
echo "All scripts completed successfully."

