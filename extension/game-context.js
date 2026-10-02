(() => {
  if (window.PixelSquadGame) return;
  const frames = new Map();
  let toolbar = null, active = false, suspended = false, queued = false;
  const trustedOrigin = origin => {
    try {
      const url = new URL(origin);
      return url.protocol === 'https:' && (url.hostname === 'habblet.city' || url.hostname.endsWith('.habblet.city'));
    } catch {return false;}
  };
  function announce() {
    if (window.parent !== window) window.parent.postMessage({source: 'pixelsquad', type: 'PS_GAME_CONTEXT', active}, '*');
  }
  function update() {
    const next = !suspended && (!!toolbar?.isConnected || [...frames.values()].some(frame => frame.element.isConnected && !frame.loading && frame.active));
    if (next === active) return;
    active = next;
    window.dispatchEvent(new CustomEvent('pixelsquad-game-change', {detail: {active}}));
    announce();
  }
  function request(frame) {
    try {frame.element.contentWindow?.postMessage({source: 'pixelsquad', type: 'PS_GAME_CONTEXT_QUERY'}, '*');} catch {}
  }
  function scan() {
    if (suspended) return false;
    if (!toolbar?.isConnected) toolbar = document.querySelector('.nitro-toolbar');
    for (const element of document.querySelectorAll('iframe')) {
      if (frames.has(element)) continue;
      const frame = {element, active: false, loading: false, onLoad: null};
      frame.onLoad = () => {frame.active = false; frame.loading = false; update(); request(frame);};
      frames.set(element, frame); element.addEventListener('load', frame.onLoad); request(frame);
    }
    for (const [element, frame] of frames) if (!element.isConnected) {
      element.removeEventListener('load', frame.onLoad); frames.delete(element);
    }
    update(); return active;
  }
  const observer = new MutationObserver(changes => {
    for (const change of changes) if (change.type === 'attributes') {
      const frame = frames.get(change.target);
      if (frame) {frame.loading = true; frame.active = false;}
    }
    update();
    if (queued || suspended) return;
    queued = true; queueMicrotask(() => {queued = false; scan();});
  });
  const observe = () => observer.observe(document, {childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcdoc']});
  window.addEventListener('message', event => {
    if (event.data?.source !== 'pixelsquad' || !trustedOrigin(event.origin) || suspended) return;
    if (event.data.type === 'PS_GAME_CONTEXT_QUERY' && event.source === window.parent && window.parent !== window) {
      scan(); announce(); return;
    }
    if (event.data.type !== 'PS_GAME_CONTEXT' || typeof event.data.active !== 'boolean') return;
    scan();
    for (const frame of frames.values()) if (!frame.loading && frame.element.contentWindow === event.source) {
      frame.active = event.data.active; update(); break;
    }
  });
  window.addEventListener('pagehide', () => {suspended = true; observer.disconnect(); update(); announce();});
  window.addEventListener('pageshow', () => {suspended = false; observe(); scan(); for (const frame of frames.values()) request(frame); announce();});
  window.PixelSquadGame = Object.freeze({get active() {return active;}, refresh: scan});
  observe(); scan(); announce();
})();
