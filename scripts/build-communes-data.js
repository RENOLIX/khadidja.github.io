// Build the static commune snapshot from HTML responses of the existing
// authenticated Apps Script relay. Usage: node scripts/build-communes-data.js <response-directory>
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error('Provide the directory containing 1.html through 58.html.');

const communesByWilaya = {};
let total = 0;
for (let wilaya = 1; wilaya <= 58; wilaya++) {
  const page = fs.readFileSync(path.join(sourceDirectory, `${wilaya}.html`), 'utf8');
  const wrapper = page.match(/goog\.script\.init\(("(?:\\.|[^"\\])*")/);
  if (!wrapper) throw new Error(`Missing Apps Script wrapper for wilaya ${wilaya}.`);
  const html = JSON.parse(vm.runInNewContext(wrapper[1], Object.create(null), {timeout: 1000})).userHtml;
  const embedded = html?.match(/var p=([\s\S]*?);var t=/);
  if (!embedded) throw new Error(`Missing commune payload for wilaya ${wilaya}.`);
  const response = JSON.parse(embedded[1]);
  if (!response.ok) {
    // Yalidine currently reports no deliverable communes in these two wilayas.
    if (![50, 54].includes(wilaya) || response.error !== 'Aucune commune livrable pour cette wilaya.') {
      throw new Error(`Unexpected Yalidine response for wilaya ${wilaya}: ${response.error}`);
    }
    communesByWilaya[wilaya] = [];
    continue;
  }
  if (!Array.isArray(response.communes)) throw new Error(`Invalid commune list for wilaya ${wilaya}.`);
  const seen = new Set();
  communesByWilaya[wilaya] = response.communes.map(commune => {
    const item = {id: Number(commune.id), name: String(commune.name), wilaya: String(commune.wilaya), wilayaId: Number(commune.wilayaId)};
    if (!Number.isInteger(item.id) || item.wilayaId !== wilaya || !item.name || seen.has(item.id)) {
      throw new Error(`Invalid or duplicate commune in wilaya ${wilaya}.`);
    }
    seen.add(item.id);
    return item;
  });
  total += seen.size;
}
if (total < 1400) throw new Error(`Incomplete Yalidine commune snapshot (${total}).`);
const output = [
  '// Snapshot of deliverable communes from Yalidine API on 2026-09-29.',
  '// Geography loads immediately; delivery fees still come from the live secure relay.',
  `window.KB_COMMUNES = ${JSON.stringify(communesByWilaya)};`,
  ''
].join('\n');
fs.writeFileSync(path.join(__dirname, '..', 'communes-data.js'), output);
console.log(`Saved ${total} communes across 58 wilayas.`);
