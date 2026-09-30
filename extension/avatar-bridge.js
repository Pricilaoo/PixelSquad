// Read the client's own figure catalog. No avatar/chat commands are sent here.
(() => {
  if (window.__PIXELSQUAD_AVATAR_BRIDGE__) return;
  window.__PIXELSQUAD_AVATAR_BRIDGE__ = true;
  let catalog = null;
  const remember = value => {
    if (value && Array.isArray(value.setTypes) && Array.isArray(value.palettes)) catalog = value;
  };
  const relevant = url => /figuredata[^/]*\.(json|xml)(?:[?#]|$)/i.test(String(url));
  function parse(text) {
    if (typeof text !== 'string' || text.length > 12000000) return;
    try { remember(JSON.parse(text)); } catch { /* Nitro JSON catalogs only. */ }
  }
  if (window.fetch) {
    const fetch = window.fetch;
    window.fetch = function(...args) {
      const result = Reflect.apply(fetch, this, args);
      if (relevant(args[0]?.url || args[0])) result.then(response => {
        if (response.ok) response.clone().text().then(parse).catch(() => {});
      }).catch(() => {});
      return result;
    };
  }
  if (window.XMLHttpRequest) {
    const open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(...args) {
      const result = Reflect.apply(open, this, args);
      if (relevant(args[1])) this.addEventListener('load', () => {
        try { if (this.status >= 200 && this.status < 300) this.responseType === 'json' ? remember(this.response) : parse(this.responseText); } catch {}
      }, { once: true });
      return result;
    };
  }
  const manager = () => {
    try { return window.Nitro?.instance?.avatar || window.GetAvatarRenderManager?.(); } catch { return null; }
  };
  function nativeCatalog() {
    try {
      const data = manager()?.structureData?.figureData;
      if (data) remember(data);
    } catch {}
    return catalog;
  }
  function imager(figure, gender) {
    // Reuse an imager already used by this game, instead of an unrelated hotel's clothes.
    for (const image of document.querySelectorAll('img[src]')) {
      try {
        const url = new URL(image.getAttribute('src'), location.href);
        if (url.protocol !== 'https:' || !url.searchParams.has('figure')) continue;
        if (!/avatar|imager|imaging/i.test(url.pathname)) continue;
        const safe = new URL(url.origin + url.pathname);
        safe.searchParams.set('figure', figure); safe.searchParams.set('gender', gender);
        safe.searchParams.set('size', 'l'); safe.searchParams.set('direction', '2');
        safe.searchParams.set('head_direction', '2'); return safe.href;
      } catch {}
    }
    return null;
  }
  function preview(figure, gender, done) {
    const render = manager();
    if (!render?.createAvatarImage) { done(imager(figure, gender)); return; }
    let attempt = 0, finished = false;
    const draw = () => {
      if (finished) return;
      let avatar;
      try {
        avatar = render.createAvatarImage(figure, 'l', gender, { disposed: false, dispose() {}, resetFigure() { setTimeout(draw, 0); } });
        avatar?.setDirection('full', 2);
        const image = !avatar?.isPlaceholder?.() && avatar?.getCroppedImage('full');
        if (image?.src) { finished = true; done(image.src); }
      } catch {} finally { avatar?.dispose?.(); }
      if (!finished) {
        if (++attempt < 12) setTimeout(draw, 250);
        else { finished = true; done(imager(figure, gender)); }
      }
    };
    draw();
  }
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'pixelsquad-avatar') return;
    const {type, requestId, figure, gender} = event.data;
    if (typeof requestId !== 'string' || requestId.length > 100) return;
    const reply = result => window.postMessage({source: 'pixelsquad-avatar-result', requestId, result}, location.origin);
    if (type === 'catalog') {
      const data = nativeCatalog();
      reply(data ? {catalog: data} : {error: 'Abra o editor de roupas do jogo e tente novamente para carregar as peças disponíveis.'});
    }
    if (type === 'preview' && /^[a-z]{2}-\d+(?:\.\d+)*(?:\.[a-z]{2}-\d+(?:\.\d+)*)*$/.test(figure || '') && figure.length < 1000 && ['M','F'].includes(gender)) {
      preview(figure, gender, url => reply(url ? {url} : {error: 'A prévia do jogo não está disponível nesta sessão. Abra o editor de roupas e tente novamente.'}));
    }
  });
})();
