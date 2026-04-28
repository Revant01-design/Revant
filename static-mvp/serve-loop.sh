#!/bin/bash
# Resilient serve script for static-mvp build on port 3000
# Auto-restarts on failure
while true; do
  cd /app/static-mvp/build
  npx --yes serve -s . -l 3000 > /tmp/serve3000.log 2>&1
  echo "[$(date)] serve died, restarting in 2s..." >> /tmp/serve3000.log
  sleep 2
done
