'use strict';
// Web Clipper: описание пакета и расширения согласованы, переводы полные, метки картинок. С MindNotes плагин сверяется
// по договору об API (contracts/plugin-api.json — копия из репозитория приложения), а не по её коду.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = root;
const json = (p) => JSON.parse(fs.readFileSync(path.join(dir, p), 'utf8'));
const read = (p) => fs.readFileSync(path.join(dir, p), 'utf8');
const contract = json('contracts/plugin-api.json');

test('версии и id плагина и расширения согласованы', () => {
  const plugin = json('manifest.json');
  const browser = json('browser/manifest.json');
  assert.strictEqual(plugin.kind, 'plugin');
  assert.strictEqual(plugin.version, browser.version);
  assert.strictEqual(plugin.api, 1);
  assert.strictEqual(plugin.author, 'MindNotes', 'в настройках плагин подписан именем приложения');
  assert.ok(read('browser/api.js').includes(`const MN_PLUGIN = '${plugin.id}'`), 'расширение называет себя id плагина');
});

test('разрешения плагина известны приложению, порт один и тот же', () => {
  const plugin = json('manifest.json');
  for (const p of plugin.permissions) assert.ok(contract.permissions.includes(p), p);
  assert.ok(plugin.api <= contract.api, 'API плагина понятен MindNotes');
  assert.ok(read('browser/api.js').includes(`const MN_API = 'http://${contract.host}:${contract.port}'`));
  assert.deepStrictEqual(json('browser/manifest.json').host_permissions, ['http://127.0.0.1/*'], 'постоянный доступ — только к MindNotes');
});

test('файлы из манифеста расширения на месте (значки кладёт сборка)', () => {
  const m = json('browser/manifest.json');
  for (const f of [m.action.default_popup, m.background.service_worker, 'api.js', 'extract.js', 'popup.js', 'popup.css']) {
    assert.ok(fs.existsSync(path.join(dir, 'browser', f)), f);
  }
  assert.ok(read('scripts/build.sh').includes('icon-$size.png'));
});

test('переводы ru и en полные, все ключи из кода есть', () => {
  const ru = json('browser/_locales/ru/messages.json');
  const en = json('browser/_locales/en/messages.json');
  assert.deepStrictEqual(Object.keys(ru).sort(), Object.keys(en).sort());
  const code = ['popup.html', 'popup.js', 'background.js', 'api.js', 'manifest.json'].map((f) => read('browser/' + f)).join('\n');
  const used = new Set([...code.matchAll(/(?:data-i18n(?:-placeholder)?="|\bt\('|getMessage\('|__MSG_)([A-Za-z0-9]+)/g)].map((m) => m[1]));
  for (const key of used) assert.ok(ru[key], key);
});

test('метки картинок: скачанные — вложения, с других сайтов — скачает MindNotes, data: — подпись', () => {
  const { mnPlaceImages } = require(path.join(dir, 'browser/extract.js'));
  const md = 'А\n\n![Схема](mnimg-1)\n\n![](mnimg-2)\n\n![Встроенная](mnimg-3)';
  const sources = [{ src: 'https://a.com/1.png' }, { src: 'https://cdn.com/x(1).jpg' }, { src: 'data:image/png;base64,AAAA' }];
  const out = mnPlaceImages(md, sources, [{ name: 'clip-1.png' }, null, null], 'Картинка');
  assert.strictEqual(out.markdown, 'А\n\n![Схема](clip-1.png)\n\n![](remote-2.img)\n\nВстроенная', 'картинку с CDN скачает MindNotes');
  assert.deepStrictEqual(out.remote, [{ name: 'remote-2.img', url: 'https://cdn.com/x(1).jpg' }]);
  const off = mnPlaceImages(md, sources, [], 'Картинка', false);
  assert.strictEqual(off.markdown, 'А\n\n[Схема](https://a.com/1.png)\n\n[Картинка](https://cdn.com/x%281%29.jpg)\n\nВстроенная', 'без «Сохранять картинки» — ссылки');
  assert.deepStrictEqual(off.remote, []);
});

test('установщик: идентификаторы MindNotes, Safari и типа пакета согласованы', () => {
  const browsers = read('Installer/Browsers.swift');
  const build = read('scripts/build.sh');
  const container = /BUNDLE_ID=(\S+)/.exec(build)[1];
  const mine = contract.plugins[json('manifest.json').id];
  assert.ok(mine, 'плагин записан в договоре');
  assert.strictEqual(/mindNotesBundleID = "([^"]+)"/.exec(browsers)[1], contract.app.bundleID, 'установщик ищет ту же MindNotes');
  assert.ok(/safariExtensionID = "([^"]+)"/.exec(browsers)[1].startsWith(container + '.'), 'id расширения Safari начинается с id программы');
  assert.strictEqual(container, mine.installerBundleID, 'MindNotes находит установщик');
  const uti = /"UTTypeIdentifier"\] as\? String\) == "([^"]+)"/.exec(browsers)[1];
  assert.strictEqual(uti, contract.app.pluginTypeIdentifier, 'проверка поддержки плагинов смотрит на объявленный тип');
  assert.ok(browsers.includes(`forKey: "${contract.app.pluginClientsDefaultsKey}"`), 'подключения браузеров — там, где их хранит MindNotes');
});

