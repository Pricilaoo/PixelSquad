const assert = require('assert'), fs = require('fs'), vm = require('vm');
const {parseHTML} = require('linkedom');
const root = require('path').join(__dirname, '../extension');
function packet(header, id) {
  const b = new ArrayBuffer(id === undefined ? 6 : 10), v = new DataView(b);
  v.setUint32(0, b.byteLength - 4); v.setUint16(4, header);
  if (id !== undefined) v.setInt32(6, id);
  return b;
}
let now = 0, visible = true, game = true;
const events = {}, ticks = new Map(), messages = []; let counter = 0;
class Socket {
  static OPEN = 1;
  constructor() { this.readyState = 1; this.sent = []; this.listeners = {}; }
  send(data) { if (this.readyState !== 1) throw new Error('closed'); this.sent.push(data); return 'native-return'; }
  addEventListener(type, f) { (this.listeners[type] ||= []).push(f); }
  emit(type, data) { for (const f of this.listeners[type] || []) f({data}); }
}
const win = {WebSocket: Socket, addEventListener: (type, f) => events[type] = f, postMessage: data => messages.push(data)};
const context = vm.createContext({window: win, document: {get hidden() {return !visible}, querySelector: () => game},
  location: {origin: 'https://www.habblet.city'}, performance: {now: () => now}, ArrayBuffer, Uint8Array, DataView, Blob,
  Proxy, Reflect, URL, setInterval: f => {ticks.set(++counter, f); return counter}, clearInterval: id => ticks.delete(id)});
vm.runInContext(fs.readFileSync(root + '/performance-bridge.js', 'utf8'), context);
const tick = () => [...ticks.values()].forEach(f => f());
const unrelated = new win.WebSocket(); unrelated.send(packet(123)); tick(); assert.equal(unrelated.sent.length, 1);
const s = new win.WebSocket(); assert(s instanceof Socket); assert.equal(win.WebSocket.OPEN, 1);
s.emit('message', packet(3928)); assert.equal(s.send(packet(2596)), 'native-return');
tick(); assert.equal(s.sent.length, 2);
const request = new DataView(s.sent[1]); assert.equal(request.getUint16(4), 295);
now = 42; s.emit('message', packet(10, request.getInt32(6) + 1)); assert.equal(messages.at(-1).ping, null);
s.emit('message', packet(10, request.getInt32(6))); assert.equal(messages.at(-1).ping, 42);
visible = false; tick(); assert.equal(s.sent.length, 2); visible = true;
tick(); now += 10001; tick(); assert.equal(messages.at(-1).status, 'unavailable');
now += 10001; tick(); now += 10001; tick(); const count = s.sent.length; tick(); assert.equal(s.sent.length, count);
s.readyState = 3; s.emit('close'); assert.equal(messages.at(-1).status, 'disconnected');
assert.throws(() => s.send(packet(1)), /closed/);
events.pagehide(); assert.equal(ticks.size, 0); events.pageshow(); assert.equal(ticks.size, 1);
// Blob decoding can complete after native pong was already sent.
const reconnect = new win.WebSocket(); reconnect.send(packet(2596)); reconnect.emit('message', packet(3928));
tick(); assert.equal(reconnect.sent.length, 2);
events.message({source:win,origin:'https://www.habblet.city',data:{source:'pixelsquad',type:'PS_OPEN_CREATOR'}});
const profile = new DataView(reconnect.sent.at(-1));
assert.equal(profile.getUint16(4),2249); assert.equal(profile.getUint16(6),9);
assert.equal(String.fromCharCode(...new Uint8Array(reconnect.sent.at(-1),8)),'Pricilao.');
const profileCount = reconnect.sent.length;
events.message({source:{},origin:'https://other.example',data:{source:'pixelsquad',type:'PS_OPEN_CREATOR'}});
assert.equal(reconnect.sent.length,profileCount);
console.log('PASS: correlated game RTT, unknown socket isolation, native socket semantics, timeout, hidden page and reconnection');

const {window: dom} = parseHTML('<html><body><div class="nitro-toolbar"></div></body></html>');
delete dom.__PIXELSQUAD_PERFORMANCE_HUD__;
const callbacks = new Map(), hudTicks = new Map(); let rafId = 0, intervalId = 0, hidden = false;
Object.defineProperty(dom.document, 'hidden', {get: () => hidden});
const hudContext = vm.createContext({window: dom, document: dom.document, location: {origin: 'https://www.habblet.city'},
  performance: {now: () => now}, requestAnimationFrame: f => {callbacks.set(++rafId, f); return rafId},
  cancelAnimationFrame: id => callbacks.delete(id), setInterval: f => {hudTicks.set(++intervalId, f); return intervalId},
  clearInterval: id => hudTicks.delete(id)});
now = 0; vm.runInContext(fs.readFileSync(root + '/performance-hud.js', 'utf8'), hudContext);
function frame(time) {now = time; const [id, f] = callbacks.entries().next().value; callbacks.delete(id); f(time);}
for (let i = 0; i <= 60; i++) frame(i * 1000 / 60);
const hud = dom.document.querySelector('#pixelsquad-performance'); assert.equal(hud.firstChild.textContent, 'FPS 60');
const event = new dom.Event('message'); Object.assign(event, {source: dom, origin: 'https://www.habblet.city',
  data: {source: 'pixelsquad-performance', ping: 42, status: 'connected'}}); dom.dispatchEvent(event);
assert.equal(hud.lastChild.textContent, 'Ping 42 ms • Bom');
for (const [ping, label, quality] of [[0,'Bom','good'],[100,'Bom','good'],[101,'Normal','normal'],[200,'Normal','normal'],[201,'Ruim','bad']]) {
 const sample = new dom.Event('message'); Object.assign(sample, {source:dom,origin:'https://www.habblet.city',data:{source:'pixelsquad-performance',ping,status:'connected'}});
 dom.dispatchEvent(sample); assert.equal(hud.lastChild.textContent,`Ping ${ping} ms • ${label}`); assert.equal(hud.lastChild.dataset.quality,quality);
}
now += 16000; [...hudTicks.values()].forEach(f => f()); assert.equal(hud.lastChild.textContent, 'Ping indisponível');
assert.equal(hud.lastChild.dataset.quality,'unknown');
hidden = true; dom.document.dispatchEvent(new dom.Event('visibilitychange')); assert(hud.hidden); assert.equal(callbacks.size, 0);
hidden = false; dom.document.dispatchEvent(new dom.Event('visibilitychange')); assert(!hud.hidden); assert.equal(callbacks.size, 1);
dom.dispatchEvent(new dom.Event('pagehide')); assert.equal(callbacks.size, 0); assert.equal(hudTicks.size, 0);
dom.dispatchEvent(new dom.Event('pageshow')); assert.equal(callbacks.size, 1); assert.equal(hudTicks.size, 1);
console.log('PASS: FPS sampling, ping display, stale readings, background suspension and page lifecycle');
