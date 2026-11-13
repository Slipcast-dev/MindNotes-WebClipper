# Security · Безопасность

**English**

Web Clipper is a plugin for the personal local app MindNotes. The latest release on the Releases page and the `main` branch are supported.

Report security issues to the owner directly: <https://github.com/Slipcast-dev>. Do not put details in public issues.

Areas that matter most: what the extension sends to MindNotes (`browser/api.js`, `browser/background.js`), the key in `chrome.storage.local`, page content parsing (`browser/extract.js`), extension permissions (`browser/manifest.json` — permanent access only to `127.0.0.1`), and the installer, which copies files and opens MindNotes and browser settings. On the MindNotes side, the local API, permissions and pairing are described in ADR-0019 of the MindNotes repository.

No secrets, keys or personal data are added to the repository.

---

**Русский**

Web Clipper — плагин личного локального приложения MindNotes. Поддерживается последний выпуск со страницы Releases и ветка `main`.

О проблеме безопасности сообщайте владельцу напрямую: <https://github.com/Slipcast-dev>. Не указывайте подробности в открытых задачах.

Важно для проекта: что расширение отправляет в MindNotes (`browser/api.js`, `browser/background.js`), ключ в `chrome.storage.local`, разбор содержимого страниц (`browser/extract.js`), разрешения расширения (`browser/manifest.json` — постоянный доступ только к `127.0.0.1`) и установщик, который копирует файлы и открывает MindNotes и настройки браузеров. Со стороны MindNotes локальный API, разрешения и подключение описаны в ADR-0019 репозитория MindNotes.

Секреты, ключи и личные данные в репозиторий не добавляются.
