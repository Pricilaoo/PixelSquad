// EvaWire: Arcturus PingEvent (295) -> PongComposer (10), echoed int32 ID.
// Only probe sockets identified by Nitro's native heartbeat; never measure HTTP as game ping.
(() => {
  if (window.__PIXELSQUAD_PERFORMANCE_BRIDGE__) return;
  window.__PIXELSQUAD_PERFORMANCE_BRIDGE__ = true;
  const Native = window.WebSocket;
  if (!Native) return;
  const originalSend = Native.prototype.send, states = new WeakMap();
  let active = null, sequence = 1500000000, timer = null, suspended = false;
  const emit = (ping, status) => window.postMessage({ source: 'pixelsquad-performance', ping, status }, location.origin);
  const bytes = data => data instanceof ArrayBuffer ? new Uint8Array(data) :
    ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : null;
  function packets(data, callback) {
    const b = bytes(data);
    if (!b || b.byteLength > 2097152) return;
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    for (let offset = 0; offset + 6 <= v.byteLength;) {
      const size = v.getUint32(offset);
      if (size < 2 || offset + 4 + size > v.byteLength) return;
      callback(v.getUint16(offset + 4), size >= 6 ? v.getInt32(offset + 6) : null, size);
      offset += size + 4;
    }
  }
  function receive(socket, data, arrived) {
    const s = states.get(socket);
    if (!s) return;
    packets(data, (header, id, size) => {
      // Nitro's authenticated message identifies the game socket before its first heartbeat.
      if (header === 2491 && size === 2 && active !== socket) { active = socket; emit(null, 'waiting'); }
      if (header === 3928 && size === 2) {
        s.heartbeat = arrived;
        if (Math.abs(s.pongAt - arrived) < 5000 && active !== socket) {
          active = socket; emit(null, 'waiting');
        }
      }
      if (socket === active && header === 10 && size === 6 && s.pending?.id === id) {
        const duration = arrived - s.pending.start;
        s.pending = null; s.misses = 0;
        if (duration >= 0 && duration < 10000) emit(Math.round(duration), 'connected');
      }
    });
  }
  function watch(socket) {
    states.set(socket, { heartbeat: -Infinity, pongAt: -Infinity, pending: null, misses: 0 });
    socket.addEventListener('message', event => {
      const arrived = performance.now();
      if (event.data instanceof Blob) {
        if (event.data.size <= 2097152) event.data.arrayBuffer().then(data => receive(socket, data, arrived)).catch(() => {});
      } else receive(socket, event.data, arrived);
    });
    const disconnected = () => {
      if (active !== socket) return;
      active = null; emit(null, 'disconnected');
    };
    socket.addEventListener('close', disconnected);
    socket.addEventListener('error', disconnected);
  }
  window.WebSocket = new Proxy(Native, {
    construct(target, args, newTarget) {
      const socket = Reflect.construct(target, args, newTarget);
      watch(socket); return socket;
    }
  });
  Native.prototype.send = function(data) {
    // Forward native traffic first; preserve return values and native exceptions.
    const result = Reflect.apply(originalSend, this, [data]);
    const s = states.get(this);
    if (s) packets(data, (header, id, size) => {
      if (header === 2596 && size === 2) {
        s.pongAt = performance.now();
        if (s.pongAt - s.heartbeat < 5000 && active !== this) { active = this; emit(null, 'waiting'); }
      }
    });
    return result;
  };
  function tick() {
    if (suspended || document.hidden || !document.querySelector('.nitro-toolbar')) return;
    const socket = active, s = socket && states.get(socket);
    if (!s || socket.readyState !== Native.OPEN || s.misses >= 3) return;
    if (s.pending) {
      if (performance.now() - s.pending.start < 10000) return;
      s.pending = null; s.misses++; emit(null, 'unavailable');
      if (s.misses >= 3) return;
    }
    const buffer = new ArrayBuffer(10), v = new DataView(buffer);
    v.setUint32(0, 6); v.setUint16(4, 295); v.setInt32(6, ++sequence);
    s.pending = { id: sequence, start: performance.now() };
    try { Reflect.apply(originalSend, socket, [buffer]); }
    catch { s.pending = null; emit(null, 'disconnected'); }
  }
  function start() { if (!timer) timer = setInterval(tick, 5000); }
  // The native profile view opens on the response to USER_PROFILE_BY_NAME (2249).
  window.addEventListener('message', event => {
    if (event.data?.source !== 'pixelsquad' || event.data.type !== 'PS_OPEN_CREATOR') return;
    if (event.source !== window && event.source !== window.top) return;
    try {const origin = new URL(event.origin); if (origin.protocol !== 'https:' || !(origin.hostname === 'habblet.city' || origin.hostname.endsWith('.habblet.city'))) return;} catch {return;}
    if (!active || active.readyState !== Native.OPEN || !document.querySelector('.nitro-toolbar')) return;
    const name = 'Pricilao.', buffer = new ArrayBuffer(8 + name.length), view = new DataView(buffer);
    view.setUint32(0, 4 + name.length); view.setUint16(4, 2249); view.setUint16(6, name.length);
    for (let i = 0; i < name.length; i++) view.setUint8(8 + i, name.charCodeAt(i));
    try {Reflect.apply(originalSend, active, [buffer]);} catch {}
  });
  window.addEventListener('pagehide', () => { suspended = true; clearInterval(timer); timer = null; });
  window.addEventListener('pageshow', () => { suspended = false; if (active) states.get(active).pending = null; start(); });
  start();
})();
