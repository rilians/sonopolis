#!/usr/bin/env bash
# One-shot: create the remote and push this repository to GitHub.
# Usage:  ./tools/push-to-github.sh git@github.com:<user>/sonopolis.git
set -euo pipefail
REMOTE="${1:?usage: tools/push-to-github.sh <git-remote-url>}"
cd "$(dirname "$0")/.."
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE"
git branch -M main
git push -u origin main
echo "→ pushed. Import it at https://vercel.com/new (framework: Vite, output: dist)"
