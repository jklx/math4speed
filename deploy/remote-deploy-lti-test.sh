#!/usr/bin/env sh
set -eu

IMAGE_URI="${1:?Usage: remote-deploy-lti-test.sh IMAGE_URI}"
APP_NAME="math4speed-lti-test"
DATA_DIR="/opt/math4speed-lti-test/data"
ENV_FILE="/opt/math4speed-lti-test/lti.env"
CANDIDATE_NAME="${APP_NAME}-candidate"
HOST_PORT="3002"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing LTI environment file: $ENV_FILE" >&2
  exit 1
fi

run_container() {
  name="$1"
  host_port="$2"
  image="$3"
  docker run -d \
    --name "$name" \
    --restart unless-stopped \
    -p "127.0.0.1:${host_port}:3000" \
    -v "${DATA_DIR}:/app/data" \
    --env-file "$ENV_FILE" \
    -e LEADERBOARD_FILE=/app/data/leaderboard.json \
    -e LTI_ACTIVITY_FILE=/app/data/lti-activities.json \
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

install -d -m 0750 -o 1000 -g 1000 "$DATA_DIR"
docker pull "$IMAGE_URI"

# Verify the image on a disposable port before replacing the LTI test service.
docker rm -f "$CANDIDATE_NAME" >/dev/null 2>&1 || true
run_container "$CANDIDATE_NAME" 3003 "$IMAGE_URI" >/dev/null
if ! wait_for_health 3003; then
  docker logs "$CANDIDATE_NAME" || true
  docker rm -f "$CANDIDATE_NAME" >/dev/null 2>&1 || true
  echo "Candidate did not become healthy; the LTI test service is unchanged." >&2
  exit 1
fi
docker rm -f "$CANDIDATE_NAME" >/dev/null

PREVIOUS_IMAGE="$(docker inspect --format '{{.Config.Image}}' "$APP_NAME" 2>/dev/null || true)"
docker rm -f "$APP_NAME" >/dev/null 2>&1 || true
run_container "$APP_NAME" "$HOST_PORT" "$IMAGE_URI" >/dev/null

if wait_for_health "$HOST_PORT"; then
  echo "LTI test deployment complete: ${IMAGE_URI}"
  exit 0
fi

docker logs "$APP_NAME" || true
docker rm -f "$APP_NAME" >/dev/null 2>&1 || true
if [ -n "$PREVIOUS_IMAGE" ]; then
  echo "New LTI test version failed; rolling back to ${PREVIOUS_IMAGE}." >&2
  run_container "$APP_NAME" "$HOST_PORT" "$PREVIOUS_IMAGE" >/dev/null
fi
exit 1
