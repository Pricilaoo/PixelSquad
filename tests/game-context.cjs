const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {parseHTML} = require('linkedom');
const source = fs.readFileSync(path.join(__dirname, '../extension/game-context.js'), 'utf8');
function fixture(parent = null) {
  const {window} = parseHTML('<html><body><h1>Hotel</h1></body></html>');
  delete window.PixelSquadGame;
  Object.defineProperty(window, 'parent', {value: parent || window, configurable: true});
  let observer, observing = false; const changes = [], sent = [];
  window.addEventListener('pixelsquad-game-change', event => changes.push(event.detail.active));
  const context = vm.createContext({window, document: window.document, URL, CustomEvent: window.CustomEvent, queueMicrotask,
    MutationObserver: class {constructor(callback) {observer = callback;} observe() {observing = true;} disconnect() {observing = false;}}});
  vm.runInContext(source, context);
  const message = (sender, origin, data) => {
    const event = new window.Event('message'); Object.assign(event, {source: sender, origin, data: {source: 'pixelsquad', ...data}}); window.dispatchEvent(event);
  };
  const frame = () => {
    const element = window.document.createElement('iframe'), child = {postMessage: data => sent.push(data)};
    Object.defineProperty(element, 'contentWindow', {value: child}); window.document.body.append(element);
    return {element, child};
  };
  return {window, document: window.document, changes, sent, message, frame, observer: records => observer(records), observing: () => observing};
}
(async () => {
  const f = fixture(), game = f.window.PixelSquadGame;
  assert.equal(game.active, false); assert.deepEqual(f.changes, []);
  const toolbar = f.document.createElement('div'); toolbar.className = 'nitro-toolbar'; f.document.body.append(toolbar);
  f.observer([{type: 'childList', addedNodes: [toolbar]}]); await Promise.resolve();
  assert.equal(game.active, true); assert.deepEqual(f.changes, [true]);
  f.observer([{type: 'childList', addedNodes: []}]); await Promise.resolve(); assert.deepEqual(f.changes, [true]);
  toolbar.remove(); f.observer([{type: 'childList', removedNodes: [toolbar]}]); await Promise.resolve();
  assert.equal(game.active, false);
  const frame = f.frame(); game.refresh(); assert.equal(f.sent.at(-1).type, 'PS_GAME_CONTEXT_QUERY');
  f.message({}, 'https://game.habblet.city', {type: 'PS_GAME_CONTEXT', active: true}); assert.equal(game.active, false);
  f.message(frame.child, 'https://habblet.city.example.com', {type: 'PS_GAME_CONTEXT', active: true}); assert.equal(game.active, false);
  f.message(frame.child, 'http://game.habblet.city', {type: 'PS_GAME_CONTEXT', active: true}); assert.equal(game.active, false);
  f.message(frame.child, 'https://game.habblet.city', {type: 'PS_GAME_CONTEXT', active: 'true'}); assert.equal(game.active, false);
  f.message(frame.child, 'https://game.habblet.city', {type: 'PS_GAME_CONTEXT', active: true}); assert.equal(game.active, true);
  const second = f.frame(); game.refresh();
  f.message(second.child, 'https://nitro.habblet.city', {type: 'PS_GAME_CONTEXT', active: true});
  f.message(frame.child, 'https://game.habblet.city', {type: 'PS_GAME_CONTEXT', active: false}); assert.equal(game.active, true);
  second.element.remove(); game.refresh(); assert.equal(game.active, false);
  f.message(second.child, 'https://nitro.habblet.city', {type: 'PS_GAME_CONTEXT', active: true}); assert.equal(game.active, false);
  f.message(frame.child, 'https://game.habblet.city', {type: 'PS_GAME_CONTEXT', active: true});
  frame.element.setAttribute('src', 'https://www.habblet.city/news');
  f.observer([{type: 'attributes', target: frame.element, attributeName: 'src'}]); await Promise.resolve();
  assert.equal(game.active, false);
  f.message(frame.child, 'https://game.habblet.city', {type: 'PS_GAME_CONTEXT', active: true}); assert.equal(game.active, false);
  frame.element.dispatchEvent(new f.window.Event('load')); assert.equal(f.sent.at(-1).type, 'PS_GAME_CONTEXT_QUERY');
  f.message(frame.child, 'https://www.habblet.city', {type: 'PS_GAME_CONTEXT', active: false}); assert.equal(game.active, false);
  f.message(frame.child, 'https://game.habblet.city', {type: 'PS_GAME_CONTEXT', active: true}); assert.equal(game.active, true);
  f.window.dispatchEvent(new f.window.Event('pagehide')); assert.equal(game.active, false); assert.equal(f.observing(), false);
  f.message(frame.child, 'https://game.habblet.city', {type: 'PS_GAME_CONTEXT', active: true}); assert.equal(game.active, false);
  f.window.dispatchEvent(new f.window.Event('pageshow')); assert.equal(game.active, true); assert.equal(f.observing(), true);
  frame.element.remove(); f.observer([{type: 'childList', removedNodes: [frame.element]}]); await Promise.resolve(); assert.equal(game.active, false);
  const announcements = [], parent = {postMessage: data => announcements.push(data)}, child = fixture(parent);
  assert.equal(announcements.at(-1).active, false);
  child.document.body.insertAdjacentHTML('beforeend', '<div class="nitro-toolbar"></div>'); child.window.PixelSquadGame.refresh();
  assert.equal(announcements.at(-1).active, true);
  const count = announcements.length;
  child.message({}, 'https://www.habblet.city', {type: 'PS_GAME_CONTEXT_QUERY'}); assert.equal(announcements.length, count);
  child.message(parent, 'https://www.habblet.city', {type: 'PS_GAME_CONTEXT_QUERY'}); assert.equal(announcements.length, count + 1);
  child.window.dispatchEvent(new child.window.Event('pagehide')); assert.equal(announcements.at(-1).active, false);
  child.window.dispatchEvent(new child.window.Event('pageshow')); assert.equal(announcements.at(-1).active, true);
  console.log('PASS: game-only visibility, DOM enter/exit, trusted direct iframe presence, multiple frames, iframe navigation/removal, parent handshake and page lifecycle');
})().catch(error => {console.error(error); process.exitCode = 1;});
