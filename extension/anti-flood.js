(() => {
  if (window.PixelSquadAntiFlood || !window.PixelSquadAntiFloodRules) return;
  const rules = window.PixelSquadAntiFloodRules, key = 'pixelsquad_antiflood';
  let prefs = rules.normalize(null), revision = 0, status = null, statusSource = null;
  try { prefs = rules.normalize(JSON.parse(localStorage.getItem(key) || 'null')); } catch {}
  const send = () => window.postMessage({source: 'pixelsquad', type: 'PS_ANTIFLOOD_CONFIG', config: prefs}, '*');
  function syncControls() {
    for (const input of document.querySelectorAll('#pixelsquad [data-antiflood]')) {
      const value = prefs[input.dataset.antiflood];
      if (input.type === 'checkbox') input.checked = value; else if (document.activeElement !== input) input.value = String(value);
      const dependency = input.dataset.requires;
      input.disabled = dependency ? !prefs[dependency] : false;
      if (input.type === 'checkbox') input.closest('label')?.setAttribute('aria-disabled', String(input.disabled));
    }
  }
  function displayStatus() {
    const element = document.querySelector('#pixelsquad #ps-antiflood-status'); if (!element) return;
    if (!rules.enabled(prefs)) element.textContent = 'Proteção desativada. Escolha as opções que deseja usar.';
    else if (status?.room) element.textContent = 'Proteção ativa • ' + status.translucent + ' avatares translúcidos • ' + status.blocked + ' usuários filtrados neste quarto.' +
      ((prefs.nonFriends || prefs.friendsNever) && !status.friendsReady ? ' Aguardando lista de amigos.' : '');
    else element.textContent = status?.connected ? 'Entre em um quarto para aplicar a proteção.' : 'Aguardando conexão com o cliente do jogo.';
  }
  function apply(value) { prefs = rules.normalize(value); syncControls(); displayStatus(); send(); }
  function set(value) {
    ++revision; apply({...prefs, ...value});
    try {localStorage.setItem(key, JSON.stringify(prefs));} catch {}
    try {chrome.storage.local.set({[key]: prefs})?.catch?.(() => {});} catch {}
  }
  function settings(main) {
    const statusElement = document.createElement('div'); statusElement.id = 'ps-antiflood-status'; statusElement.className = 'status';
    const intro = document.createElement('p'); intro.className = 'muted'; intro.textContent = 'Proteção individual no seu jogo. As alterações são aplicadas e salvas automaticamente.';
    main.append(intro, statusElement);
    function section(title) {
      const element = document.createElement('section'); element.className = 'panel-position-settings ps-antiflood-section';
      const heading = document.createElement('h3'); heading.textContent = title; element.append(heading); main.append(element); return element;
    }
    function input(name, type, title, dependency) {
      const control = document.createElement('input'); control.type = type; control.dataset.antiflood = name;
      control.setAttribute('aria-label', title);
      if (dependency) control.dataset.requires = dependency;
      if (type === 'checkbox') control.checked = prefs[name]; else control.value = String(prefs[name]);
      control.addEventListener('input', () => set({[name]: type === 'checkbox' ? control.checked : control.value}));
      return control;
    }
    function toggle(parent, name, title, dependency) {
      const label = document.createElement('label'), span = document.createElement('span'); span.textContent = title;
      const control = input(name, 'checkbox', title, dependency); label.append(span, control); parent.append(label); return label;
    }
    const avatars = section('Avatares translúcidos'), opacityLabel = document.createElement('label');
    opacityLabel.textContent = 'Opacidade dos avatares';
    const opacity = input('opacity', 'number', 'Opacidade dos avatares'); opacity.min = '0'; opacity.max = '1'; opacity.step = '0.1';
    opacityLabel.append(opacity); avatars.append(opacityLabel);
    const opacityHint = document.createElement('p'); opacityHint.className = 'muted'; opacityHint.textContent = '0 deixa invisível; 1 mantém totalmente visível.'; avatars.append(opacityHint);
    toggle(avatars, 'untilActive', 'Todos ficam translúcidos até demonstrar atividade');
    toggle(avatars, 'chatOnlyActivity', 'Considerar somente o envio de mensagens como atividade', 'untilActive').classList.add('ps-antiflood-nested');
    toggle(avatars, 'botsPets', 'Bots e pets sempre translúcidos');
    toggle(avatars, 'nonFriends', 'Avatares que não são amigos sempre translúcidos');
    toggle(avatars, 'friendsNever', 'Avatares amigos nunca ficam translúcidos');
    toggle(avatars, 'idle', 'Tornar transparente quando ficar ausente (Zzz)');
    const filters = section('Usuários bloqueados');
    const help = document.createElement('p'); help.className = 'muted';
    help.textContent = 'Os filtros ocultam o usuário e suas mensagens para você neste quarto. Os padrões procuram um trecho do texto, sem diferenciar maiúsculas, minúsculas ou acentos.'; filters.append(help);
    for (const [flag, name, title, type] of [
      ['pointsEnabled','minPoints','Bloquear usuários com menos pontos de conquista','number'],
      ['nameEnabled','namePattern','Bloquear por padrão no nome','text'],
      ['missionEnabled','missionPattern','Bloquear por padrão na missão','text'],
      ['messageEnabled','messagePattern','Bloquear por padrão na mensagem','text']
    ]) {
      const row = document.createElement('div'); row.className = 'ps-antiflood-rule';
      toggle(row, flag, title);
      const control = input(name, type, title, flag);
      if (type === 'number') {control.min = '0'; control.max = '2147483647'; control.step = '1';}
      else {control.placeholder = 'Trecho a filtrar'; control.maxLength = 200;}
      row.append(control); filters.append(row);
    }
    const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'Restaurar Anti-flood padrão';
    reset.addEventListener('click', () => set(rules.defaults)); main.append(reset);
    syncControls(); displayStatus(); send();
  }
  window.addEventListener('message', event => {
    if (event.data?.source !== 'pixelsquad' || event.data.type !== 'PS_ANTIFLOOD_STATUS') return;
    let trusted = event.source === window;
    if (!trusted) try {
      const origin = new URL(event.origin);
      trusted = origin.protocol === 'https:' && (origin.hostname === 'habblet.city' || origin.hostname.endsWith('.habblet.city')) &&
        [...document.querySelectorAll('iframe')].some(frame => frame.contentWindow === event.source);
    } catch {}
    if (!trusted || status?.connected && !event.data.status?.connected && event.source !== statusSource) return;
    const next = event.data.status || {};
    status = {connected: next.connected === true, room: next.room === true, friendsReady: next.friendsReady === true,
      translucent: Math.max(0, Number(next.translucent) || 0), blocked: Math.max(0, Number(next.blocked) || 0)};
    statusSource = event.source; displayStatus();
  });
  window.PixelSquadAntiFlood = {get: () => ({...prefs}), set, settings};
  const started = revision;
  try {chrome.storage.local.get([key]).then(result => {if (revision === started && result?.[key]) apply(result[key]);}).catch(() => {});} catch {}
  try {chrome.storage.onChanged.addListener((changes, area) => {if (area === 'local' && changes[key]) {++revision; apply(changes[key].newValue);}});} catch {}
  send();
})();
