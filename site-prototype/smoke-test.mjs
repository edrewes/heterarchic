import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const script = html.match(/<script>([\\s\\S]*?)<\\/script>/i)?.[1];
assert.ok(script, 'prototype has an inline script');
new vm.Script(script, { filename: 'site-prototype/index.html' });

const caseMapText = script.match(/const cases\\s*=\\s*(\\{[\\s\\S]*?\\n\\};)/)?.[1];
assert.ok(caseMapText, 'prototype defines its case data map');
const cases = vm.runInNewContext(`(${caseMapText.slice(0, -1)})`);
const caseKeys = Object.keys(cases);
const tabKeys = [...html.matchAll(/class="case-tab"[^>]*data-case="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(tabKeys, caseKeys, 'case tabs and case data use the same keys in the same order');
assert.equal(new Set(tabKeys).size, tabKeys.length, 'case keys are unique');

const ids = [...html.matchAll(/\\sid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs are unique');
for (const match of html.matchAll(/<button\\b[^>]*\\brole="tab"[^>]*>/g)) {
  const tag = match[0];
  const id = tag.match(/\\bid="([^"]+)"/)?.[1];
  assert.ok(id, 'each case tab has an ID');
  assert.match(tag, /\\baria-controls="case-panel"/, `${id} controls the case panel`);
  assert.equal(cases[tag.match(/data-case="([^"]+)"/)?.[1]]?.tab, id, `${id} is associated with its case data`);
}

assert.match(html, /<div\\s+class="case-tabs"[^>]*role="tablist"/, 'case tabs have a tablist');
assert.match(html, /id="case-panel"[^>]*role="tabpanel"/, 'the case panel has a tabpanel role');
assert.match(script, /ArrowLeft[\\s\\S]*ArrowRight[\\s\\S]*Home[\\s\\S]*End/, 'case tabs support arrow and boundary-key navigation');

for (const tag of html.matchAll(/<a\\b[^>]*target="_blank"[^>]*>/g)) {
  assert.match(tag[0], /\\brel="[^"]*noreferrer[^"]*"/, 'new-tab links suppress referrer data');
}

console.log(`PASS: script syntax; ${caseKeys.length} case tabs and data entries; unique IDs; tab semantics; keyboard hooks; external-link referrer safeguards.`);
