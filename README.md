<p align="center"><img src="resources/AppIcon-source.png" alt="MindNotes icon" width="96"></p>

# Web Clipper for MindNotes

**English** · [Русский](README.ru.md)

[![CI](https://github.com/Slipcast-dev/MindNotes-WebClipper/actions/workflows/ci.yml/badge.svg)](https://github.com/Slipcast-dev/MindNotes-WebClipper/actions/workflows/ci.yml)

A plugin for [MindNotes](https://github.com/Slipcast-dev/MindNotes-Apple-Silicon), a personal knowledge base for Mac.
It saves from Chrome and Safari to a new page:

- **Article** — the main text without menus and ads, with headings, lists, tables, code and images;
- **Selection** — only the selected fragment;
- **Bookmark** — a link card;
- **Screenshot** — the visible part of the tab;
- from the right-click menu — a page, a selection, a link or an image; `⌥⇧S` saves the article without the popup, `⌥⇧M` opens the popup.

The page starts with a source card and your note. You can pick a folder and tags; by default clips go to the “From Browser” folder.

**Download:** [latest release](https://github.com/Slipcast-dev/MindNotes-WebClipper/releases/latest) — the `MindNotes-Web-Clipper-<version>.dmg` image.

## Requirements

macOS 15 Sequoia or later, Apple silicon only; Safari 18+, Chrome and Chromium-based browsers. MindNotes 1.5.0 or
later that runs on this Mac: if it needs a newer macOS, the installer says so.

## Installation

Open **MindNotes Web Clipper.app** and everything else happens by itself:

1. The installer moves itself to Applications (Safari looks for it there).
2. It adds the plugin to MindNotes — MindNotes shows the permissions; click Install.
3. It finds the browsers on this Mac and installs the extension into each of them in turn.
4. The connection to MindNotes almost sets itself up: for 10 minutes after installation the extension asks for a key by itself, and MindNotes asks “Connect?” once and shows who is asking.

What browsers don't let apps do (Apple and Google rules):

- **Safari** — one checkbox: the installer opens Settings → Extensions; turn on MindNotes Web Clipper. The build is ad-hoc signed, so first: Settings → Advanced → “Show features for web developers”, then Develop → “Allow Unsigned Extensions” (Safari resets this on restart; a Developer ID signature makes it permanent).
- **Chrome, Arc, Brave, Edge, Vivaldi, Opera, Yandex Browser** — one drag: the installer opens the extensions page; turn on Developer mode and drag the Web Clipper icon from the installer window. Once the extension is in the Chrome Web Store, this step goes away too: the browser offers to turn it on by itself.

The installer shows the state of each step and ticks off the finished ones. To connect a browser later: MindNotes Settings → Extensions → Connect Browsers.

## Updates

MindNotes checks for plugin updates at launch and once a day. If a new version asks for no new permissions, it installs
by itself (“Update automatically” in the plugin card) and the browser extension restarts by itself. New permissions
need the Update button and a confirmation. The card always has “Check for Updates”.

The plugin is not tied to a MindNotes version: the extension checks what the app can do (`features` in `/v1/status`)
and adapts. `minApp` is set only for an incompatible API change.

## Development

You need macOS 15 or later, Xcode (for the Safari extension; without it use `SKIP_SAFARI=1`) and Node.js 20+.

```bash
./scripts/test.sh                              # tests for the extension, the installer and the API contract
MINDNOTES_DIR=../MindNotes ./scripts/test.sh   # also check the contract against a MindNotes checkout next to it
./scripts/build.sh                             # build/MindNotes Web Clipper.app; SKIP_SAFARI=1 builds without Xcode
```

For checks: `…/WebClipperInstaller --check` prints what it finds on the Mac without changing anything; `--no-auto` opens the window without installing.

### Contract with MindNotes

The plugin does not use MindNotes code. Everything it relies on — the local API address and port, paths, permissions,
`features`, app and installer identifiers — is written down in [`contracts/plugin-api.json`](contracts/plugin-api.json).
The original lives in the MindNotes repository and this is a copy; tests on both sides check against it, and before a
release the script compares the copy with the original on GitHub. When the API changes, the contract changes in
MindNotes first, then the copy here.

### Releasing

The plugin has its own version (`manifest.json`), independent of the MindNotes version.

1. Bump `version` in `manifest.json` **and** `browser/manifest.json`.
2. Move the entries from Unreleased into the version section in `CHANGELOG.md` and `CHANGELOG.ru.md`.
3. Check and release:

```bash
DRY_RUN=1 ./scripts/release.sh   # check and build the image without publishing anything
./scripts/release.sh             # the webclipper-v<version> tag and a GitHub release
```

A release contains the image, `plugin-manifest.json` and `SHA256SUMS.txt`. MindNotes before 1.7.0 doesn't know the
`repository` field and looks for plugin releases in the app repository, so the script also puts a copy of the release
there, marked “not latest” (otherwise MindNotes wouldn't find its own updates). `MIRROR_TO_APP_REPO=0` skips the copy
once no older MindNotes versions are left.

## How it works

```text
Installer/              the installer app (SwiftUI): browsers, MindNotes, Safari, the Chromium hint
browser/manifest.json   Manifest V3, shared by Chrome and Safari
browser/extract.js      article extraction and HTML → Markdown right on the page (no external libraries)
browser/background.js   menus, shortcuts, screenshot, images, sending, self-connection
browser/api.js          local API client: 127.0.0.1:27183, the key in chrome.storage.local
browser/popup.*         the popup: mode, title, folder, tags, note
browser/_locales/       extension texts: English and Russian
manifest.json           the plugin manifest for MindNotes: permissions, components, where updates come from
contracts/              a copy of the API contract with MindNotes
scripts/                build, tests, release
tests/                  tests (node --test)
```

The Chromium extension lives in `~/Library/Application Support/MindNotes Web Clipper/chrome`; the Safari extension lives inside the installer. The extension has permanent access only to `127.0.0.1`. The browser downloads the page's own images, and MindNotes downloads images from other sites (CDNs) by URL, so the extension needs no access to all sites.

Security: plugin code never runs inside MindNotes; MindNotes accepts requests only from extension pages, only with a
key issued after your consent, and only within the permissions in `manifest.json`. Details: ADR-0019 in the MindNotes
repository and [SECURITY.md](SECURITY.md).

## License

[LICENSE](LICENSE) — the same terms as MindNotes.
