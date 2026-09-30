(() => {
  if (window.__PIXELSQUAD_MUSIC__) return;
  window.__PIXELSQUAD_MUSIC__ = true;
  const KEY = 'pixelsquad_music_player';
  let prefs = {};
  try { const value = JSON.parse(localStorage.getItem(KEY) || '{}'); if (value && typeof value === 'object' && !Array.isArray(value)) prefs = value; } catch {}
  const mounted = new WeakMap();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {} };
  const clean = value => String(value || '').trim().slice(0, 180);
  const validColor = value => /^#[0-9a-f]{6}$/i.test(value || '');
  let active = null, handle = null, footer = null, timer = null;
  let drag = null, observer = null, scheduled = null;
  const setText = (element, value) => { if (element.textContent !== value) element.textContent = value; };
  const position = (x, y) => {
    if (!active) return;
    const box = active.getBoundingClientRect();
    x = Math.max(8, Math.min(Math.max(8, innerWidth - box.width - 8), x));
    y = Math.max(8, Math.min(Math.max(8, innerHeight - box.height - 8), y));
    active.style.setProperty('left', Math.round(x) + 'px', 'important');
    active.style.setProperty('top', Math.round(y) + 'px', 'important');
    prefs.x = Math.round(x); prefs.y = Math.round(y);
  };
  const nativeText = selectors => {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element || element.closest('.ps-music-footer,.ps-music-heading')) continue;
      const value = clean(element.getAttribute('data-song-title') || element.getAttribute('data-origin-room') ||
        element.getAttribute('data-room-name') || element.textContent);
      if (value) return value;
    }
    return '';
  };
  const update = () => {
    if (!active?.isConnected) { clearInterval(timer); timer = null; active = null; return; }
    const metadata = navigator.mediaSession?.metadata;
    const song = nativeText([
      '#area_player [data-song-title]', '#player2 [data-song-title]',
      '#area_player .music', '#player2 .music', '#area_player #song', '#player2 #song'
    ]) || clean(metadata?.title);
    const origin = nativeText(['#area_player [data-origin-room]', '#player2 [data-origin-room]']);
    const currentRoom = nativeText(['.nitro-room-info [data-room-name]', '[data-room-name]']);
    setText(footer.querySelector('.ps-music-song'), '♫ ' + (song || 'Música não informada'));
    setText(footer.querySelector('.ps-music-room'), origin ? 'Quarto de origem: ' + origin :
      currentRoom ? 'Quarto atual: ' + currentRoom : 'Quarto: não informado');
  };
  const mount = () => {
    if (active?.isConnected) return;
    let root = document.querySelector('#area_player') || document.querySelector('#player2');
    if (!root) return;
    if (root.tagName === 'IFRAME' && root.parentElement?.classList.contains('ps-music-player')) root = root.parentElement;
    const existing = mounted.get(root);
    if (existing) {
      clearInterval(timer); active = root; handle = existing.handle; footer = existing.footer;
      update(); timer = setInterval(update, 2000); return;
    }
    clearInterval(timer); timer = null;
    if (root.tagName === 'IFRAME') {
      const frame = root;
      root = document.createElement('div');
      frame.before(root); root.appendChild(frame);
    }
    active = root;
    root.classList.add('ps-music-player');
    root.style.setProperty('--ps-music-accent', validColor(prefs.color) ? prefs.color : '#fa68d9');
    handle = document.createElement('div');
    handle.className = 'ps-music-heading';
    const brand = document.createElement('strong');
    brand.textContent = '♫ PixelSquad';
    const colorLabel = document.createElement('label');
    colorLabel.className = 'ps-music-color';
    colorLabel.title = 'Alterar cor do player';
    const color = document.createElement('input');
    color.type = 'color';
    color.setAttribute('aria-label', 'Cor do player de música');
    color.value = validColor(prefs.color) ? prefs.color : '#fa68d9';
    color.addEventListener('input', () => {
      prefs.color = color.value; root.style.setProperty('--ps-music-accent', color.value); save();
    });
    colorLabel.appendChild(color);
    const reset = document.createElement('button');
    reset.type = 'button'; reset.textContent = '↺';
    reset.title = 'Restaurar posição do player';
    reset.setAttribute('aria-label', reset.title);
    reset.addEventListener('click', () => { position(innerWidth - root.offsetWidth - 20, 100); save(); });
    handle.append(brand, colorLabel, reset);
    handle.title = 'Arraste este cabeçalho para mover o player';
    root.prepend(handle);
    footer = document.createElement('div');
    footer.className = 'ps-music-footer';
    const song = document.createElement('div');
    song.className = 'ps-music-song';
    const room = document.createElement('div');
    room.className = 'ps-music-room';
    footer.append(song, room); root.appendChild(footer);
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button,input,label')) return;
      const rect = root.getBoundingClientRect();
      drag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
      handle.setPointerCapture(event.pointerId); event.preventDefault();
    });
    handle.addEventListener('pointermove', event => {
      if (drag?.id === event.pointerId) position(event.clientX - drag.dx, event.clientY - drag.dy);
    });
    const finish = event => { if (drag?.id === event.pointerId) { drag = null; save(); } };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
    position(Number.isFinite(prefs.x) ? prefs.x : innerWidth - root.offsetWidth - 20,
      Number.isFinite(prefs.y) ? prefs.y : 100);
    mounted.set(root, { handle, footer });
    update(); timer = setInterval(update, 2000);
  };
  const begin = () => {
    observer = new MutationObserver(records => {
      const relevant = records.some(record => [...record.addedNodes].some(node =>
        node.nodeType === 1 && (node.matches?.('#area_player,#player2') ||
          node.querySelector?.('#area_player,#player2'))));
      if (!relevant || scheduled !== null) return;
      scheduled = setTimeout(() => { scheduled = null; mount(); }, 100);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    mount();
  };
  window.addEventListener('resize', () => {
    if (active?.isConnected) { const rect = active.getBoundingClientRect(); position(rect.left, rect.top); save(); }
  });
  window.addEventListener('pagehide', () => { observer?.disconnect(); clearInterval(timer); timer = null; clearTimeout(scheduled); scheduled = null; });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    begin();
    if (active?.isConnected && timer === null) { update(); timer = setInterval(update, 2000); }
  });
  if (document.documentElement) begin();
  else document.addEventListener('DOMContentLoaded', begin, { once: true });
})();
