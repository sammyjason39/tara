# VPS Automation Guide

This project includes an automated deployment system that pulls the latest changes from Git and restarts the application containers.

## Components

1.  **`vps-auto-deploy.sh`**: The main automation script. It checks if the local branch is behind the remote `main` branch. If so, it pulls changes and runs `vps-up.sh`.
2.  **`vps-up.sh`**: The script that manages Docker container builds and restarts.
3.  **`logs/vps-deploy.log`**: Centralized log file containing the history of all deployment attempts.

## Setup Instructions (On VPS)

### 1. Set Permissions
Ensure both scripts are executable:
```bash
chmod +x vps-auto-deploy.sh
chmod +x vps-up.sh
```

### 2. Configure Cron Job
To automate the check (e.g., every 5 minutes), add a entry to your crontab.

1.  Open crontab editor:
    ```bash
    crontab -e
    ```
2.  Add the following line (replace `/path/to/project` with the actual path):
    ```cron
    */5 * * * * /path/to/project/vps-auto-deploy.sh >> /path/to/project/logs/cron.log 2>&1
    ```

### 3. Monitoring Logs
You can watch the deployment logs in real-time:
```bash
tail -f logs/vps-deploy.log
```

## Manual Trigger
If you want to force a check immediately:
```bash
./vps-auto-deploy.sh
```
