#!/bin/zsh
# Убирает копии выпусков Web Clipper из репозитория MindNotes (scripts/app-copies.sh): MindNotes 1.7.0+ ищет плагин
# в его репозитории. Удаляются только выпуски с тегами webclipper-v…; теги остаются.
#   ./scripts/remove-app-copies.sh         показать, что будет удалено, и спросить
#   ./scripts/remove-app-copies.sh --yes   удалить без вопроса
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/app-copies.sh
prefix=$(/usr/bin/plutil -extract updates raw -o - manifest.json)

copies=("${(@f)$(gh release list --repo "$APP_REPO" --limit 200 --json tagName --jq ".[].tagName | select(startswith(\"$prefix\"))")}")
copies=(${copies:#})
(( ${#copies} )) || { echo "В $APP_REPO копий выпусков плагина нет."; exit 0; }
echo "Будут удалены выпуски в $APP_REPO (теги останутся), отменить нельзя:"
printf '  %s\n' "${copies[@]}"
if [[ "${1:-}" != "--yes" ]]; then
    read -r "answer?Удалить? [да/нет] "
    [[ "$answer" == "да" || "$answer" == "yes" ]] || { echo "Ничего не удалено."; exit 1; }
fi
for tag in "${copies[@]}"; do
    gh release delete "$tag" --repo "$APP_REPO" --yes
    echo "Удалён выпуск $tag"
done
