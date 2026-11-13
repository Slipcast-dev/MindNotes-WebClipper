# Web Clipper — changelog

**English** · [Русский](CHANGELOG.ru.md)

Plugin versions do not depend on the MindNotes version. Releases are `webclipper-v<version>` tags in this repository
(`./scripts/release.sh`); up to and including 1.0.1 they were published in the MindNotes repository. The number goes up
with **every** release: that is how the installer and MindNotes know the plugin and extensions need updating.

## [Unreleased]

### Fixed
- Safari no longer shows the extension twice when a new version of the installer is put into Applications while an older one stays in ~/Applications (or the other way round): on launch, the installer moves its older copies to the Trash and unregisters copies elsewhere.

### Changed
- Release copies in the MindNotes repository are made until 60 days after MindNotes 1.7.0 is released; after that `./scripts/remove-app-copies.sh` removes them.

## [1.0.2] - 2026-11-13

Works with MindNotes 1.5.0 or later. The first release from this repository; it installs as a regular update, without questions, because the permissions have not changed.

### Added
- macOS 15 Sequoia and later: the installer and the Safari extension are built for macOS 15, regardless of the MindNotes minimum. The installer says so if the MindNotes on this Mac needs a newer macOS.

### Changed
- The plugin moved to its own repository, `Slipcast-dev/MindNotes-WebClipper`, with README in English and Russian. The plugin manifest has a `repository` field: MindNotes 1.7.0 and later looks for updates here. Every release is still copied to the MindNotes repository, so older MindNotes versions keep updating the plugin too.
- Installer and README texts: the browser connects by itself, but MindNotes asks for permission once (as of MindNotes 1.6.0).

## [1.0.1] - 2026-11-13

Works with any MindNotes 1.5.0 or later: the extension checks what the app can do and adapts. From MindNotes 1.5.2, images from other sites are saved as attachments, and later plugin versions install themselves.

### Changed
- Images from other sites (CDNs) are saved as attachments: MindNotes downloads them if it can (otherwise they stay links). The extension no longer asks for access to all sites.
- The release includes `plugin-manifest.json`: a MindNotes with independent updates installs the new version by itself if the permissions have not changed.

## [1.0.0] - 2026-11-12

First release. Requires MindNotes 1.5.0 or later.

### Added
- Saving an article, a selection, a bookmark, a screenshot or an image from Chrome and Safari to a new MindNotes page: source card, note, folder and tags.
- The `MindNotes Web Clipper.app` installer: moves itself to Applications, adds the plugin to MindNotes and the extension to the browsers it finds; the connection to MindNotes sets itself up.
- Auto-update: MindNotes looks for `webclipper-v…` releases once a day; the update is installed with the Update button in the plugin settings; the browser extension restarts by itself after an update.
