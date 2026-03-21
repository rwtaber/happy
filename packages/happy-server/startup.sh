#!/bin/bash
# startup.sh — Happy Server startup with auto-recovery
# Handles: PGlite corruption, DB migration, account bootstrap
set -e

DATA_DIR="${DATA_DIR:-/home/rwt/Code/happy/packages/happy-server/data}"
PGLITE_DIR="$DATA_DIR/pglite"
NPX="/home/rwt/.nvm/versions/node/v24.13.1/bin/npx"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$SCRIPT_DIR"

# Step 1: Try to migrate. If it fails, wipe PGlite and retry.
echo "[startup] Running database migration..."
if ! $NPX tsx sources/standalone.ts migrate 2>&1; then
    echo "[startup] Migration failed — wiping corrupt PGlite database..."
    rm -rf "$PGLITE_DIR"
    echo "[startup] Retrying migration with fresh database..."
    $NPX tsx sources/standalone.ts migrate
fi

echo "[startup] Migration complete. Starting server..."
exec $NPX tsx sources/standalone.ts serve
