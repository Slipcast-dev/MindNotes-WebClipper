'use strict';
// Самообновление расширения в Chrome: фон сверяет версию на диске при каждом пробуждении и раз в 5 минут,
// таймер не переносится пробуждениями, а перезапуск не прерывает сохранение. background.js запускается
// в песочнице vm с поддельным chrome.*.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, '..', 'browser/background.js'), 'utf8');
const tick = () => new Promise((r) => setTimeout(r, 10));

function wake({ running = '1.0.3', onDisk = '1.0.3', alarms = {} } = {}) {
  const calls = { reload: 0, created: [] };
  const listeners = {};
  const on = (name) => ({ addListener: (f) => { listeners[name] = f; } });
  const chrome = {
    runtime: {
      getURL: (p) => 'chrome-extension://x/' + p,
      getManifest: () => ({ version: running }),
      reload: () => { calls.reload += 1; },
      onStartup: on('startup'), onInstalled: on('installed'), onMessage: on('message'),
    },
    alarms: {
      get: async (name) => alarms[name],
      create: (name, info) => { alarms[name] = { name, ...info }; calls.created.push(name); },
      clear: async () => {}, onAlarm: on('alarm'),
    },
    contextMenus: { removeAll: () => {}, create: () => {}, onClicked: on('menu') },
    commands: { onCommand: on('command') },
    i18n: { getMessage: (k) => k },
    storage: { local: { get: async () => ({}) } },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
    tabs: { get: async () => ({}), query: async () => [] },
  };
  let resolveClip;
  const sandbox = {
    chrome, console, setTimeout, clearTimeout, URL, TextEncoder, Promise,
    importScripts: () => {},
    fetch: async () => ({ json: async () => ({ version: onDisk }) }),
    mnAPI: { autoPair: async () => true },
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  // Сохранение, которое ещё идёт: подменяем саму работу, обёртка clip() остаётся настоящей.
  sandbox.clipNow = () => new Promise((r) => { resolveClip = r; });
  return { sandbox, calls, alarms, finishClip: () => resolveClip() };
}

test('таймер проверки ставится один раз и не переносится пробуждениями', async () => {
  const first = wake();
  await tick();
  assert.deepStrictEqual(first.calls.created, ['mn-update']);
  assert.strictEqual(first.alarms['mn-update'].periodInMinutes, 5);
  const again = wake({ alarms: first.alarms });
  await tick();
  assert.deepStrictEqual(again.calls.created, [], 'create() с тем же именем перенёс бы срок');
  const old = wake({ alarms: { 'mn-update': { name: 'mn-update', periodInMinutes: 15 } } });
  await tick();
  assert.deepStrictEqual(old.calls.created, ['mn-update'], 'таймер прежней версии (15 минут) заменяется');
});

test('при пробуждении с новой версией на диске расширение перезапускается само', async () => {
  const same = wake();
  await tick();
  assert.strictEqual(same.calls.reload, 0);
  const updated = wake({ running: '1.0.2', onDisk: '1.0.3' });
  await tick();
  assert.strictEqual(updated.calls.reload, 1);
});

test('перезапуск ждёт конца сохранения', async () => {
  const w = wake({ running: '1.0.2', onDisk: '1.0.2' });
  await tick();
  const saving = w.sandbox.clip({}, {});
  w.sandbox.fetch = async () => ({ json: async () => ({ version: '1.0.3' }) });
  await w.sandbox.reloadIfUpdated();
  assert.strictEqual(w.calls.reload, 0, 'во время вырезки не перезапускается');
  w.finishClip();
  await saving;
  await tick();
  assert.strictEqual(w.calls.reload, 1, 'после вырезки — перезапуск');
});
