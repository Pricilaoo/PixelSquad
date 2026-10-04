(() => {
  if(window.top!==window || window.PixelSquadBuilder || !window.PixelSquadBuilderProjects) return;
  const projects=window.PixelSquadBuilderProjects, pending=new Map();
  let searchTimer=null, previewKey='', searchItems=[];
  let root=null,target=null,serial=0,snapshot=null,quote=null,origin=null,busy=false,selectionId=null,operationId=null,current='platform',rotation=0,refreshRevision=0;
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const get=id=>root?.querySelector(`[data-id="${id}"]`);
  const isTrusted=event=>event.source===window || /^https:\/\/([\w-]+\.)*habblet\.city$/.test(event.origin||'') && [...document.querySelectorAll('iframe')].some(frame=>frame.contentWindow===event.source);
  function rpc(action,data={},options={}) {
    const requestId=`builder-${Date.now()}-${++serial}`;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(requestId);reject(Error(action==='build'||action==='buy'?'A operação ainda não respondeu. Clique em Parar e confira o quarto e o inventário.':'O construtor não recebeu uma resposta do jogo. Entre em um quarto e tente novamente.'));},options.timeout||35000);
      pending.set(requestId,{resolve,reject,timer,target:options.discover?null:target});
      const message={source:'pixelsquad',type:'PS_BUILDER_REQUEST',requestId,action,data};
      if(options.discover) {window.postMessage(message,'*'); for(const frame of document.querySelectorAll('iframe')) {try {const url=new URL(frame.src,location.href);if(url.protocol==='https:' && /(^|\.)habblet\.city$/.test(url.hostname)) frame.contentWindow.postMessage(message,'*');} catch {}}}
      else if(target) target.postMessage(message,'*');
      else {clearTimeout(timer);pending.delete(requestId);reject(Error('Conecte o construtor ao quarto primeiro.'));}
      if(action==='select') selectionId=requestId;
      if(action==='build'||action==='buy')operationId=requestId;
    });
  }
  window.addEventListener('message',event=>{
    if(!isTrusted(event)||event.data?.source!=='pixelsquad') return;
    const message=event.data;
    if(message.type==='PS_BUILDER_REPLY') {
      const entry=pending.get(message.requestId); if(!entry || entry.target && event.source!==entry.target) return;
      // Discovery binds all subsequent mutations to exactly one native client frame.
      if(!entry.target && !message.ok) return;
      if(!entry.target) target=event.source;
      clearTimeout(entry.timer);pending.delete(message.requestId); message.ok?entry.resolve(message.data):entry.reject(Error(message.error));
    }
    if(message.type==='PS_BUILDER_EVENT' && event.source===target && root) {
      if(message.event==='origin' && message.requestId===selectionId) {
        origin=message.data;selectionId=null;root.classList.remove('ps-builder-minimized');get('minimize').setAttribute('aria-expanded','true');get('origin').textContent=`Piso (${origin.x}, ${origin.y}) · quarto ${origin.roomId}`;status('Piso selecionado. Confira a prévia e os materiais para construir.');
      }
      if(message.event==='selection-cancelled' && message.requestId===selectionId) {selectionId=null;root.classList.remove('ps-builder-minimized');get('minimize').setAttribute('aria-expanded','true');status(message.data.message);}
      if(message.event==='progress' && message.requestId===operationId) {
        const data=message.data;
        get('progress').hidden=false;get('progress-bar').max=data.total || 1;get('progress-bar').value=data.placed;
        get('progress-text').textContent=data.phase==='buy'?`Comprando materiais · ${data.bought} itens confirmados`:data.phase==='done'?`Concluído · ${data.placed} blocos colocados · ${data.bought} comprados`:`${data.placed} de ${data.total} blocos · ${data.bought} comprados`;
        if(data.message) status(data.message,true);
      }
    }
  });
  function status(message,error=false) {if(!root)return;get('status').textContent=message;get('status').classList.toggle('ps-builder-error',error);}
  function setBusy(value) {
    busy=value;if(!root)return;
    for(const input of root.querySelectorAll('input,select,[data-project],[data-id=suggest],[data-id=refresh],[data-id=rotate],[data-id=select],[data-id=buy],[data-id=build]')) input.disabled=value || input.dataset.unavailable==='true';
    get('stop').hidden=!value;
  }
  function planInput() {return {project:current,width:Number(get('width').value),length:Number(get('length').value),height:Number(get('height').value),rotation};}
  function materials() {return Object.fromEntries(['base','body','finish'].map(role=>[role,Number(get(role).value)]));}
  function preview() {
    if(!root)return;quote=null;get('materials-table').innerHTML='';get('cost').textContent='Atualize os materiais para conferir o inventário e os preços.';
    try {
      const plan=projects.create(planInput()),scale=20,zscale=18,points=plan.cells.map(cell=>({cell,x:(cell.x-cell.y)*scale,y:(cell.x+cell.y)*scale*.5-cell.z*zscale}));
      const minX=Math.min(...points.map(p=>p.x))-scale-8,maxX=Math.max(...points.map(p=>p.x))+scale+8,minY=Math.min(...points.map(p=>p.y))-zscale-8,maxY=Math.max(...points.map(p=>p.y))+scale+12;
      const colors={base:['#82ddcb','#45a997','#2a796e'],body:['#bfabf6','#8972c3','#625089'],finish:['#ffcf8d','#cf9b54','#947141']};
      points.sort((a,b)=>a.cell.x+a.cell.y-b.cell.x-b.cell.y || a.cell.z-b.cell.z);
      const key=JSON.stringify(planInput());
      if(key!==previewKey || !get('preview').firstChild) {
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`Prévia de ${plan.name} com ${plan.cells.length} blocos`);
        const ctx=canvas.getContext('2d'),width=maxX-minX,height=maxY-minY,zoom=Math.min(canvas.width/width,canvas.height/height);
        ctx.translate((canvas.width-width*zoom)/2-minX*zoom,(canvas.height-height*zoom)/2-minY*zoom);ctx.scale(zoom,zoom);
        const polygon=(vertices,color)=>{ctx.fillStyle=color;ctx.beginPath();vertices.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();};
        for(const {cell,x,y} of points){const c=colors[cell.role];polygon([[x,y-zscale],[x+scale,y+scale*.5-zscale],[x,y+scale-zscale],[x-scale,y+scale*.5-zscale]],c[0]);polygon([[x-scale,y+scale*.5-zscale],[x,y+scale-zscale],[x,y+scale],[x-scale,y+scale*.5]],c[1]);polygon([[x,y+scale-zscale],[x+scale,y+scale*.5-zscale],[x+scale,y+scale*.5],[x,y+scale]],c[2]);}
        get('preview').replaceChildren(canvas);previewKey=key;
      }
      get('size').textContent=`${plan.width} × ${plan.length} pisos · ${plan.height} ${plan.height===1?'camada':'camadas'} · ${plan.cells.length} blocos`;
      get('project-name').textContent=plan.name;
      status('Confira a prévia e clique em Atualizar materiais antes de construir.');
      const roles=new Set(plan.cells.map(cell=>cell.role));for(const role of ['base','body','finish']) get(role).closest('label').hidden=!roles.has(role);
    } catch(error) {get('preview').innerHTML='';get('size').textContent='Ajuste as medidas do projeto.';status(error.message,true);}
  }
  function cards(query='') {
    const list=projects.suggest(query);
    get('projects').innerHTML=(list.length?list:projects.projects).map(project=>`<button type="button" data-project="${project.id}" class="${project.id===current?'selected':''}" title="${escape(project.description)}"><span>${project.icon}</span>${project.name}</button>`).join('');
    get('suggestion').textContent=query.trim()?(list.length?`${list.length} projeto(s) da biblioteca combinam com a descrição.`:'Não há um projeto pronto para essa descrição. Escolha uma das opções abaixo.'):'Escolha um projeto ou descreva o que quer montar.';
  }
  function choose(id,text='') {
    const project=projects.projects.find(item=>item.id===id);if(!project)return;
    current=id;const dims=projects.dimensions(text,project);for(const key of ['width','length','height']) get(key).value=dims[key];rotation=0;cards(get('description').value);preview();
  }
  function currency(offer) {return offer.currency===0?'duckets':offer.currency===5?'diamantes':`moeda ${offer.currency}`;}
  function price(offer,packs) {if(!offer)return 'Indisponível';const parts=[];if(offer.credits) parts.push(`${offer.credits*packs} créditos`);if(offer.points) parts.push(`${offer.points*packs} ${currency(offer)}`);return parts.join(' + ') || 'Grátis';}
  function costs() {
    if(!quote)return;
    const totals=new Map();let unknown=false;
    for(const row of quote.rows) {
      const quantity=get('auto-buy').checked?row.missing:Number(root.querySelector(`[data-buy-id="${row.id}"]`)?.value||0),packs=row.offer?Math.ceil(quantity/row.offer.productCount):0;
      const cell=root.querySelector(`[data-price-id="${row.id}"]`);if(cell) cell.textContent=quantity?price(row.offer,packs):'—';
      if(quantity&&!row.offer)unknown=true;
      if(row.offer&&packs) {totals.set('créditos',(totals.get('créditos')||0)+row.offer.credits*packs);const unit=currency(row.offer);totals.set(unit,(totals.get(unit)||0)+row.offer.points*packs);}
    }
    const values=[...totals].filter(([,amount])=>amount>0).map(([unit,amount])=>`${amount} ${unit}`);
    get('cost').textContent=unknown?'Existem itens sem oferta de compra. Use o inventário ou escolha outro bloco.':`${get('auto-buy').checked?'Compra automática para o projeto':'Compra selecionada'}: ${values.join(' + ') || 'sem custo'}${quote.rows.some(row=>row.offer?.productCount>1)?' · quantidades arredondadas por pacote do catálogo':''}`;
  }
  function acceptSnapshot(value) {
    snapshot=value;searchItems=value.materials.map(item=>({...item,search:projects.normalize(`${item.name} ${item.className} ${item.id}`)}));
    const selected=get('catalog-page').value;get('catalog-page').innerHTML='<option value="">Escolha uma página da loja</option>'+(value.pages||[]).map(page=>`<option value="${page.id}">${escape(page.name)}</option>`).join('');if((value.pages||[]).some(page=>String(page.id)===selected))get('catalog-page').value=selected;
    get('sources').textContent=`Inventário: ${value.inventoryReady?value.inventoryCount+' mobis':'aguardando resposta'} · Loja: ${value.indexReady?(value.pages?.length||0)+' páginas':'aguardando resposta'}. Apenas mobis de 1 × 1 são compatíveis com estes projetos.`;
  }
  async function refresh(force=true) {
    if(busy)return;quote=null;const revision=++refreshRevision;setBusy(true);status('Consultando o catálogo e o inventário…');
    try {
      if(!target) await rpc('discover',{}, {discover:true,timeout:8000});
      if(!root||revision!==refreshRevision)return;
      const received=await rpc('snapshot',{force});if(!root||revision!==refreshRevision)return;acceptSnapshot(received);
      get('room').textContent=`Quarto ${snapshot.roomId}${snapshot.rights?' · construção disponível':' · sem direitos de construção'}`;
      if(origin?.roomId!==snapshot.roomId) {origin=null;get('origin').textContent='Nenhum piso selecionado';}
      populate();
      if(!snapshot.inventoryReady || !Object.values(materials()).some(Boolean)){quote=null;status(snapshot.warnings?.join(' ') || 'Escolha os blocos do inventário ou carregue uma página da loja.',!!snapshot.warnings?.length);return;}
      const value=await rpc('quote',{plan:planInput(),materials:materials()});if(!root||revision!==refreshRevision)return;quote=value;
      get('materials-table').innerHTML=`<table><thead><tr><th>Mobi do catálogo</th><th>Projeto</th><th>Tenho</th><th>Faltam</th><th>Comprar</th><th>Custo</th></tr></thead><tbody>${quote.rows.map(row=>`<tr><td><strong>${escape(row.name)}</strong><small>#${row.id}${row.offer?` · ${row.offer.productCount} por pacote`:''}</small>${row.purchaseError?`<small class="ps-builder-unavailable">${escape(row.purchaseError)}</small>`:''}</td><td>${row.quantity}</td><td>${row.available}</td><td>${row.missing}</td><td><input type="number" min="0" max="4096" step="1" data-buy-id="${row.id}" data-unavailable="${row.offer?'false':'true'}" value="${row.missing}" aria-label="Quantidade de ${escape(row.name)} para comprar" ${row.offer?'':'disabled'}></td><td data-price-id="${row.id}"></td></tr>`).join('')}</tbody></table>`;
      costs();status(snapshot.warnings?.join(' ') || 'Materiais conferidos. Selecione o piso para construir.',!!snapshot.warnings?.length);
    } catch(error) {if(root&&revision===refreshRevision)status(error.message,true);} finally {if(root&&revision===refreshRevision)setBusy(false);}
  }
  function populate() {
    if(!snapshot)return;const query=projects.normalize(get('material-search').value),source=get('material-source').value;
    const matches=searchItems.filter(item=>(!query||item.search.includes(query)) && (source==='inventory'?item.stock>0:source==='shop'?item.inShop:true));
    const limited=matches.slice(0,100);
    for(const role of ['base','body','finish']) {
      const select=get(role),previous=Number(select.value),chosen=searchItems.find(item=>item.id===previous) || (!previous&&matches.find(item=>item.block && item.stock>0)) || (!previous&&matches.find(item=>item.block));
      const visible=limited.slice();if(chosen&&!visible.some(item=>item.id===chosen.id))visible.unshift(chosen);
      select.innerHTML='<option value="0">Escolha um bloco de 1 × 1</option>'+visible.map(item=>`<option value="${item.id}">${escape(item.name)} · #${item.id} · ${item.stock??'?'} no inventário${item.inShop?' · loja':''}</option>`).join('');select.value=String(chosen?.id||0);
    }
    get('material-results').textContent=matches.length>100?`${matches.length} resultados; mostrando 100. Digite mais detalhes para encontrar o item.`:`${matches.length} mobis compatíveis encontrados.`;
  }
  async function catalogPage() {
    if(busy||!get('catalog-page').value)return;const active=root;setBusy(true);status('Consultando a página da loja…');
    try {const value=await rpc('catalog-page',{pageId:Number(get('catalog-page').value)});if(root!==active)return;acceptSnapshot(value);populate();invalidateMaterials();status('Página da loja vinculada. Escolha os blocos e atualize os materiais.');}
    catch(error){if(root===active)status(error.message,true);}finally{if(root===active)setBusy(false);}
  }
  function invalidateMaterials(){quote=null;get('materials-table').innerHTML='';get('cost').textContent='Atualize os materiais para conferir as quantidades e os preços.';}
  async function selectFloor() {
    try {if(!target)await rpc('discover',{}, {discover:true,timeout:8000});await rpc('select');status('Clique no piso do quarto onde a construção deve começar. Esc cancela.');root.classList.add('ps-builder-minimized');get('minimize').setAttribute('aria-expanded','false');document.getElementById('ps-close')?.click();}
    catch(error){status(error.message,true);}
  }
  async function execute(action) {
    if(busy)return;
    if(action==='build'&&!origin) {status('Selecione primeiro o piso do quarto.',true);return;}
    const activeRoot=root;
    // Changing a template, dimension or material invalidates the quote. Recalculate
    // on Build so a normal edit does not silently turn construction into a dead end.
    if(action==='build'&&!quote) {await refresh(false);if(root!==activeRoot||!quote)return;}
    if(!quote) {status('Clique em Atualizar materiais para conferir as quantidades de compra.',true);return;}
    if(action==='build'&&!origin) {status('O quarto mudou. Selecione o piso novamente.',true);return;}
    setBusy(true);status(action==='buy'?'Comprando as quantidades selecionadas…':'Iniciando construção…');get('progress').hidden=false;
    try {
      const quantities=Object.fromEntries(quote.rows.map(row=>[row.id,Number(root.querySelector(`[data-buy-id="${row.id}"]`)?.value||0)]));
      const result=await rpc(action,{quoteId:quote.id,origin,autoBuy:get('auto-buy').checked,quantities},{timeout:7200000});
      if(root===activeRoot){status(action==='buy'?`Compra concluída: ${result.bought} itens. Atualize os materiais para construir.`:`Construção concluída: ${result.placed} blocos colocados.`);quote=null;}
    } catch(error) {if(root===activeRoot)status(error.message,true);} finally {if(root===activeRoot){setBusy(false);operationId=null;}}
  }
  function close() {
    ++refreshRevision;clearTimeout(searchTimer);searchTimer=null;previewKey='';searchItems=[];if(target)rpc('cancel').catch(()=>{});
    root?.remove();window.removeEventListener('resize',resize);root=null;busy=false;selectionId=null;operationId=null;quote=null;origin=null;
  }
  function movable() {
    const header=get('header');let drag=null;
    const clamp=(x,y)=>{const rect=root.getBoundingClientRect();root.style.left=`${Math.max(0,Math.min(x,innerWidth-rect.width))}px`;root.style.top=`${Math.max(0,Math.min(y,innerHeight-48))}px`;};
    try {const saved=JSON.parse(localStorage.getItem('pixelsquad_builder_position')||'null');if(saved)clamp(saved.x,saved.y);}catch{}
    header.addEventListener('pointerdown',event=>{if(event.button!==0||event.target.closest('button'))return;const rect=root.getBoundingClientRect();drag={x:event.clientX-rect.left,y:event.clientY-rect.top};header.setPointerCapture(event.pointerId);event.preventDefault();});
    header.addEventListener('pointermove',event=>{if(drag)clamp(event.clientX-drag.x,event.clientY-drag.y);});
    header.addEventListener('pointerup',()=>{if(!drag)return;drag=null;try{const rect=root.getBoundingClientRect();localStorage.setItem('pixelsquad_builder_position',JSON.stringify({x:rect.left,y:rect.top}));}catch{}});
    window.addEventListener('resize',resize);
  }
  function resize(){if(!root)return;const rect=root.getBoundingClientRect();root.style.left=`${Math.max(0,Math.min(rect.left,innerWidth-rect.width))}px`;root.style.top=`${Math.max(0,Math.min(rect.top,innerHeight-48))}px`;}
  function open() {
    if(window.PixelSquadGame?.refresh()!==true)return;
    if(root){root.classList.remove('ps-builder-minimized');get('minimize').setAttribute('aria-expanded','true');return;}
    root=document.createElement('section');root.id='pixelsquad-builder';root.setAttribute('role','dialog');root.setAttribute('aria-label','Construtor de projetos PixelSquad');
    root.innerHTML=`<header data-id="header"><div><small>PIXELSQUAD / CONSTRUÇÃO</small><strong>Construtor de projetos</strong></div><div><button data-id="minimize" aria-label="Minimizar ou expandir construtor" aria-expanded="true">−</button><button data-id="close" aria-label="Fechar construtor">×</button></div></header><div class="ps-builder-body"><p data-id="room" class="ps-builder-room">Conectando ao quarto…</p><div class="ps-builder-prompt"><label for="ps-builder-description">O que você quer construir?</label><div><input id="ps-builder-description" data-id="description" placeholder="Ex.: castelo 8x8 com altura 4" maxlength="300"><button data-id="suggest">Buscar projetos</button></div><small data-id="suggestion"></small></div><div data-id="projects" class="ps-builder-projects"></div><div class="ps-builder-workspace"><div class="ps-builder-preview"><div class="ps-builder-preview-title"><strong data-id="project-name"></strong><button data-id="rotate" title="Girar projeto 90 graus">↻ Girar</button></div><div data-id="preview"></div><strong data-id="size"></strong><small>Prévia em blocos. A altura final depende dos mobis escolhidos.</small></div><div class="ps-builder-options"><div class="ps-builder-dimensions"><label>Largura<input data-id="width" type="number" min="1" max="16" value="5"></label><label>Comprimento<input data-id="length" type="number" min="1" max="16" value="5"></label><label>Altura<input data-id="height" type="number" min="1" max="8" value="1"></label></div><label>Página da loja<select data-id="catalog-page"><option value="">Carregando páginas…</option></select></label><label>Mostrar<select data-id="material-source"><option value="all">Todos os mobis compatíveis</option><option value="inventory">Meu inventário</option><option value="shop">Itens das páginas carregadas da loja</option></select></label><label>Buscar mobis<input data-id="material-search" placeholder="Nome do bloco ou número do mobi"></label><small data-id="material-results"></small><small data-id="sources"></small><label>Base<select data-id="base"><option value="0">Carregando catálogo…</option></select></label><label>Estrutura<select data-id="body"><option value="0">Carregando catálogo…</option></select></label><label>Acabamento<select data-id="finish"><option value="0">Carregando catálogo…</option></select></label><small>Use mobis de 1 × 1 que permitam empilhamento.</small></div></div><div class="ps-builder-materials"><div><h3>Materiais e compra</h3><button data-id="refresh">Atualizar materiais</button></div><div data-id="materials-table" class="ps-builder-table"></div><p data-id="cost"></p><label class="ps-builder-checkbox"><input type="checkbox" data-id="auto-buy">Comprar automaticamente os itens que faltam antes de construir</label><button data-id="buy">Comprar quantidades selecionadas</button></div><div class="ps-builder-location"><div><strong>Onde construir</strong><small data-id="origin">Nenhum piso selecionado</small></div><button data-id="select">Selecionar piso no quarto</button></div><div data-id="progress" hidden><progress data-id="progress-bar" max="1" value="0"></progress><small data-id="progress-text"></small></div><p data-id="status" role="status" aria-live="polite"></p><div class="ps-builder-actions"><button data-id="stop" hidden>Parar</button><button data-id="build" class="ps-builder-primary">Construir projeto</button></div><footer>Feito por Pricilao. · PixelSquad</footer></div>`;
    document.body.append(root);cards();preview();movable();
    root.addEventListener('click',event=>{
      const card=event.target.closest('[data-project]');if(card&&!busy)choose(card.dataset.project);
      const button=event.target.closest('button[data-id]');if(!button)return;
      const id=button.dataset.id;
      if(id==='close')close();
      if(id==='minimize') {const minimized=root.classList.toggle('ps-builder-minimized');button.setAttribute('aria-expanded',String(!minimized));}
      if(id==='suggest'&&!busy){const query=get('description').value,list=projects.suggest(query);if(list.length)choose(list[0].id,query);else cards(query);}
      if(id==='rotate'&&!busy){rotation=(rotation+1)%4;preview();}
      if(id==='refresh')refresh();if(id==='select')selectFloor();if(id==='buy'||id==='build')execute(id);
      if(id==='stop'){rpc('cancel').catch(error=>status(error.message,true));status('Interrompendo a operação…');}
    });
    root.addEventListener('input',event=>{
      if(['width','length','height'].includes(event.target.dataset.id))preview();
      if(['base','body','finish'].includes(event.target.dataset.id))invalidateMaterials();
      if(event.target.dataset.id==='material-search'&&snapshot) {clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(root)populate();},160);}
      if(event.target.dataset.id==='material-source')populate();
      if(event.target.dataset.id==='catalog-page')catalogPage();
      if(event.target.dataset.buyId)costs();
      if(event.target.dataset.id==='auto-buy')costs();
    });
    get('description').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();get('suggest').click();}});
    refresh();
  }
  window.addEventListener('pixelsquad-game-change',()=>{if(window.PixelSquadGame?.active!==true){close();target=null;}});
  window.addEventListener('pagehide',close);
  window.PixelSquadBuilder=Object.freeze({open,close,toggle:()=>root?close():open()});
})();
