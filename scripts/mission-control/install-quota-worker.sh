#!/bin/bash
# Install a per-user macOS launchd worker. No root, API key or paid fallback.
# Installation is an explicit operator action on the authenticated Mac.
set -euo pipefail
REPO="$HOME/usv-01-digital-lab"
PLIST="$HOME/Library/LaunchAgents/com.usv01.quota-agent-worker.plist"
LOGS="$HOME/Library/Logs"
if [ ! -f "$REPO/package.json" ] || [ ! -f "$REPO/scripts/mission-control/resilient-queue.ts" ]; then
  echo "Expected updated USV-01 repository at $REPO" >&2
  exit 1
fi
mkdir -p "$HOME/Library/LaunchAgents" "$LOGS" "$HOME/.local/bin"
WRAPPER="$HOME/.local/bin/usv01-quota-agent-worker"
cat > "$WRAPPER" <<EOF
#!/bin/bash
set -euo pipefail
export PATH="\$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:\$PATH"
cd "$REPO"
# Never execute from an unreviewed feature branch or a dirty pinned revision.
if [ "\$(git branch --show-current)" != main ]; then
  echo "HOLD: not on main"
  exit 0
fi
if [ -n "\$(git status --porcelain --untracked-files=no)" ]; then
  echo "HOLD: tracked local changes"
  exit 0
fi
if [ "\$(git rev-parse HEAD)" != "\$(git rev-parse origin/main)" ]; then
  echo "HOLD: local main is not synchronized with origin/main"
  exit 0
fi
export AI_REVIEW_PROVIDER=codex_cli
export USV_SUBSCRIPTION_PILOT=enabled
export USV_ALLOW_PAID_AI_API=false
export USV_NO_PAID_API=1
npm run mission-control:quota -- run --max 3
EOF
chmod 700 "$WRAPPER"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
"http://www.apple.com/DTDs/PropertyList/1.0/DTD/plist.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.usv01.quota-agent-worker</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$WRAPPER</string></array>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>900</integer>
  <key>StandardOutPath</key><string>$LOGS/usv01-quota-agent.log</string>
  <key>StandardErrorPath</key><string>$LOGS/usv01-quota-agent.error.log</string>
</dict>
</plist>
EOF
launchctl bootout "gui/$(id -u)" "$PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed USV-01 quota worker. Checks a bounded queue every 15 minutes while logged in."
echo "Status: cd \"$REPO\" && npm run mission-control:quota -- status"
echo "Logs: $LOGS/usv01-quota-agent.log"
echo "Uninstall: launchctl bootout gui/$(id -u) \"$PLIST\""
