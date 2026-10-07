// PixelSquad · Pricilao. IDs are read from the current game's furniture metadata.
(() => {
  if(window.top!==window||window.PixelSquadItemIds)return;
  function settings(parent){
    const section=document.createElement('section');section.className='ps-item-ids';
    section.innerHTML='<h3>Id dos itens</h3><p>Consulte mobílias, lajotas e itens de parede carregados pelo jogo. O ID do tipo de mobi é diferente do ID da oferta da loja e do exemplar no inventário.</p><button type="button" data-load>Carregar IDs do jogo</button><label>Buscar por nome, classe ou ID<input data-search placeholder="Ex.: lajota, bloco ou #123"></label><label>Mostrar<select data-filter><option value="all">Todos os itens</option><option value="owned">Itens que tenho no inventário</option><option value="s">Mobis de piso</option><option value="i">Mobis de parede</option></select></label><p data-status role="status"></p><div data-list></div><button type="button" data-more hidden>Mostrar mais 50</button>';
    parent.append(section);let items=[],limit=50;
    const get=s=>section.querySelector(s),normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    function render(){
      const q=normalize(get('[data-search]').value).trim(),filter=get('[data-filter]').value;
      const found=items.filter(item=>(!q||(/^#?\d+$/.test(q)?item.id===Number(q.replace('#','')):item.search.includes(q)))&&(filter==='all'||filter==='owned'&&item.stock>0||filter===item.type));
      const list=get('[data-list]');list.replaceChildren();
      for(const item of found.slice(0,limit)){
        const row=document.createElement('article'),title=document.createElement('strong'),info=document.createElement('small'),copy=document.createElement('button'),use=document.createElement('button');
        title.textContent=item.name;info.textContent=`ID ${item.id} · ${item.type==='i'?'Parede':'Piso'} · ${item.width} × ${item.length} · ${item.stock??'?'} no inventário · ${item.className}`;
        copy.type=use.type='button';copy.textContent='Copiar ID';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(String(item.id));get('[data-status]').textContent=`ID ${item.id} copiado.`;}catch{get('[data-status]').textContent=`Não foi possível copiar automaticamente. ID: ${item.id}`;}});
        use.textContent='Usar no construtor';use.disabled=!item.compatible;use.title=item.compatible?'Selecionar este tipo de mobi para o projeto':'Os projetos atuais usam apenas mobis de piso 1 × 1.';
        use.addEventListener('click',()=>window.PixelSquadBuilder?.useMaterial(item.id));row.append(title,info,copy,use);list.append(row);
      }
      get('[data-status]').textContent=`${found.length} itens encontrados · mostrando ${Math.min(limit,found.length)}.`;get('[data-more]').hidden=found.length<=limit;
    }
    get('[data-load]').addEventListener('click',async()=>{
      const button=get('[data-load]');button.disabled=true;get('[data-status]').textContent='Lendo IDs e inventário do jogo…';
      try{const result=await window.PixelSquadBuilder.getItemIds();if(!section.isConnected)return;items=result.items.map(item=>({...item,search:normalize(`${item.name} ${item.className}`)}));limit=50;render();if(result.warnings.length)get('[data-status]').textContent+=' '+result.warnings.join(' ');}
      catch(error){get('[data-status]').textContent=error.message;}finally{button.disabled=false;}
    });
    get('[data-search]').addEventListener('input',()=>{limit=50;render();});get('[data-filter]').addEventListener('change',()=>{limit=50;render();});get('[data-more]').addEventListener('click',()=>{limit+=50;render();});
  }
  window.PixelSquadItemIds=Object.freeze({settings});
})();
