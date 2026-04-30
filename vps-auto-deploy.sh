#!/bin/bash

# ==============================================================================
# Automated VPS Deployment Script
# Checks for updates in the remote main branch and restarts if changes exist.
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$PROJECT_DIR/logs/vps-deploy.log"
BRANCH="main"

# Ensure logs directory exists
mkdir -p "$PROJECT_DIR/logs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🔄 Checking for updates..."

cd "$PROJECT_DIR" || exit

# Fetch updates from remote
git fetch origin "$BRANCH" > /dev/null 2>&1

# Check if we are behind
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" != "$REMOTE" ]; then
    log "🚀 Updates detected! Pulling changes..."
    
    # Pull changes
    if git pull origin "$BRANCH"; then
        log "✅ Pull successful. Restarting application..."
        
        # Make sure vps-up is executable
        chmod +x vps-up.sh
        
        # Run the restart script
        if ./vps-up.sh >> "$LOG_FILE" 2>&1; then
            log "✨ Deployment completed successfully."
        else
            log "❌ Error during vps-up.sh. Check the log above for details."
        fi
    else
        log "❌ Error during git pull. Manual intervention may be required."
    fi
else
    log "💤 Already up to date. No action needed."
fi
