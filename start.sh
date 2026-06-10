#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

WEB_PORT=5173
API_PORT=8787
ACTION="${1:-start}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not installed."
  echo "Install it first: npm install -g pnpm"
  exit 1
fi

port_pids() {
  local port="$1"
  lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
}

show_status() {
  local web_pids api_pids
  web_pids="$(port_pids "$WEB_PORT")"
  api_pids="$(port_pids "$API_PORT")"

  if [ -n "$web_pids" ]; then
    echo "Web running on http://localhost:$WEB_PORT  PID: ${web_pids//$'\n'/,}"
  else
    echo "Web stopped on port $WEB_PORT"
  fi

  if [ -n "$api_pids" ]; then
    echo "Proxy running on http://localhost:$API_PORT  PID: ${api_pids//$'\n'/,}"
  else
    echo "Proxy stopped on port $API_PORT"
  fi
}

stop_port() {
  local port="$1"
  local pids
  pids="$(port_pids "$port")"

  if [ -z "$pids" ]; then
    return
  fi

  echo "Stopping port $port: ${pids//$'\n'/,}"
  kill $pids 2>/dev/null || true
  sleep 1

  pids="$(port_pids "$port")"
  if [ -n "$pids" ]; then
    echo "Force stopping port $port: ${pids//$'\n'/,}"
    kill -9 $pids 2>/dev/null || true
  fi
}

stop_all() {
  stop_port "$WEB_PORT"
  stop_port "$API_PORT"
}

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install
fi

case "$ACTION" in
  start)
    if [ -n "$(port_pids "$WEB_PORT")" ] || [ -n "$(port_pids "$API_PORT")" ]; then
      echo "Already running or ports are occupied:"
      show_status
      echo
      echo "Use ./start.sh restart to stop and restart both services."
      exit 0
    fi
    ;;
  restart)
    stop_all
    ;;
  stop)
    stop_all
    echo "Stopped."
    exit 0
    ;;
  status)
    show_status
    exit 0
    ;;
  *)
    echo "Usage: ./start.sh [start|restart|stop|status]"
    exit 1
    ;;
esac

echo "Starting Prompt Canvas..."
echo "  Web:   http://localhost:$WEB_PORT"
echo "  Proxy: http://localhost:$API_PORT"
echo

pnpm dev
