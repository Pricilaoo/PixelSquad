const {parseHTML} = require('linkedom');
const vm = require('vm'), fs = require('fs'), assert = require('assert');
const root = require('path').join(__dirname, '../extension');
const {window} = parseHTML('<html><body></body></html>');
delete window.PixelSquadAvatar;
window.HTMLElement.prototype.focus = function() {};
const storage = new Map(), copied = [], sent = [], timers = new Map(); let id = 0;
const catalog = {palettes: [{id: 1, colors: [{id: 1, selectable: true, club: 0}, {id: 2, selectable: true, club: 0}, {id: 3, selectable: true, club: 1}]}],
 setTypes: ['hd','hr','ch','lg','sh','ha'].map((type, i) => ({type, paletteId: 1, sets: [
  {id: 100 + i, gender: 'U', selectable: true, club: 0, colorable: true},
  {id: 200 + i, gender: 'U', selectable: true, club: 0, colorable: true},
  {id: 300 + i, gender: 'M', selectable: true, club: 1},
  {id: 400 + i, gender: 'F', selectable: true, sellable: true},
  {id: 500 + i, gender: 'F', selectable: false}
 ]}))};
window.postMessage = data => {
 sent.push(data);
 const event = new window.Event('message');
 Object.assign(event, {source: window, origin: 'https://www.habblet.city', data: {
  source: 'pixelsquad-avatar-result', requestId: data.requestId,
  result: data.type === 'catalog' ? {catalog} : {url: 'data:image/png;base64,aGVsbG8='}
 }});
 window.dispatchEvent(event);
};
const ctx = vm.createContext({window, document: window.document, location: {origin: 'https://www.habblet.city'},
 localStorage: {getItem: key => storage.get(key), setItem: (key, val) => storage.set(key, val)},
 navigator: {clipboard: {writeText: async value => copied.push(value)}},
 setTimeout: f => {timers.set(++id, f); return id;}, clearTimeout: n => timers.delete(n), console});
vm.runInContext(fs.readFileSync(root + '/avatar-generator.js', 'utf8'), ctx);
for (let n = 0; n < 100; n++) for (const gender of ['M','F']) {
 const result = window.PixelSquadAvatar.generate(catalog, gender);
 for (const required of ['hd','hr','ch','lg','sh']) assert(result.figure.includes(required + '-'));
 for (const part of result.figure.split(/\.(?=[a-z]{2}-)/)) {
  const ids = part.split('-')[1].split('.').map(Number);
  assert(ids[0] >= 100 && ids[0] < 300); assert(ids.slice(1).every(x => x === 1 || x === 2));
 }
}
assert.throws(() => window.PixelSquadAvatar.generate({setTypes: [{type:'hd',sets:[]}], palettes:[]}, 'M'), /suficientes/);
async function flush() {for (let n = 0; n < 12; n++) await Promise.resolve();}
(async () => {
 window.PixelSquadAvatar.open(); await flush();
 const panel = window.document.querySelector('#pixelsquad-avatar-generator'); assert(panel);
 const first = panel.querySelector('textarea').value; assert(first);
 window.PixelSquadAvatar.open(); assert.equal(window.document.querySelectorAll('#pixelsquad-avatar-generator').length, 1);
 panel.querySelector('[data-action=generate]').click(); await flush();
 const second = panel.querySelector('textarea').value; assert.notEqual(second, first);
 panel.querySelector('[data-action=previous]').click(); await flush(); assert.equal(panel.querySelector('textarea').value, first);
 panel.querySelector('[data-action=next]').click(); await flush(); assert.equal(panel.querySelector('textarea').value, second);
 panel.querySelector('[data-action=copy]').click(); await flush(); assert.equal(copied[0], second);
 assert.equal(JSON.parse(storage.get('pixelsquad_avatar_history')).length, 2);
 assert(sent.every(x => x.type === 'catalog' || x.type === 'preview')); assert.equal(timers.size, 0);
 panel.querySelector('[data-action=close]').click(); assert(!window.document.querySelector('#pixelsquad-avatar-generator'));
 console.log('PASS: game catalog generation, free/selectable/gender constraints, independent preview, history, navigation, copy and close');
})().catch(error => {console.error(error);process.exitCode = 1;});
