#!/usr/bin/env bash
# Publica este repositório no GitHub (conta logada). Uso: bash scripts/publicar-github.sh [usuario] [repo]
set -euo pipefail
USER_GH="${1:-azuos01}"; REPO="${2:-solar-motorhome}"
if command -v gh >/dev/null 2>&1; then
  gh repo create "$USER_GH/$REPO" --public --source=. --remote=origin --push
  gh api -X POST "repos/$USER_GH/$REPO/pages" -f "build_type=workflow" >/dev/null 2>&1 || true
else
  echo "gh não encontrado. Crie o repositório vazio '$REPO' em https://github.com/new e rode:"
  echo "  git remote add origin https://github.com/$USER_GH/$REPO.git && git push -u origin main --tags"
fi
echo "Ative Pages em Settings > Pages > Source: GitHub Actions. Site: https://$USER_GH.github.io/$REPO/"
