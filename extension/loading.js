(() => {
  if (window.__PIXELSQUAD_LOADING__) return;
  window.__PIXELSQUAD_LOADING__ = true;
  const start = () => {
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
    let closed = false, timer;
    const progress = value => {
      bar.setAttribute('aria-valuenow', String(value));
      fill.style.transform = `scaleX(${value / 100})`;
      label.textContent = value === 100 ? 'Carregamento concluído!' : `Carregando PixelSquad… ${value}%`;
    };
    const close = () => {
      if (closed) return;
      closed = true; clearTimeout(timer);
      document.removeEventListener('DOMContentLoaded', onDom);
      window.removeEventListener('load', onLoad);
      window.removeEventListener('pagehide', close);
      overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 260);
    };
    const onDom = () => { if (!closed) progress(65); };
    const onLoad = () => {
      if (closed) return;
      progress(100); clearTimeout(timer); timer = setTimeout(close, 350);
    };
    progress(document.readyState === 'loading' ? 10 : 65);
    document.addEventListener('DOMContentLoaded', onDom, { once: true });
    window.addEventListener('load', onLoad, { once: true });
    window.addEventListener('pagehide', close, { once: true });
    // A stalled resource must not keep the overlay visible forever.
    timer = setTimeout(close, 15000);
    if (document.readyState === 'complete') onLoad();
  };
  if (document.documentElement) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
