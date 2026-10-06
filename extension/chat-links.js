(() => {
  if (window.__PIXELSQUAD_CHAT_LINKS__) return;
  window.__PIXELSQUAD_CHAT_LINKS__ = true;
  const selector = '.bubble-container .chat-content .message';
  const pattern = /https?:\/\/[^\s<>"']+|(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}(?::\d+)?(?:[/?#][^\s<>"']*)?/gi;
  function address(value) {
    if (!value || /[\s\u0000-\u001f\u007f]/.test(value)) return null;
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      return ['https:', 'http:'].includes(url.protocol) && url.hostname.includes('.') && !url.username && !url.password ? url.href : null;
    } catch {return null;}
  }
  function linkAddress(link) {
    const href=address(link.getAttribute('href'));
    if(href)return href;
    const visible=address(link.textContent.trim());
    if(visible && /(^|\.)(zyo\.se|aylo\.me)$/i.test(new URL(visible).hostname))return visible;
    return null;
  }
  function decorate(link) {
    const href=linkAddress(link);if(!href)return;
    link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.title=`Abrir ${href}`;
    link.style.setProperty('text-decoration','underline','important');
    link.style.setProperty('cursor','pointer');link.style.setProperty('pointer-events','auto');
  }
  function convert(node) {
    if (node.nodeType === 3) {
      const text = node.nodeValue, matches = [...text.matchAll(pattern)];
      if (!matches.length) return;
      const fragment = document.createDocumentFragment(); let end = 0;
      for (const match of matches) {
        if (match.index && /[\w@/:.-]/.test(text[match.index - 1])) continue;
        let label = match[0].replace(/[.,!;:]+$/, '');
        while (label.endsWith(')') && label.split(')').length > label.split('(').length) label = label.slice(0, -1);
        const href = address(label); if (!href) continue;
        fragment.append(document.createTextNode(text.slice(end, match.index)));
        const link = document.createElement('a'); link.href = href; link.textContent = label;
        link.target = '_blank'; link.rel = 'noopener noreferrer'; link.title = `Abrir ${href}`;
        link.style.color='inherit';decorate(link);
        fragment.append(link); end = match.index + label.length;
      }
      if (!end) return;
      fragment.append(document.createTextNode(text.slice(end))); node.replaceWith(fragment); return;
    }
    if(node.nodeType===1 && node.matches('a')){decorate(node);return;}
    if (node.nodeType !== 1 || node.matches('button,input,textarea,script,style,[contenteditable]')) return;
    for (const child of [...node.childNodes]) convert(child);
  }
  function scan(node) {
    if (!window.PixelSquadGame?.active) return;
    const element = node.nodeType === 1 ? node : node.parentElement;
    if (!element?.isConnected) return;
    const message = element.closest(selector);
    if (message) convert(message);
    else for (const message of element.querySelectorAll(selector)) convert(message);
  }
  const observer = new MutationObserver(records => {
    const added = new Set();
    for (const record of records) {
      if (record.type === 'characterData') added.add(record.target);
      else for (const node of record.addedNodes) added.add(node);
    }
    for (const node of added) scan(node);
  });
  function start() {
    observer.observe(document, {childList:true, subtree:true, characterData:true});
    if (document.body) scan(document.body);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.(`${selector} a`);
    if (!window.PixelSquadGame?.active || !link || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const href = linkAddress(link);
    if (!href) return;
    event.preventDefault(); event.stopImmediatePropagation();
    window.open(href, '_blank', 'noopener,noreferrer');
  }, true);
  window.addEventListener('pixelsquad-game-change', () => {if (document.body) scan(document.body);});
  window.addEventListener('pagehide', () => observer.disconnect());
  window.addEventListener('pageshow', start);
  start();
})();
