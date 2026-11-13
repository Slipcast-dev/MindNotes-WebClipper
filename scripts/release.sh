#!/bin/zsh
# Выпуск Web Clipper: тег webclipper-v<версия>, образ установщика, plugin-manifest.json и суммы.
#   ./scripts/release.sh                проверить, собрать, создать тег и выпуск на GitHub
#   DRY_RUN=1 ./scripts/release.sh      всё, кроме тега и публикации
#   MIRROR_TO_APP_REPO=0 ./scripts/release.sh   без копии выпуска в репозитории MindNotes (см. ниже)
#
# Выпуск публикуется в репозиторий из поля `repository` в manifest.json. MindNotes до 1.7.0 не знает этого поля и ищет
# выпуски плагина в репозитории приложения, поэтому по умолчанию туда же кладётся копия — с пометкой «не последний»:
# по releases/latest MindNotes ищет свои обновления. Копии можно выключить, когда MindNotes до 1.7.0 не останется.
set -euo pipefail
cd "$(dirname "$0")/.."

APP_REPO=$(/usr/bin/plutil -extract app.repository raw -o - contracts/plugin-api.json)
APP_BRANCH=personal-ru
PLUGIN_REPO=$(/usr/bin/plutil -extract repository raw -o - manifest.json 2>/dev/null) || PLUGIN_REPO=""
version=$(/usr/bin/plutil -extract version raw -o - manifest.json)
prefix=$(/usr/bin/plutil -extract updates raw -o - manifest.json)
TAG="$prefix$version"
OUT_DIR="${OUT:-build}/release-$version"
DMG="MindNotes-Web-Clipper-$version.dmg"
fail() { echo "Выпуск остановлен: $1"; exit 1; }

# Те же правила имени, что в MindNotes (PluginManifest.isValidRepository).
[[ "$PLUGIN_REPO" =~ '^[A-Za-z0-9][A-Za-z0-9-]{0,38}/[A-Za-z0-9._-]{1,100}$' && "${PLUGIN_REPO#*/}" != "." && "${PLUGIN_REPO#*/}" != ".." ]] \
    || fail "repository в manifest.json — нужно «владелец/имя» на GitHub"
TARGETS=("$PLUGIN_REPO")
[[ "${MIRROR_TO_APP_REPO:-1}" != 0 && "$PLUGIN_REPO" != "$APP_REPO" ]] && TARGETS+=("$APP_REPO")

# 1. Готовность: чистое дерево, новая версия, записи в обоих журналах.
[[ -z "$(git status --porcelain)" || -n "${DRY_RUN:-}" ]] || fail "есть незакоммиченные изменения"
git rev-parse -q --verify "refs/tags/$TAG" >/dev/null && fail "тег $TAG уже есть — поднимите version в manifest.json"
for repo in "${TARGETS[@]}"; do
    gh release view "$TAG" --repo "$repo" >/dev/null 2>&1 && fail "выпуск $TAG уже есть в $repo"
done
for log in CHANGELOG.md CHANGELOG.ru.md; do
    grep -q "^## \[$version\]" "$log" || fail "в $log нет раздела ## [$version]"
done

# 2. Совместимость. Плагин подстраивается под возможности MindNotes (`features`), а не под её версию, поэтому minApp
#    необязателен: он нужен только при несовместимом изменении API. Если задан — такая MindNotes уже должна быть выпущена.
latestApp=$(gh api "repos/$APP_REPO/releases/latest" --jq .tag_name | sed 's/^v//')
minApp=$(/usr/bin/plutil -extract minApp raw -o - manifest.json 2>/dev/null) || minApp=""
if [[ -n "$minApp" && "$(printf '%s\n%s\n' "$minApp" "$latestApp" | sort -V | head -1)" != "$minApp" ]]; then
    message="плагину нужна MindNotes $minApp, а последняя выпущенная — $latestApp. Сначала выпустите приложение."
    [[ -n "${DRY_RUN:-}" ]] && echo "Предупреждение: $message" || fail "$message"
