#!/usr/bin/env sh
set -eu

IMAGE_URI="${1:?Usage: remote-deploy.sh IMAGE_URI}"
APP_NAME="math4speed"
DATA_DIR="/opt/math4speed/data"
CANDIDATE_NAME="${APP_NAME}-candidate"
LEGACY_SERVICE="math4speed"
LEGACY_WAS_ACTIVE=0

run_container() {
  name="$1"
  host_port="$2"
  image="$3"
  docker run -d \
    --name "$name" \
    --restart unless-stopped \
    -p "127.0.0.1:${host_port}:3000" \
    -v "${DATA_DIR}:/app/data" \
    -e LEADERBOARD_FILE=/app/data/leaderboard.json \
    "$image"
}

wait_for_health() {
  port="$1"
  attempt=0
  while [ "$attempt" -lt 30 ]; do
    if curl --fail --silent "http://127.0.0.1:${port}/api/health" >/dev/null; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
  return 1
}

mkdir -p "$DATA_DIR"
docker pull "$IMAGE_URI"

# Verify the pulled image without interrupting the currently running version.
docker rm -f "$CANDIDATE_NAME" >/dev/null 2>&1 || true
run_container "$CANDIDATE_NAME" 3001 "$IMAGE_URI" >/dev/null
if ! wait_for_health 3001; then
  docker logs "$CANDIDATE_NAME" || true
  docker rm -f "$CANDIDATE_NAME" >/dev/null 2>&1 || true
  echo "Candidate did not become healthy; the current version is still running." >&2
  exit 1
fi
docker rm -f "$CANDIDATE_NAME" >/dev/null

PREVIOUS_IMAGE="$(docker inspect --format '{{.Config.Image}}' "$APP_NAME" 2>/dev/null || true)"
if systemctl is-active --quiet "$LEGACY_SERVICE"; then
  LEGACY_WAS_ACTIVE=1
  systemctl stop "$LEGACY_SERVICE"
fi
docker rm -f "$APP_NAME" >/dev/null 2>&1 || true
run_container "$APP_NAME" 3000 "$IMAGE_URI" >/dev/null

if wait_for_health 3000; then
  # The legacy systemd unit is only present before the first container deploy.
  # Disable it after the replacement has proven healthy, so it cannot reclaim
  # port 3000 after a reboot.
  if [ "$LEGACY_WAS_ACTIVE" -eq 1 ]; then
    systemctl disable "$LEGACY_SERVICE"
  fi
  echo "Deployment complete: ${IMAGE_URI}"
  exit 0
fi

docker logs "$APP_NAME" || true
docker rm -f "$APP_NAME" >/dev/null 2>&1 || true
if [ -n "$PREVIOUS_IMAGE" ]; then
  echo "New version failed; rolling back to ${PREVIOUS_IMAGE}." >&2
  run_container "$APP_NAME" 3000 "$PREVIOUS_IMAGE" >/dev/null
elif [ "$LEGACY_WAS_ACTIVE" -eq 1 ]; then
  echo "New version failed; restoring the previous systemd service." >&2
  systemctl start "$LEGACY_SERVICE"
fi
exit 1
