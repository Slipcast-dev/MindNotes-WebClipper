'use strict';
// Копия договора об API (contracts/plugin-api.json) совместима с оригиналом в репозитории MindNotes.
// Оригинал берётся из соседней папки (MINDNOTES_DIR) или, при CHECK_UPSTREAM=1, с GitHub; без них тест пропускается.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const copy = JSON.parse(fs.readFileSync(path.join(root, 'contracts/plugin-api.json'), 'utf8'));
const plugin = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

async function upstream() {
  if (process.env.MINDNOTES_DIR) {
    return JSON.parse(fs.readFileSync(path.join(process.env.MINDNOTES_DIR, 'contracts/plugin-api.json'), 'utf8'));
  }
  if (process.env.CHECK_UPSTREAM !== '1') return null;
  const url = `https://raw.githubusercontent.com/${copy.app.repository}/personal-ru/contracts/plugin-api.json`;
  const response = await fetch(url, { cache: 'no-store' });
  assert.ok(response.ok, `${url}: HTTP ${response.status}`);
  return response.json();
}

test('копия договора совместима с MindNotes', async (t) => {
  const original = await upstream();
  if (!original) return t.skip('нет MINDNOTES_DIR и CHECK_UPSTREAM=1');
  assert.strictEqual(original.contract, copy.contract, 'формат договора');
  for (const key of ['api', 'host', 'port']) assert.strictEqual(original[key], copy[key], key);
  assert.deepStrictEqual(original.app, copy.app, 'идентификаторы MindNotes');
  for (const p of plugin.permissions) assert.ok(original.permissions.includes(p), `MindNotes знает разрешение ${p}`);
  for (const f of copy.features) assert.ok(original.features.includes(f), `MindNotes умеет ${f}`);
  for (const r of copy.routes) {
    assert.ok(original.routes.some((o) => o.method === r.method && o.path === r.path && o.permission === r.permission), `${r.method} ${r.path}`);
  }
  assert.deepStrictEqual(original.plugins[plugin.id], copy.plugins[plugin.id], 'запись плагина в договоре');
});
