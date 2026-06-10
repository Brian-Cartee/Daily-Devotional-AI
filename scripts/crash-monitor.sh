#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Shepherd's Path — CRASH MONITOR
#  Runs every 5 min via cron. Alerts your phone via ntfy.sh
#  if PM2 restarts spike (crash loop detected).
#
#  Setup:
#    1. Install ntfy app on your iPhone (free, ntfy.sh)
#    2. Subscribe to topic:  shepherdspath-prod-alerts
#    3. Add to crontab on server:
#       */5 * * * * /home/ubuntu/Daily-Devotional-AI/scripts/crash-monitor.sh >> /home/ubuntu/crash-monitor.log 2>&1
# ─────────────────────────────────────────────────────────────

NTFY_TOPIC="shepherdspath-prod-alerts"
STATE_FILE="/tmp/sp_pm2_restart_state"
ALERT_COOLDOWN_FILE="/tmp/sp_alert_cooldown"
CRASH_THRESHOLD=3          # restarts gained in one 5-min window = alert
COOLDOWN_MINUTES=30        # don't re-alert more than once per 30 min per process

# ── Helper: send ntfy push notification ──────────────────────
send_alert() {
  local title="$1"
  local message="$2"
  local priority="${3:-high}"
  curl -s \
    -H "Title: $title" \
    -H "Priority: $priority" \
    -H "Tags: warning,shepherds-path" \
    -d "$message" \
    "https://ntfy.sh/$NTFY_TOPIC" > /dev/null 2>&1
}

# ── Read PM2 status ──────────────────────────────────────────
PM2_JSON=$(pm2 jlist 2>/dev/null)
if [ -z "$PM2_JSON" ]; then
  echo "[$(date)] ERROR: pm2 jlist returned nothing"
  exit 1
fi

# ── Check each watched process ───────────────────────────────
check_process() {
  local name="$1"
  local restarts
  restarts=$(echo "$PM2_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data:
    if p.get('name') == '$name':
        print(p.get('pm2_env', {}).get('restart_time', 0))
        break
" 2>/dev/null)

  if [ -z "$restarts" ]; then
    echo "[$(date)] WARN: process '$name' not found in PM2"
    return
  fi

  local state_key="${name}_restarts"
  local prev_restarts=0

  # Load previous restart count
  if [ -f "$STATE_FILE" ]; then
    prev_restarts=$(grep "^${state_key}=" "$STATE_FILE" 2>/dev/null | cut -d= -f2)
    prev_restarts=${prev_restarts:-0}
  fi

  local gained=$(( restarts - prev_restarts ))

  echo "[$(date)] $name: restarts=$restarts (prev=$prev_restarts, gained=$gained)"

  # Update state
  if [ -f "$STATE_FILE" ]; then
    sed -i "/^${state_key}=/d" "$STATE_FILE"
  fi
  echo "${state_key}=${restarts}" >> "$STATE_FILE"

  # Alert if crash threshold crossed
  if [ "$gained" -ge "$COOLDOWN_MINUTES" ]; then
    # Check cooldown to avoid spam
    local cooldown_key="${ALERT_COOLDOWN_FILE}_${name}"
    local now=$(date +%s)
    local last_alert=0
    if [ -f "$cooldown_key" ]; then
      last_alert=$(cat "$cooldown_key" 2>/dev/null || echo 0)
    fi
    local elapsed=$(( now - last_alert ))
    local cooldown_secs=$(( COOLDOWN_MINUTES * 60 ))

    if [ "$elapsed" -gt "$cooldown_secs" ]; then
      echo "[$(date)] ALERT: $name crashed $gained times — sending push notification"
      send_alert \
        "🚨 Shepherd's Path: $name crash loop" \
        "$name restarted $gained times in the last 5 min (total: $restarts). Server may be down. SSH in and check: pm2 logs $name --lines 50" \
        "urgent"
      echo "$now" > "$cooldown_key"
    else
      echo "[$(date)] Alert suppressed (cooldown: ${elapsed}s / ${cooldown_secs}s)"
    fi
  fi

  # Also alert if process is currently errored/stopped
  local status
  status=$(echo "$PM2_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data:
    if p.get('name') == '$name':
        print(p.get('pm2_env', {}).get('status', 'unknown'))
        break
" 2>/dev/null)

  if [[ "$status" == "errored" || "$status" == "stopped" ]]; then
    local cooldown_key="${ALERT_COOLDOWN_FILE}_${name}_down"
    local now=$(date +%s)
    local last_alert=0
    if [ -f "$cooldown_key" ]; then
      last_alert=$(cat "$cooldown_key" 2>/dev/null || echo 0)
    fi
    local elapsed=$(( now - last_alert ))
    if [ "$elapsed" -gt 1800 ]; then
      echo "[$(date)] ALERT: $name status=$status — sending push notification"
      send_alert \
        "🔴 Shepherd's Path: $name is $status" \
        "$name is currently $status and not serving requests. Run: pm2 restart $name" \
        "urgent"
      local now2=$(date +%s)
      echo "$now2" > "$cooldown_key"
    fi
  fi
}

check_process "api-server"
check_process "frontend"
