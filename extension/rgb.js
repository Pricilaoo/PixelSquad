(() => {
  if (window.PixelSquadRGB) return;
  const KEY = 'pixelsquad_rgb';
  const defaults = {enabled:false,text:false,sidebar:false,toolbar:false,purse:false,intensity:75,transparency:65,animated:false};
  let prefs = {...defaults}, revision = 0;
  const clamp = (value, fallback) => Number.isFinite(Number(value)) ? Math.max(0,Math.min(100,Number(value))) : fallback;
  function normalize(value) {
    const data = value && typeof value === 'object' ? value : {};
    const out = {...defaults};
    for (const key of ['enabled','text','sidebar','toolbar','purse','animated']) out[key] = data[key] === true;
    out.intensity = clamp(data.intensity, defaults.intensity);
    out.transparency = clamp(data.transparency, defaults.transparency);
    return out;
  }
  function apply(value) {
    prefs = normalize(value);
    const root = document.documentElement;
    if (!root) return;
    for (const key of ['text','sidebar','toolbar','purse','animated']) root.classList.toggle('ps-rgb-' + key, prefs.enabled && prefs[key]);
    root.style.setProperty('--ps-rgb-saturation', prefs.intensity + '%');
    root.style.setProperty('--ps-rgb-alpha', String((100 - prefs.transparency) / 100));
  }
  function set(value) {
    ++revision; apply({...prefs,...value});
    try {localStorage.setItem(KEY,JSON.stringify(prefs));} catch {}
    try {const task = chrome.storage.local.set({[KEY]:prefs}); task?.catch?.(() => {});} catch {}
  }
  function settings(main) {
    const section = document.createElement('section'); section.className = 'panel-position-settings ps-rgb-settings';
    section.innerHTML = '<h3>RGB multicolorido</h3><p class="muted">Escolha as áreas que terão várias cores ao mesmo tempo. As alterações são aplicadas na hora.</p><div class="ps-custom-grid"></div>';
    const grid = section.querySelector('.ps-custom-grid');
    const add = (key,label,type) => {
      const row = document.createElement('label'), title = document.createElement('span'), input = document.createElement('input');
      title.textContent = label; input.type = type; input.dataset.rgb = key;
      row.append(title,input);
      const output = document.createElement('output');
      if (type === 'checkbox') {input.checked = prefs[key]; row.className = 'ps-toggle';}
      else {input.min = '0'; input.max = '100'; input.step = '1'; input.value = String(prefs[key]); output.textContent = input.value + '%'; row.append(output);}
      input.addEventListener('input', () => {set({[key]:type === 'checkbox' ? input.checked : Number(input.value)}); if(type === 'range') output.textContent = input.value + '%';});
      grid.append(row);
    };
    add('enabled','Ativar RGB','checkbox');
    add('text','Letras do painel e das barras','checkbox');
    add('sidebar','Menu lateral da PixelSquad','checkbox');
    add('toolbar','Barra inferior do jogo','checkbox');
    add('purse','Moedas, conchas e asinhas','checkbox');
    add('animated','Movimento suave das cores','checkbox');
    add('intensity','Intensidade das cores','range');
    add('transparency','Transparência do RGB','range');
    const hint = document.createElement('p'); hint.className = 'muted';
    hint.textContent = 'Intensidade: 0% deixa as cores neutras e 100% deixa mais vivas. Transparência: 100% deixa o RGB invisível.';
    const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'Restaurar RGB padrão';
    reset.addEventListener('click', () => {set(defaults); section.remove(); settings(main);});
    section.append(hint,reset); main.querySelector('.panel-position-settings').before(section);
  }
  window.PixelSquadRGB = {set,get:() => ({...prefs}),settings};
  try {apply(JSON.parse(localStorage.getItem(KEY) || 'null'));} catch {apply(defaults);}
  const started = revision;
  try {chrome.storage.local.get([KEY]).then(result => {if (revision === started && result?.[KEY]) apply(result[KEY]);}).catch(() => {});} catch {}
  try {chrome.storage.onChanged.addListener((changes,area) => {if(area === 'local' && changes[KEY]) {++revision; apply(changes[KEY].newValue);}});} catch {}
})();