test('самонастройка: расширение подключается само только в окне автоподключения', () => {
  const api = read('browser/api.js');
  const bg = read('browser/background.js');
  assert.ok(/pair\(true\)/.test(api) && /status\.pairing/.test(api), 'тихая привязка только когда MindNotes открыл окно');
  assert.ok(/chrome\.alarms\.create\('mn-pair'/.test(bg) && /onInstalled\.addListener\(\(\) => \{\s*ensurePaired\(\)/.test(bg));
  assert.ok(json('browser/manifest.json').permissions.includes('alarms'));
});

test('окно расширения: скрытые панели не показываются, даже если у них свой display', () => {
  const css = read('browser/popup.css');
  assert.ok(/\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/.test(css), 'без этого правила окно показывает все состояния сразу');
  const html = read('browser/popup.html');
  for (const id of ['offline', 'unpaired', 'noWorkspace', 'clip', 'done', 'error']) {
    assert.ok(new RegExp(`id="${id}"[^>]*hidden`).test(html), `${id} скрыт до проверки`);
  }
});

test('автоподключение идёт только из фона и по одному запросу', () => {
  const bg = read('browser/background.js');
  assert.ok(/pairing = pairing \|\| mnAPI\.autoPair\(\)/.test(bg), 'одна попытка за раз');
  assert.ok(!/mnAPI\.autoPair\(/.test(read('browser/popup.js')), 'окно не подключается само, а просит фон');
});

test('окно расширения прячет панели и стилем из кода, а не только атрибутом', () => {
  const js = read('browser/popup.js');
  assert.ok(/el\.style\.display = visible \? '' : 'none'/.test(js), 'скрытие не зависит от таблицы стилей');
  assert.ok(!/\.hidden = /.test(js.replace(/el\.hidden = !visible/, '')), 'все показы и скрытия идут через setVisible');
  const html = read('browser/popup.html');
  for (const id of ['offline', 'unpaired', 'noWorkspace', 'clip', 'done', 'error']) {
    assert.ok(new RegExp(`id="${id}"[^>]*style="display:none"`).test(html), `${id} скрыт до проверки состояния`);
  }
});

test('выпуски плагина отдельно от приложения и не мешают его обновлениям', () => {
  const plugin = json('manifest.json');
  assert.strictEqual(plugin.updates, contract.plugins[plugin.id].updates, 'свой префикс тегов');
  for (const log of ['CHANGELOG.md', 'CHANGELOG.ru.md']) assert.ok(read(log).includes(`## [${plugin.version}]`), `у текущей версии есть запись в ${log}`);
  const release = read('scripts/release.sh');
  assert.ok(release.includes('--latest=false'), 'выпуск плагина не становится «последним»: по нему MindNotes ищет свои обновления');
  assert.ok(/minApp/.test(release) && /releases\/latest/.test(release), 'плагин не выходит раньше подходящей MindNotes');
  assert.ok(/<!-- minApp: %s -->/.test(release), 'MindNotes узнаёт совместимость из описания выпуска');
  const bg = read('browser/background.js');
  assert.ok(/chrome\.runtime\.reload\(\)/.test(bg) && /cache: 'no-store'/.test(bg), 'расширение подхватывает новую версию с диска само');
});

test('расширению не нужен доступ ко всем сайтам', () => {
  const m = json('browser/manifest.json');
  assert.ok(!m.optional_host_permissions && !(m.permissions || []).includes('<all_urls>'), 'картинки с других сайтов скачивает MindNotes');
  assert.ok(!/permissions\.request/.test(read('browser/popup.js')));
  assert.ok(/body\.remoteImages = placed\.remote/.test(read('browser/background.js')));
});

test('плагин обновляется независимо от версии MindNotes', () => {
  const api = read('browser/api.js');
  const bg = read('browser/background.js');
  assert.ok(/features: mnFeatures/.test(api), 'расширение спрашивает возможности MindNotes');
  assert.ok(/let list = \['clips', 'targets', 'openPage'\]/.test(api), 'старая MindNotes без списка — только базовое');
  assert.ok(/includes\('remoteImages'\)/.test(bg), 'картинки с CDN — только если MindNotes умеет');
  const release = read('scripts/release.sh');
  assert.ok(/plugin-manifest\.json/.test(release) && /shasum -a 256 "\$DMG" plugin-manifest\.json/.test(release), 'описание плагина в выпуске и в суммах');
  assert.ok(/minApp=""/.test(release), 'minApp необязателен');
  for (const f of ['clips', 'targets', 'openPage', 'remoteImages']) assert.ok(contract.features.includes(f), f);
});

test('установщик умеет тихое обновление для MindNotes', () => {
  const app = read('Installer/InstallerApp.swift');
  assert.ok(/contains\("--update"\)/.test(app) && /syncChromeFolder/.test(app) && /exit\(/.test(app), 'без окна обновить файлы и выйти');
});

test('свой репозиторий; копия выпуска для MindNotes до 1.7.0', () => {
  const plugin = json('manifest.json');
  assert.strictEqual(plugin.repository, contract.plugins[plugin.id].repository, 'MindNotes ищет выпуски здесь');
  const release = read('scripts/release.sh');
  assert.ok(/extract repository raw/.test(release), 'скрипт берёт репозиторий из описания плагина');
  const copies = read('scripts/app-copies.sh');
  assert.ok(/source scripts\/app-copies\.sh/.test(release) && /copies_no_longer_needed/.test(release), 'копия делается по правилу, а не вручную');
  assert.ok(/MIRROR_TO_APP_REPO=1/.test(release), 'пока MindNotes до 1.7.0 есть — копия по умолчанию');
  assert.ok(/COPIES_UNTIL_APP=1\.7\.0/.test(copies) && /COPIES_GRACE_DAYS:-60/.test(copies), 'копии нужны до 60 дней после MindNotes 1.7.0');
  const remove = read('scripts/remove-app-copies.sh');
  assert.ok(/copies_no_longer_needed/.test(remove) && /FORCE/.test(remove), 'копии не удаляются раньше срока');
  assert.ok(/startswith\(\\"\$prefix\\"\)/.test(remove), 'удаляются только выпуски плагина, не MindNotes');
  assert.ok(/read -r "answer\?/.test(remove) && /--yes/.test(remove), 'перед удалением — вопрос');
  assert.ok(/--latest=false --target "\$APP_BRANCH"/.test(release), 'в репозитории приложения выпуск плагина не «последний»');
});

test('плагин поддерживает macOS 15 и новее независимо от минимума MindNotes', () => {
  const build = read('scripts/build.sh');
  assert.ok(/PLUGIN_MIN_MACOS=15\.0/.test(build), 'минимум плагина — macOS 15');
  assert.ok(/-target "\$PLUGIN_TARGET"/.test(build), 'установщик собирается для минимума плагина, а не приложения');
  assert.ok(/<string>\$PLUGIN_MIN_MACOS<\/string>/.test(build), 'LSMinimumSystemVersion установщика');
  assert.ok(/MACOSX_DEPLOYMENT_TARGET="\$PLUGIN_MIN_MACOS"/.test(build) && /ARCHS=arm64/.test(build), 'расширение Safari — macOS 15, только Apple Silicon');
  const browsers = read('Installer/Browsers.swift');
  assert.ok(/static func runsHere/.test(browsers) && /LSMinimumSystemVersion/.test(browsers), 'установщик видит, что MindNotes требует более новую macOS');
  // Safari 18 (macOS 15): новые возможности браузера — только с проверкой наличия.
  const extract = read('browser/extract.js');
  assert.ok(/typeof el\.checkVisibility === 'function'/.test(extract));
  assert.ok(/typeof OffscreenCanvas === 'undefined'/.test(read('browser/background.js')));
});
