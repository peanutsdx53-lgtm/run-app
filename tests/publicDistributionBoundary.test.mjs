import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('Pages excludes development documents, test fixtures, and validation tools', () => {
  const config = read('_config.yml');
  const excluded = new Set([...config.matchAll(/^  - ([^\r\n]+)$/gm)].map(m => m[1]));
  for (const name of ['README.md', 'docs', 'audit', 'tests', 'scripts', 'assets/ASSET_REGISTER.md', 'audit-artifacts', 'test-results', 'node_modules', 'vendor', 'Gemfile', 'Gemfile.lock']) {
    assert.ok(excluded.has(name), 'Missing exclusion: ' + name);
  }
  const assets = JSON.parse(read('sw.js').match(/^const ASSETS=(\[[^\n]*\]);/m)[1]);
  for (const asset of assets) {
    const name = asset.replace(/^\.\//, '').split('?')[0];
    for (const path of excluded) {
      assert.ok(name !== path && !name.startsWith(path + '/'), 'Precache must not reference an excluded path: ' + name);
    }
  }
  assert.ok(assets.includes('./index.html'));
  assert.ok(assets.includes('./app.js'));
  assert.ok(assets.includes('./manifest.webmanifest'));
  assert.ok(assets.includes('./manifest.en.webmanifest'));
});
