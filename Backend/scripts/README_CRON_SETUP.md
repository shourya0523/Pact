# Checkin Reminder Cron Job Setup

This guide explains how to set up automated checkin reminder notifications.

## Overview

The checkin reminder system sends push notifications to users who have active habits but haven't checked in yet today. This helps keep users accountable and engaged with their habits.

## Setup Instructions

### 1. Set Environment Variable

Add the `REMINDER_CRON_SECRET` to your `.env` file:

```bash
REMINDER_CRON_SECRET=your-secret-key-here-change-this-in-production
```

**Important**: Use a strong, random secret key in production!

### 2. Choose a Setup Method

#### Option A: Using the Python Script (Recommended)

The script `scripts/send_checkin_reminders.py` handles the API call for you.

**Setup cron job:**

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 9 AM UTC)
# Adjust the path to match your Backend directory
0 9 * * * cd /path/to/Pact/Backend && /usr/bin/python3 scripts/send_checkin_reminders.py >> /var/log/pact-reminders.log 2>&1
```

**For different time zones:**

```bash
# 9 AM EST (UTC-5) = 2 PM UTC
0 14 * * * cd /path/to/Pact/Backend && /usr/bin/python3 scripts/send_checkin_reminders.py >> /var/log/pact-reminders.log 2>&1

# 9 AM PST (UTC-8) = 5 PM UTC
0 17 * * * cd /path/to/Pact/Backend && /usr/bin/python3 scripts/send_checkin_reminders.py >> /var/log/pact-reminders.log 2>&1
```

#### Option B: Using curl Directly

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 9 AM UTC)
# Replace YOUR_SECRET_KEY and your-api-url with actual values
0 9 * * * curl -X POST "http://your-api-url/api/notifications/send-checkin-reminders?secret_key=YOUR_SECRET_KEY" >> /var/log/pact-reminders.log 2>&1
```

#### Option C: Using systemd Timer (Linux)

Create a service file `/etc/systemd/system/pact-reminders.service`:

```ini
[Unit]
Description=Pact Checkin Reminders
After=network.target

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/Pact/Backend
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/python3 scripts/send_checkin_reminders.py
```

Create a timer file `/etc/systemd/system/pact-reminders.timer`:

```ini
[Unit]
Description=Run Pact Reminders Daily
Requires=pact-reminders.service

[Timer]
OnCalendar=daily
OnCalendar=09:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl enable pact-reminders.timer
sudo systemctl start pact-reminders.timer
```

### 3. Test the Setup

**Test the script manually:**

```bash
cd Backend
python3 scripts/send_checkin_reminders.py
```

**Test the endpoint directly:**

```bash
curl -X POST "http://localhost:8000/api/notifications/send-checkin-reminders?secret_key=your-secret-key"
```

**Run the test suite:**

```bash
cd Backend
python3 scripts/test_notifications.py
```

## How It Works

1. The cron job calls the `/api/notifications/send-checkin-reminders` endpoint
2. The endpoint:
   - Verifies the secret key
   - Finds all active habits
   - For each habit, checks if users have checked in today
   - Sends push notifications via WebSocket to users who haven't checked in
3. Notifications are sent through the WebSocket connection and appear as push notifications on the user's device

## Monitoring

Check the logs to verify reminders are being sent:

```bash
# View cron logs
tail -f /var/log/pact-reminders.log

# Or check system logs
journalctl -u pact-reminders.service -f
```

## Troubleshooting

### Notifications not being sent

1. **Check WebSocket connections**: Users must have the app open or WebSocket connected
2. **Check notification preferences**: Users may have disabled reminders in settings
3. **Check logs**: Look for error messages in the cron log file
4. **Verify secret key**: Make sure `REMINDER_CRON_SECRET` matches in `.env` and cron job

### Cron job not running

1. **Check cron service**: `sudo systemctl status cron` (Linux) or check cron daemon
2. **Check cron logs**: `grep CRON /var/log/syslog` (Linux)
3. **Verify paths**: Make sure all paths in the cron job are absolute
4. **Check permissions**: Ensure the script is executable: `chmod +x scripts/send_checkin_reminders.py`

### Testing

Use the test script to verify everything works:

```bash
python3 scripts/test_notifications.py
```

This will test:
- Partner request notifications
- Checkin reminder notifications  
- Notification preference checking

## Customization

### Change Reminder Time

Edit the cron schedule. Format: `minute hour day month weekday`

Examples:
- `0 9 * * *` - 9 AM daily
- `0 9,18 * * *` - 9 AM and 6 PM daily
- `0 9 * * 1-5` - 9 AM on weekdays only

### Multiple Reminders Per Day

Add multiple cron entries:

```bash
# Morning reminder at 9 AM
0 9 * * * cd /path/to/Backend && python3 scripts/send_checkin_reminders.py

# Afternoon reminder at 3 PM
0 15 * * * cd /path/to/Backend && python3 scripts/send_checkin_reminders.py
```

## Security Notes

- **Never commit** `REMINDER_CRON_SECRET` to version control
- Use a strong, random secret key in production
- Consider using environment-specific secrets (dev/staging/prod)
- The endpoint requires the secret key to prevent unauthorized access

