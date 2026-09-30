(() => {
  if (window.__PIXELSQUAD_LOADING__) return;
  window.__PIXELSQUAD_LOADING__ = true;
  const createScreen = () => {
    const overlay = document.createElement('div');
    overlay.id = 'pixelsquad-loading';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:#000;pointer-events:none;transition:opacity .22s;overflow:hidden';
    const stage = document.createElement('div');
    stage.style.cssText = 'position:relative;width:min(900px,100vw,150vh);aspect-ratio:3/2';
    const img = document.createElement('img');
    img.src = chrome.runtime.getURL('icons/pixelsquad-loading.png');
    img.alt = 'PixelSquad';
    img.width = 1536; img.height = 1024; img.decoding = 'async';
    img.style.cssText = 'display:block;width:100%;height:100%';
    img.onerror = () => { img.onerror = null; img.src = chrome.runtime.getURL('icons/icon128.png'); };
    // Replace the bar painted in the image with a live HTML bar.
    const mask = document.createElement('div');
    mask.style.cssText = 'position:absolute;left:31%;top:73%;width:38%;height:10%;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px';
    const bar = document.createElement('div');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Carregamento da página PixelSquad');
    bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '100');
    bar.style.cssText = 'box-sizing:border-box;width:92%;height:32%;min-height:8px;border:2px solid #e878ff;border-left-color:#44efff;border-radius:999px;padding:3px;box-shadow:0 0 12px #a851c455;background:#09030d;overflow:hidden';
    const fill = document.createElement('div');
    fill.style.cssText = 'height:100%;width:100%;transform:scaleX(0);transform-origin:left;border-radius:999px;background:linear-gradient(90deg,#60ffff,#95a7ff,#ffa1ee,#fff0c9);transition:transform .25s';
    const label = document.createElement('div');
    label.setAttribute('role', 'status');
    label.style.cssText = 'color:#fff;font:clamp(8px,1.5vw,15px) monospace;text-align:center';
    const style = document.createElement('style');
    style.textContent = '@media(prefers-reduced-motion:reduce){#pixelsquad-loading,#pixelsquad-loading [role=progressbar]>div{transition:none!important}}';
    bar.appendChild(fill); mask.append(bar, label); stage.append(img, mask); overlay.append(stage, style);
    document.documentElement.appendChild(overlay);
    let removed = false;
    let lastValue = null;
    const progress = value => {
      if (removed || value === lastValue) return;
      lastValue = value;
      if (value === null) {
        bar.removeAttribute('aria-valuenow');
        fill.style.transform = 'scaleX(0)';
        label.textContent = 'Conectando ao Habblet…';
      } else {
        bar.setAttribute('aria-valuenow', String(value));
        fill.style.transform = `scaleX(${value / 100})`;
        label.textContent = value === 100 ? 'Jogo pronto!' : `Carregando Habblet… ${value}%`;
      }
    };
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = 'Mostrar tela original';
    dismiss.style.cssText = 'position:absolute;bottom:12px;right:12px;pointer-events:auto;background:#15111e;color:#ddd;border:1px solid #554065;border-radius:6px;padding:8px;cursor:pointer';
    overlay.appendChild(dismiss);
    label.textContent = 'Conectando ao Habblet…';
    const remove = () => { removed = true; overlay.remove(); };
    return { overlay, progress, remove, dismiss };
  };

  // Nitro's native loading view is the source of progress. A page load or
  // canvas allocation alone does not mean that authentication/game init finished.
  let screen = null, completionTimer = null, pendingTimer = null;
  let poll = null, scheduled = null, observer = null;
  let bypass = false, sawLoader = false, stopped = false;
  const visible = element => {
    if (!element || !element.isConnected || !element.getClientRects().length) return false;
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
      const css = getComputedStyle(node);
      if (css.display === 'none' || css.visibility === 'hidden' || Number(css.opacity) === 0) return false;
    }
    return true;
  };
  const dropScreen = () => {
    clearTimeout(completionTimer); completionTimer = null;
    clearTimeout(pendingTimer); pendingTimer = null;
    if (poll !== null) { clearInterval(poll); poll = null; }
    screen?.remove(); screen = null;
  };
  const show = () => {
    if (screen || bypass || stopped) return;
    screen = createScreen();
    screen.dismiss.addEventListener('click', () => { bypass = true; dropScreen(); });
    // Poll only while a loading screen is active; also handles CSS transitions.
    poll = setInterval(scan, 750);
  };
  const nativePercent = loader => {
    const inner = loader.querySelector('.nitro-progress-bar-inner');
    const match = inner?.style.width?.match(/^(\d+(?:\.\d+)?)%$/)
      || loader.textContent.match(/(\d+(?:\.\d+)?)\s*%/);
    if (!match) return null;
    return Math.min(100, Math.max(0, Number(match[1])));
  };
  const scan = () => {
    if (stopped) return;
    const loader = [...document.querySelectorAll('.nitro-loading')].find(visible);
    if (loader) {
      sawLoader = true;
      clearTimeout(pendingTimer); pendingTimer = null;
      clearTimeout(completionTimer); completionTimer = null;
      const percent = nativePercent(loader);
      // Nitro replaces its progress widgets with an error message on failure.
      // Reveal that message instead of hiding connection/WebGL errors.
      if (percent === null && loader.textContent.trim()) {
        bypass = true; dropScreen(); return;
      }
      show();
      // Reserve 100% for the game UI, even if assets reach 100% first.
      screen?.progress(percent === null ? null : Math.min(99, percent));
      return;
    }
    const ready = [...document.querySelectorAll('.nitro-toolbar')].some(visible);
    if (ready && screen && completionTimer === null) {
      screen.progress(100);
      completionTimer = setTimeout(dropScreen, 350);
    }
    // Never infer readiness from window.load or from loader disappearance alone.
    if (!loader && sawLoader && !ready && screen) screen.progress(null);
  };
  const begin = () => {
    observer = new MutationObserver(records => {
      if (records.every(record => screen?.overlay.contains(record.target))) return;
      if (scheduled !== null) return;
      scheduled = setTimeout(() => { scheduled = null; scan(); }, 80);
    });
    observer.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    });
    // Cover known client entry routes before React paints its native loader.
    // Other pages (login/news/profile) remain untouched.
    if (/^\/(?:hotel|client|nitro)(?:\/|$)/i.test(location.pathname)
        && !document.querySelector('.nitro-toolbar')) {
      show();
      // Unsupported client layouts fall back to their own screen, without 100%.
      pendingTimer = setTimeout(() => { if (!sawLoader) dropScreen(); }, 20000);
    }
    scan();
  };
  const stop = () => {
    stopped = true; observer?.disconnect(); clearTimeout(scheduled); dropScreen();
  };
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', event => {
    if (event.persisted) { stopped = false; sawLoader = false; bypass = false; begin(); }
  });
  if (document.documentElement) begin();
  else document.addEventListener('DOMContentLoaded', begin, { once: true });
})();
