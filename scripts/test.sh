#!/bin/zsh
# Все автотесты: расширение, установщик и договор об API с MindNotes (node --test), установщик компилируется.
#   MINDNOTES_DIR=../MindNotes ./scripts/test.sh   ещё и сверить договор с соседней копией MindNotes
#   CHECK_UPSTREAM=1 ./scripts/test.sh             … или с репозиторием MindNotes на GitHub
set -euo pipefail
cd "$(dirname "$0")/.."
node --test tests/*.test.cjs
swiftc -parse-as-library -typecheck -target arm64-apple-macos15.0 Installer/*.swift
echo "Все тесты пройдены"
