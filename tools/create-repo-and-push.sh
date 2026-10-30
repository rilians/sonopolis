#!/usr/bin/env bash
# Creates the GitHub repo and pushes this project to it.
#   GH_TOKEN=ghp_xxx ./tools/create-repo-and-push.sh [owner/repo]
set -euo pipefail
TOKEN="${GH_TOKEN:?set GH_TOKEN to a GitHub token with repo scope}"
REPO="${1:-rilians/sonopolis}"
OWNER="${REPO%%/*}"
NAME="${REPO##*/}"

cd "$(dirname "$0")/.."

echo "→ creating $REPO (public) if it does not exist"
curl -sS -X POST https://api.github.com/user/repos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d "{\"name\":\"$NAME\",\"private\":false,\"description\":\"SONOPOLIS — acoustic cartography of a procedural city\"}" \
  -o /tmp/gh-repo.json -w "   api: %{http_code}\n" || true

git remote remove origin 2>/dev/null || true
git remote add origin "https://x-access-token:${TOKEN}@github.com/${OWNER}/${NAME}.git"
git branch -M main
git push -u origin main
git remote set-url origin "https://github.com/${OWNER}/${NAME}.git"

echo
echo "→ https://github.com/${OWNER}/${NAME}"
