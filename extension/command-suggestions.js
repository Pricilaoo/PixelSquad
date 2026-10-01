(() => {
  if (window.__PIXELSQUAD_COMMAND_SUGGESTIONS__) return;
  window.__PIXELSQUAD_COMMAND_SUGGESTIONS__ = true;
  const catalog = [
    ['empty', '', 'Deleta todos os mobis do inventário.', 'Pessoais'],
    ['emptypets', '', 'Deleta todos os pets do inventário.', 'Pessoais'],
    ['emptybots', '', 'Deleta todos os bots do inventário.', 'Pessoais'],
    ['emptyrel', '', 'Remove todos do status de relacionamento.', 'Pessoais'],
    ['sit', '', 'Senta no chão.', 'Pessoais'],
    ['lay', '', 'Deita no chão.', 'Pessoais'],
    ['pet', '', 'Transforma seu personagem em um pet.', 'Pessoais'],
    ['home', '', 'Vai para o seu cafofo.', 'Pessoais'],
    ['deletegroup', '', 'Deleta um grupo do qual você é dono.', 'Pessoais'],
    ['friends', '', 'Ativa ou desativa pedidos de amizade.', 'Pessoais'],
    ['trade', '', 'Ativa ou desativa trocas com você.', 'Pessoais'],
    ['moonwalk', '', 'Anda de costas.', 'Pessoais'],
    ['enable', '(número)', 'Habilita um efeito.', 'Pessoais'],
    ['handitem', '(número)', 'Escolhe um item de mão.', 'Pessoais'],
    ['cara', '', 'Esconde seu rosto.', 'Pessoais'],
    ['follow', '(nick)', 'Segue alguém que esteja online.', 'Pessoais'],
    ['diagonal', '', 'Ativa ou desativa a diagonal.', 'Pessoais'],
    ['mutepets', '', 'Ativa ou desativa mensagens de animais.', 'Pessoais'],
    ['mutebots', '', 'Ativa ou desativa mensagens de bots.', 'Pessoais'],
    ['pickrare', '', 'Recolhe seus raros que estão no quarto.', 'Pessoais'],
    ['ct', '', 'Ativa ou desativa clicar entre Habblets.', 'Pessoais'],
    ['wiredtool', '', 'Abre a ferramenta de Wireds.', 'Pessoais'],
    ['pickall', '', 'Recolhe todos os mobis do quarto.', 'Quarto'],
    ['pickwired', '', 'Recolhe seus Wireds do quarto.', 'Quarto'],
    ['ejectall', '', 'Remove todos os seus mobis do quarto.', 'Quarto'],
    ['kickpets', '', 'Expulsa todos os pets do quarto.', 'Quarto'],
    ['kickbots', '', 'Expulsa todos os bots do quarto.', 'Quarto'],
    ['setspeed', '(número)', 'Define a velocidade dos rollers do quarto.', 'Quarto'],
    ['blockroom', '', 'Bloqueia alterações no quarto.', 'Quarto'],
    ['up', '(número)', 'Define a altura para construir com mobis.', 'Quarto'],
    ['spin', '(número)', 'Define a rotação para construir com mobis.', 'Quarto'],
    ['state', '(número)', 'Define o estado para construir com mobis.', 'Quarto'],
    ['wired', '', 'Esconde os Wireds do quarto.', 'Quarto'],
    ['autofloor', '', 'Remove pisos vazios sem mobis do quarto.', 'Quarto'],
    ['tile', '', 'Age nos mobis de um quadrado: copy, place, pick ou move.', 'Quarto'],
    ['pyramid', '', 'Esconde ou mostra as pirâmides Wired.', 'Quarto'],
    ['eject', '(nick)', 'Remove os mobis de um Habblet do quarto.', 'Quarto'],
    ['playtest', '', 'Ativa ou desativa o teste sem direitos.', 'Quarto'],
    ['abracar', '(nick)', 'Abraça um Habblet.', 'Interação'],
    ['push', '(nick)', 'Empurra um Habblet.', 'Interação'],
    ['pull', '(nick)', 'Puxa um Habblet.', 'Interação'],
    ['kis', '(nick)', 'Se apaixona por um Habblet.', 'VIP'],
    ['soco', '(nick)', 'Soca um Habblet.', 'VIP'],
    ['quickpoll', '(mensagem)', 'Cria uma enquete no quarto.', 'VIP'],
    ['ativar', '', 'Ativa comandos no quarto.', 'VIP'],
    ['desativar', '', 'Desativa comandos no quarto.', 'VIP'],
    ['setmax', '(número)', 'Define o máximo de Habblets no quarto.', 'VIP'],
    ['tele', '', 'Teleporta para qualquer lugar do quarto.', 'VIP'],
    ['aus', '', 'Ativa o modo AFK.', 'VIP'],
    ['afk', '', 'Ativa o modo AFK.', 'VIP'],
    ['random', '(mínimo) (máximo)', 'Gera um número aleatório.', 'VIP'],
    ['habbletname', '', 'Muda seu nome; custa 100.000 diamantes.', 'VIP'],
    ['pixel', '', 'Abre o painel PixelSquad.', 'PixelSquad']
  ].sort((a, b) => a[0].localeCompare(b[0]));
  const id = 'pixelsquad-command-suggestions';
  const chatSelector = '.nitro-chat-input,.nitro-chat-input-container,#toolbar-chat-input-container';
  const inputSelector = 'input[type="text"],input:not([type]),textarea,[contenteditable="true"]';
  let field = null, popup = null, list = null, rows = [], selected = 0, cycle = null, completed = null;
  let attributes = null, observer = null, resizer = null, composing = false, filling = false;
  const editable = input => input.isContentEditable || input.getAttribute('contenteditable') === 'true';
  const value = input => String(editable(input) ? input.textContent : input.value || '');
  function chatField(target) {
    const input = target?.closest?.(inputSelector);
    if (!input || input.disabled || input.readOnly || !input.closest(chatSelector)) return null;
    if (input.closest('#pixelsquad,#pixelsquad-avatar-generator') || !document.querySelector('.nitro-toolbar')) return null;
    return input;
  }
  function atEnd(input) {
    if (!editable(input)) return input.selectionStart === input.selectionEnd && input.selectionEnd === value(input).length;
    const selection = window.getSelection();
    if (!selection?.isCollapsed || !input.contains(selection.focusNode)) return false;
    const range = document.createRange(); range.selectNodeContents(input);
    range.setEnd(selection.focusNode, selection.focusOffset);
    return range.toString().length === value(input).length;
  }
  function close() {
    observer?.disconnect(); resizer?.disconnect(); observer = resizer = null;
    window.removeEventListener('resize', place); window.removeEventListener('scroll', onScroll, true);
    if (field && attributes) for (const [name, previous] of attributes) {
      if (previous === null) field.removeAttribute(name); else field.setAttribute(name, previous);
    }
    popup?.remove(); field = popup = list = attributes = null; rows = []; cycle = null;
  }
  function place() {
    if (!popup || !field?.isConnected) return close();
    const r = field.getBoundingClientRect();
    if (!r.width || !r.height) return close();
    const width = Math.min(Math.max(r.width, 320), 620, Math.max(0, innerWidth - 16));
    popup.style.width = width + 'px';
    popup.style.left = Math.max(8, Math.min(r.left, innerWidth - width - 8)) + 'px';
    const above = r.top - 8, below = innerHeight - r.bottom - 8;
    const upwards = above >= Math.min(200, below);
    popup.style.maxHeight = Math.max(0, Math.min(202, upwards ? above : below)) + 'px';
    popup.style.top = upwards ? 'auto' : Math.max(8, r.bottom + 4) + 'px';
    popup.style.bottom = upwards ? Math.max(8, innerHeight - r.top + 4) + 'px' : 'auto';
  }
  function onScroll(event) { if (!popup?.contains(event.target)) place(); }
  function open(input) {
    if (field === input && popup) return;
    close(); field = input;
    attributes = new Map(['role','aria-autocomplete','aria-controls','aria-expanded','aria-activedescendant'].map(name => [name, input.getAttribute(name)]));
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', id + '-list'); input.setAttribute('aria-expanded', 'true');
    popup = document.createElement('div'); popup.id = id;
    list = document.createElement('div'); list.id = id + '-list'; list.className = 'ps-command-list';
    list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Comandos do Habblet');
    const hint = document.createElement('div'); hint.className = 'ps-command-hint';
    hint.textContent = 'PixelSquad • TAB completar • ↑ ↓ escolher';
    popup.append(list, hint); document.body.append(popup);
    list.addEventListener('pointerdown', event => { if (event.target.closest('[data-command-index]')) event.preventDefault(); });
    list.addEventListener('click', event => {
      const row = event.target.closest('[data-command-index]');
      if (!row || !field) return;
      fill(rows[Number(row.dataset.commandIndex)]); close();
    });
    observer = new MutationObserver(() => { if (!field?.isConnected || !document.querySelector('.nitro-toolbar')) close(); });
    observer.observe(document.body, {childList: true, subtree: true});
    if (typeof ResizeObserver === 'function') { resizer = new ResizeObserver(place); resizer.observe(input); }
    window.addEventListener('resize', place); window.addEventListener('scroll', onScroll, true);
  }
  function highlight() {
    if (!list || !field) return;
    for (const [index, row] of [...list.children].entries()) row.setAttribute('aria-selected', String(index === selected));
    const option = list.children[selected]; if (!option) return;
    field.setAttribute('aria-activedescendant', option.id);
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }
  function render() {
    list.replaceChildren();
    for (const [index, command] of rows.entries()) {
      const row = document.createElement('div'); row.className = 'ps-command-row';
      row.id = id + '-' + index; row.dataset.commandIndex = String(index); row.setAttribute('role', 'option');
      row.title = command[3] + ' • ' + command[2];
      row.setAttribute('aria-label', ':' + command[0] + ' ' + command[1] + '. ' + command[2]);
      const name = document.createElement('span'); name.className = 'ps-command-name'; name.textContent = ':' + command[0];
      if (command[1]) { const params = document.createElement('small'); params.textContent = ' ' + command[1]; name.append(params); }
      const detail = document.createElement('span'); detail.className = 'ps-command-detail';
      detail.textContent = (command[3] === 'VIP' ? '💎 ' : '') + command[2];
      if (command[3] === 'VIP') detail.classList.add('ps-command-vip');
      row.append(name, detail); list.append(row);
    }
    place(); highlight();
  }
  function refresh(input) {
    if (filling) return;
    cycle = completed = null;
    if (!input || composing || !atEnd(input)) return close();
    const query = value(input).match(/^\s*:([a-z]*)$/i);
    if (!query) return close();
    const matches = catalog.filter(command => command[0].startsWith(query[1].toLowerCase()));
    if (!matches.length) return close();
    open(input); rows = matches; selected = 0; render();
  }
  function fill(command) {
    if (!field || !command) return;
    const input = field, text = (value(input).match(/^\s*/)?.[0] || '') + ':' + command[0] + (command[1] ? ' ' : '');
    filling = true;
    try {
      if (editable(input)) input.textContent = text;
      else {
        const proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(input, text); else input.value = text;
      }
      input.dispatchEvent(new InputEvent('input', {bubbles: true, composed: true, inputType: 'insertReplacementText', data: text}));
      input.dispatchEvent(new Event('change', {bubbles: true})); input.focus();
      if (editable(input)) {
        const selection = window.getSelection(), range = document.createRange();
        range.selectNodeContents(input); range.collapse(false); selection.removeAllRanges(); selection.addRange(range);
      } else input.setSelectionRange(text.length, text.length);
    } finally { filling = false; }
    completed = {input, text};
  }
  document.addEventListener('input', event => { if (!event.isComposing) refresh(chatField(event.target)); }, true);
  document.addEventListener('focusin', event => refresh(chatField(event.target)), true);
  document.addEventListener('focusout', event => { if (event.target === field) close(); }, true);
  document.addEventListener('pointerup', event => { const input = chatField(event.target); if (input) refresh(input); }, true);
  document.addEventListener('pointerdown', event => { if (popup && !popup.contains(event.target) && event.target !== field) close(); }, true);
  document.addEventListener('compositionstart', () => { composing = true; close(); }, true);
  document.addEventListener('compositionend', event => { composing = false; refresh(chatField(event.target)); }, true);
  document.addEventListener('keyup', event => { if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) refresh(chatField(event.target)); }, true);
  window.addEventListener('keydown', event => {
    const input = chatField(event.target);
    if (!input || composing || event.isComposing || event.keyCode === 229 || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.key === 'Enter' || event.key === 'NumpadEnter') { close(); return; }
    if (event.key === 'Escape' && popup) { event.preventDefault(); event.stopImmediatePropagation(); close(); return; }
    if (event.key === 'Tab') {
      if (completed?.input === input && completed.text === value(input) && !cycle) { close(); return; }
      if (!popup || field !== input) refresh(input);
      if (!popup || !rows.length || !atEnd(input)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (cycle && cycle.input === input && cycle.text === value(input)) {
        selected = (selected + (event.shiftKey ? -1 : 1) + rows.length) % rows.length;
      }
      fill(rows[selected]);
      if (rows.length > 1) { cycle = {input, text: value(input)}; highlight(); }
      else close();
      return;
    }
    if (popup && field === input && ['ArrowUp','ArrowDown'].includes(event.key) && atEnd(input)) {
      event.preventDefault(); event.stopImmediatePropagation();
      selected = (selected + (event.key === 'ArrowUp' ? -1 : 1) + rows.length) % rows.length; highlight();
    }
  }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
  window.addEventListener('pagehide', close);
})();
