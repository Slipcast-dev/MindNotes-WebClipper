# Репозиторий MindNotes (подключается из release.sh и remove-app-copies.sh).
# MindNotes 1.7.0+ ищет выпуски Web Clipper сразу в этом репозитории; MindNotes до 1.7.0 — только в репозитории
# приложения. С 13.11.2026 копии туда не делаются: MindNotes до 1.7.0 сначала обновляется до 1.7.0 и дальше берёт
# плагин отсюда. Копию можно сделать вручную: MIRROR_TO_APP_REPO=1 ./scripts/release.sh.
APP_REPO=$(/usr/bin/plutil -extract app.repository raw -o - contracts/plugin-api.json)
APP_BRANCH=personal-ru