fi

# 3. Тесты (с проверкой договора по репозиторию MindNotes) и сборка.
CHECK_UPSTREAM=1 ./scripts/test.sh >/dev/null || fail "тесты не прошли (CHECK_UPSTREAM=1 ./scripts/test.sh)"
rm -rf "$OUT_DIR"; mkdir -p "$OUT_DIR"
OUT="$OUT_DIR" ./scripts/build.sh >/dev/null
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
ditto "$OUT_DIR/MindNotes Web Clipper.app" "$STAGE/MindNotes Web Clipper.app"
cat > "$STAGE/Как установить · How to install.txt" <<'TXT'
Откройте «MindNotes Web Clipper» — он сам перенесётся в «Программы», добавит плагин в MindNotes
и расширение в ваши браузеры. Нужна MindNotes с поддержкой плагинов.

Open “MindNotes Web Clipper”: it moves itself to Applications and adds the plugin to MindNotes
and the extension to your browsers. Requires a MindNotes version with plugin support.
TXT
hdiutil create -volname "MindNotes Web Clipper" -srcfolder "$STAGE" -ov -format UDZO "$OUT_DIR/$DMG" >/dev/null
# Описание плагина отдельным файлом: по нему MindNotes сравнивает разрешения до скачивания образа и решает,
# можно ли обновить без вопроса.
cp manifest.json "$OUT_DIR/plugin-manifest.json"
(cd "$OUT_DIR" && shasum -a 256 "$DMG" plugin-manifest.json > SHA256SUMS.txt)
# Сборка не должна оставлять в системе второе расширение Safari: регистрация снимается, а сама программа
# удаляется — в выпуске нужен только образ, иначе macOS со временем снова находит её в папке сборки.
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -u "$OUT_DIR/MindNotes Web Clipper.app" 2>/dev/null || true
rm -rf "$OUT_DIR/MindNotes Web Clipper.app"

# Описание выпуска: английский и русский разделы журнала.
section() { awk -v v="$version" '$0 ~ "^## \\[" v "\\]" {on=1; next} on && /^## \[/ {exit} on {print}' "$1"; }
notes="$OUT_DIR/notes.md"
{ echo "**English**"; section CHANGELOG.md; echo; echo "---"; echo; echo "**Русский**"; section CHANGELOG.ru.md; } > "$notes"
if [[ -n "$minApp" ]]; then
    printf '\nRequires MindNotes %s or later · Требуется MindNotes %s или новее.\n\n<!-- minApp: %s -->\n' "$minApp" "$minApp" "$minApp" >> "$notes"
fi

if [[ -n "${DRY_RUN:-}" ]]; then
    echo "Проверка пройдена, публикация пропущена (DRY_RUN): $OUT_DIR/$DMG → ${TARGETS[*]}"
    exit 0
fi

# 4. Тег здесь и выпуски. В репозитории приложения тег ставит GitHub на его основную ветку, а выпуск — не «последний».
git tag -a "$TAG" -m "Web Clipper $version"
git push origin "$TAG"
for repo in "${TARGETS[@]}"; do
    if [[ "$repo" == "$APP_REPO" ]]; then
        extra=(--latest=false --target "$APP_BRANCH")
    else
        extra=(--verify-tag)
    fi
    gh release create "$TAG" "$OUT_DIR/$DMG" "$OUT_DIR/plugin-manifest.json" "$OUT_DIR/SHA256SUMS.txt" --repo "$repo" \
        --title "Web Clipper $version" --notes-file "$notes" "${extra[@]}"
    echo "Выпущен $TAG в $repo"
done
if (( ${TARGETS[(Ie)$APP_REPO]} )); then
    [[ "$(gh api "repos/$APP_REPO/releases/latest" --jq .tag_name)" == "v$latestApp" ]] \
        || echo "ВНИМАНИЕ: последним выпуском MindNotes на GitHub стал не MindNotes — проверьте выпуски, иначе приложение не найдёт свои обновления."
fi
