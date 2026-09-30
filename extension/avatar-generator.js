(() => {
  if (window.PixelSquadAvatar) return;
  const pending = new Map(); let sequence = 0;
  let catalog = null, history = [], index = -1, panel = null, previewToken = 0;
  const KEY = 'pixelsquad_avatar_history';
  const validFigure = figure => typeof figure === 'string' && figure.length < 1000 && /^[a-z]{2}-\d+(?:\.\d+)*(?:\.[a-z]{2}-\d+(?:\.\d+)*)*$/.test(figure);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (Array.isArray(saved)) history = saved.filter(x => validFigure(x?.figure) && ['M','F'].includes(x.gender)).slice(-100);
    index = history.length - 1;
  } catch {}
  function request(type, data = {}) {
    return new Promise((resolve, reject) => {
      const requestId = 'avatar_' + ++sequence;
      const timer = setTimeout(() => {pending.delete(requestId); reject(new Error('O jogo não respondeu. Tente novamente com o editor de roupas aberto.'));}, 5000);
      pending.set(requestId, {resolve, reject, timer});
      window.postMessage({source: 'pixelsquad-avatar', type, requestId, ...data}, location.origin);
    });
  }
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'pixelsquad-avatar-result') return;
    const item = pending.get(event.data.requestId); if (!item) return;
    clearTimeout(item.timer); pending.delete(event.data.requestId);
    event.data.result?.error ? item.reject(new Error(event.data.result.error)) : item.resolve(event.data.result);
  });
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const enabled = value => value === true || value === 1 || value === '1' || value === 'true';
  function generate(data, gender) {
    if (!Array.isArray(data?.setTypes) || !Array.isArray(data?.palettes)) throw new Error('O catálogo de roupas do jogo ainda não foi carregado.');
    const parts = [], mandatory = new Set(['hd','hr','ch','lg','sh']);
    for (const type of data.setTypes) {
      if (!/^[a-z]{2}$/.test(type.type)) continue;
      const required = mandatory.has(type.type) || enabled(type['mandatory_' + gender.toLowerCase() + '_0']);
      const sets = (type.sets || []).filter(set => Number.isInteger(set.id) && set.id > 0 && enabled(set.selectable) &&
        !enabled(set.sellable) && Number(set.club || 0) === 0 && [gender, 'U'].includes(set.gender));
      if (!sets.length) { if (required) throw new Error('Não há peças gratuitas suficientes para este tipo de avatar.'); else continue; }
      if (!required && Math.random() < 0.55) continue;
      const set = pick(sets), palette = data.palettes.find(p => Number(p.id) === Number(type.paletteId));
      const colors = (palette?.colors || []).filter(c => Number.isInteger(c.id) && c.id > 0 && enabled(c.selectable) && Number(c.club || 0) === 0);
      const colorCount = Math.max(1, ...(set.parts || []).filter(p => enabled(p.colorable)).map(p => Number(p.colorIndex) || 1));
      if (enabled(set.colorable) && !colors.length) { if (required) throw new Error('As cores desta peça ainda não estão disponíveis.'); else continue; }
      parts.push(type.type + '-' + set.id + (enabled(set.colorable) ? '.' + Array.from({length: Math.min(4, colorCount)}, () => pick(colors).id).join('.') : ''));
    }
    const figure = parts.join('.'); if (!validFigure(figure)) throw new Error('Não foi possível montar um visual válido.');
    return {figure, gender};
  }
  function status(text) { if (panel) panel.querySelector('.ps-avatar-status').textContent = text; }
  function controls() {
    if (!panel) return;
    panel.querySelector('[data-action=previous]').disabled = index <= 0;
    panel.querySelector('[data-action=next]').disabled = index < 0 || index >= history.length - 1;
    panel.querySelector('[data-action=copy]').disabled = index < 0;
    panel.querySelector('.ps-avatar-count').textContent = index < 0 ? 'Nenhum visual gerado' : `Visual ${index + 1} de ${history.length}`;
  }
  async function show() {
    controls(); if (index < 0 || !panel) return;
    const token = ++previewToken, current = history[index], img = panel.querySelector('img');
    panel.querySelector('textarea').value = current.figure;
    panel.querySelector('select').value = current.gender;
    img.hidden = true; img.removeAttribute('src'); status('Carregando prévia…');
    try {
      const result = await request('preview', current);
      if (!panel || token !== previewToken) return;
      if (typeof result?.url !== 'string' || !/^(https:\/\/|data:image\/(png|webp);base64,)/.test(result.url)) throw new Error('Prévia indisponível.');
      img.onload = () => {if (panel && token === previewToken) {img.hidden = false; status('Visual pronto para visualizar e copiar.');}};
      img.onerror = () => {if (panel && token === previewToken) status('Não foi possível carregar a imagem deste visual.');};
      img.src = result.url;
    } catch (error) {if (panel && token === previewToken) status(error.message);}
  }
  async function create() {
    if (!panel) return;
    const currentPanel = panel, gender = panel.querySelector('select').value === 'F' ? 'F' : 'M';
    const buttons = [...panel.querySelectorAll('[data-action=generate],[data-action=new]')];
    buttons.forEach(b => b.disabled = true); status('Gerando visual com as roupas do jogo…');
    try {
      if (!catalog) catalog = (await request('catalog')).catalog;
      if (panel !== currentPanel) return;
      let result;
      for (let attempt = 0; attempt < 10; attempt++) {result = generate(catalog, gender); if (result.figure !== history[index]?.figure) break;}
      history.push(result); history = history.slice(-100); index = history.length - 1;
      try {localStorage.setItem(KEY, JSON.stringify(history));} catch {}
      await show();
    } catch (error) {if (panel === currentPanel) status(error.message);}
    finally {if (panel === currentPanel) buttons.forEach(b => b.disabled = false);}
  }
  function open() {
    if (panel?.isConnected) {panel.focus(); return;}
    panel = document.createElement('section'); panel.id = 'pixelsquad-avatar-generator';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Criar visual aleatório'); panel.tabIndex = -1;
    panel.innerHTML = '<header><strong>👕 Criar visual</strong><button data-action="close" aria-label="Fechar">✕</button></header><label>Tipo de avatar <select><option value="M">Masculino</option><option value="F">Feminino</option></select></label><div class="ps-avatar-preview"><img hidden alt="Prévia do visual gerado"></div><p class="ps-avatar-count"></p><div class="ps-avatar-buttons"><button data-action="generate">Gerar outro</button><button data-action="previous">Voltar ao anterior</button><button data-action="next">Próximo criado</button><button data-action="new">Criar novo</button><button data-action="copy">Copiar visual</button></div><textarea readonly aria-label="Código do visual" placeholder="O código do visual aparecerá aqui"></textarea><p class="ps-avatar-status" role="status"></p><small>Combinações de peças gratuitas do catálogo do jogo. Copiar guarda o código do visual; a roupa atual fica como está.</small>';
    panel.addEventListener('click', async event => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'close') {++previewToken; panel.remove(); panel = null;}
      if (action === 'generate' || action === 'new') await create();
      if (action === 'previous' && index > 0) {index--; await show();}
      if (action === 'next' && index < history.length - 1) {index++; await show();}
      if (action === 'copy' && index >= 0) {
        try {await navigator.clipboard.writeText(history[index].figure); status('Código do visual copiado!');}
        catch {const field = panel?.querySelector('textarea'); field?.focus(); field?.select(); status('Selecione o código e pressione Ctrl+C para copiar.');}
      }
    });
    panel.addEventListener('keydown', event => {if (event.key === 'Escape') panel.querySelector('[data-action=close]').click();});
    document.body.appendChild(panel); panel.focus(); controls(); create();
  }
  window.PixelSquadAvatar = {open, generate};
})();
