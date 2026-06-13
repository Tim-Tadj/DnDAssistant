#!/usr/bin/env bash
#
# Boots the full DnDAssistant stack on Linux/macOS: PostgreSQL (Docker), the Java
# backend, and the React frontend. Runs each step in order, failing fast.
#
# Stop the database afterwards with:
#   docker compose -f postgres/docker-compose.yml down
#
set -euo pipefail

# Resolve repository root (this script lives in <root>/scripts).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

step() { printf '\n==> %s\n' "$1"; }

# 1. Start PostgreSQL + Adminer.
step 'Starting PostgreSQL + Adminer (docker compose up -d --build)'
docker compose -f postgres/docker-compose.yml up -d --build

# 2. Wait for PostgreSQL to accept connections.
step 'Waiting for PostgreSQL to become ready'
ready=false
for _ in $(seq 1 30); do
  if docker exec postgres pg_isready -U postgres -d dnd_assistant >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [ "$ready" != true ]; then
  echo 'PostgreSQL did not become ready in time' >&2
  exit 1
fi
echo 'PostgreSQL is ready.'

# 3. Build the backend and launch it in the background.
step 'Building backend (mvn clean install)'
if [ -x "$REPO_ROOT/mvnw" ]; then MVN="$REPO_ROOT/mvnw"; else MVN="mvn"; fi
"$MVN" clean install

JAR="$(find "$REPO_ROOT/target" -maxdepth 1 -name 'dnd-assistant-*.jar' | head -n 1)"
if [ -z "$JAR" ]; then
  echo 'No backend jar found in target/ after build' >&2
  exit 1
fi

step "Launching backend ($(basename "$JAR")) in the background"
java -cp "$JAR" main.java.com.pigishentertainment.dndassistant.Main &
BACKEND_PID=$!
# Stop the backend when this script is interrupted.
trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT

# 4. Install frontend deps (first run) and start the dev server.
if [ ! -d "$REPO_ROOT/node_modules" ]; then
  step 'Installing frontend dependencies (npm install)'
  npm install
fi

step 'Starting frontend dev server (npm start)'
npm start
