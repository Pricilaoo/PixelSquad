(() => {
  if (window.__PIXELSQUAD_PIXEL_SHORTCUT__) return;
  window.__PIXELSQUAD_PIXEL_SHORTCUT__ = true;
  const fieldSelector = 'textarea,input[type="text"],input:not([type]),[contenteditable="true"]';
  function chatField(target) {
    if (!document.querySelector('.nitro-toolbar') || target?.closest?.('#pixelsquad,#pixelsquad-avatar-generator')) return null;
    const field = target?.closest?.(fieldSelector);
    if (!field) return null;
    const placeholder = field.getAttribute('placeholder') || '';
    if (!field.closest('.nitro-chat-input') && !/falar|digite.*mensagem|mensagem|say|chat/i.test(placeholder)) return null;
    return field;
  }
  function consume(event, field) {
    if (!field) return false;
    const text = field.isContentEditable || field.getAttribute('contenteditable') === 'true' ? field.textContent : field.value;
    if (String(text || '').trim().toLowerCase() !== ':pixel') return false;
    event.preventDefault(); event.stopImmediatePropagation();
    if (field.isContentEditable || field.getAttribute('contenteditable') === 'true') field.textContent = '';
    else {
      const proto = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter ? setter.call(field, '') : field.value = '';
    }
    field.dispatchEvent(new Event('input', {bubbles: true, composed: true}));
    field.dispatchEvent(new Event('change', {bubbles: true}));
    window.top.postMessage({source: 'pixelsquad', type: 'PS_OPEN_PANEL'}, '*');
    return true;
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) consume(event, chatField(event.target));
  }, true);
  document.addEventListener('submit', event => {
    const field = event.target?.querySelector?.(fieldSelector); consume(event, chatField(field));
  }, true);
  document.addEventListener('click', event => {
    const button = event.target?.closest?.('button,[role="button"]');
    if (!button) return;
    const container = button.closest('.nitro-chat-input,form');
    const field = container?.querySelector(fieldSelector); consume(event, chatField(field));
  }, true);
})();
