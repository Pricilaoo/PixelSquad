(() => {
  if (window.__PIXELSQUAD_BUILDER_BRIDGE__ || !window.PixelSquadBuilderProjects) return;
  window.__PIXELSQUAD_BUILDER_BRIDGE__ = true;
  const projects = window.PixelSquadBuilderProjects, FLOOR = 10, inventory = new Map(), fragments = new Set(), pages = new Map(), offers = new Map(), quotes = new Map(), requests = new Map(), waiters = new Set(), stockByType = new Map(), catalogPages = new Map(), loadedPages = new Set(), offersByType = new Map();
  const observedHeaders = new Set([1032,804,994,104,159,3151,1866,2491,869,1404,3770,1534]);
  let metadataCache=null, syncPending=null;
  let native = null, connection = null, unsubscribe = null, inventoryReady = false, indexReady = false, catalogRevision = 0, fragmentTotal = 0, selection = null, job = null, serial = 0, latestPlacement = null, nativeEvents=[];
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const trusted = event => event.source === window || event.source === window.top && /^https:\/\/([\w-]+\.)*habblet\.city$/.test(event.origin || '');
  const engine = () => native?.roomEngine;
  const session = () => engine()?.roomSessionManager?.getSession(-1);
  function connect() {
    if (native !== window.PixelSquadNativeClient) {unsubscribe?.(); native = window.PixelSquadNativeClient; unsubscribe = native?.subscribeMessages(observe);}
    if (connection !== native?.connection) {
      if (job) job.cancelled = true;
      releaseEvents();
      connection = native?.connection; clearInventory(); fragments.clear(); inventoryReady = indexReady = false; pages.clear(); catalogPages.clear(); loadedPages.clear(); offersByType.clear(); metadataCache=null; offers.clear(); quotes.clear(); ++catalogRevision;
    }
    return connection;
  }
  function releaseEvents() {for(const value of nativeEvents)try{connection?.removeMessageEvent(value);}catch{}nativeEvents=[];}
  function ensureEvents() {
    if(nativeEvents.length)return;
    const registry=connection?._messages?._messageIdByEvent;
    if(!registry || typeof connection.addMessageEvent!=='function')throw Error('O cliente não disponibilizou os eventos do catálogo e do inventário.');
    // Keep native parsers registered even while the game's catalog/inventory is closed.
    try {
      for(const header of [1032,804,869,1404,3770,1866,994,104,159,3151,1534,2491]) {
        const Constructor=[...registry].find(entry=>entry[1]===header)?.[0];
        if(typeof Constructor!=='function')throw Error('Esta versão do cliente não disponibiliza todos os eventos de construção.');
        const value=new Constructor(()=>{});if(typeof value.parserClass!=='function')throw Error('O formato dos eventos do cliente mudou.');
        connection.addMessageEvent(value);nativeEvents.push(value);
      }
    } catch(error) {releaseEvents();throw error;}
  }
  function ready(roomId) {
    connect(); const room = session();
    if (!engine() || engine().disposed || !connection || connection.disposed || connection.isAuthenticated !== true || connection._isReady !== true) throw Error('Entre no jogo e aguarde a conexão do cliente.');
    ensureEvents();
    if (!room || !Number.isSafeInteger(room.roomId) || room.roomId <= 0) throw Error('Entre em um quarto para usar o construtor.');
    if (roomId !== undefined && room.roomId !== roomId) throw Error('O quarto mudou. Selecione o piso novamente.');
    return room;
  }
  function permitted(roomId) {
    const room = ready(roomId);
    if (room.isSpectator || !(room.controllerLevel >= 1)) throw Error('Você precisa de direitos de construção neste quarto.');
    return room;
  }
  // Registered native classes retain the client's codec, authentication and send queue.
  // Contracts: nitro-renderer 9e9a623, SocketConnection / MessageClassManager.
  function composer(header, args, expected) {
    const registry = connection?._messages?._messageIdByComposer;
    const Constructor = registry && [...registry].find(entry => entry[1] === header)?.[0];
    if (typeof Constructor !== 'function') throw Error('Esta versão do cliente não disponibiliza a ação de construção solicitada.');
    const value = new Constructor(...args), actual = value.getMessageArray?.();
    if (!Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected)) throw Error('A ação do cliente mudou. Atualize a integração antes de continuar.');
    return value;
  }
  function send(header, args, expected) {
    ready(); const value = composer(header, args, expected);
    if (connection.send(value) !== true) throw Error('O cliente não enviou a ação. Aguarde a conexão e tente novamente.');
  }
  function wake() {for (const callback of [...waiters]) callback();}
  function observe(header, parser) {
    if (!parser || !observedHeaders.has(header)) return;
    if (header === 1032 && String(parser.catalogType).toUpperCase() === 'NORMAL') {
      pages.clear(); catalogPages.clear();
      const visit = node => {if (!node || node.visible === false) return; if (node.pageId >= 0) {catalogPages.set(Number(node.pageId),{id:Number(node.pageId),name:String(node.localization || node.pageName || `Página ${node.pageId}`)});for (const id of node.offerIds || []) pages.set(Number(id), Number(node.pageId));} for (const child of node.children || []) visit(child);};
      visit(parser.root); indexReady = true;
    }
    if (header === 804 && String(parser.catalogType).toUpperCase() === 'NORMAL') {
      loadedPages.add(Number(parser.pageId));
      for (const offer of parser.offers || []) {
        const product = offer.products?.[0];
        if (offer.products?.length !== 1 || String(product?.productType).toLowerCase() !== 's' || offer.rent || offer.isPet || product.uniqueLimitedItem || !Number.isSafeInteger(product.productCount) || product.productCount <= 0) continue;
        if (![offer.priceCredits, offer.priceActivityPoints].every(value => Number.isFinite(value) && value >= 0)) continue;
        const id=Number(offer.offerId), value={pageId:Number(parser.pageId), offerId:id, id:Number(product.furniClassId), productCount:product.productCount, extra:String(product.extraParam || ''), credits:offer.priceCredits, points:offer.priceActivityPoints, currency:offer.priceActivityPointsType, bulk:!!offer.bundlePurchaseAllowed};
        const previous=offers.get(id);offers.set(id,previous && JSON.stringify(previous)===JSON.stringify(value)?previous:value);
        pages.set(id,value.pageId);const ids=offersByType.get(value.id)||new Set();ids.add(id);offersByType.set(value.id,ids);
      }
    }
    if (header === 994) {
      if (parser.fragmentNumber === 0 || fragmentTotal !== parser.totalFragments) {clearInventory(); fragments.clear(); fragmentTotal = parser.totalFragments; inventoryReady = false;}
      for (const item of parser.fragment?.values?.() || []) putItem(item);
      fragments.add(parser.fragmentNumber); inventoryReady = fragmentTotal === 0 && inventory.size === 0 || fragmentTotal > 0 && fragments.size === fragmentTotal;
    }
    if (header === 104) for (const item of parser.items || []) putItem(item);
    if (header === 159) removeItem(Number(parser.itemId));
    if (header === 3151) inventoryReady = false;
    if (header === 1866) {indexReady = false; offers.clear(); offersByType.clear(); pages.clear(); catalogPages.clear(); loadedPages.clear(); quotes.clear(); ++catalogRevision; if (job) job.error = 'O catálogo mudou. Confira os preços novamente.';}
    if (header === 2491) {inventoryReady = indexReady = false; clearInventory(); fragments.clear(); pages.clear(); catalogPages.clear(); loadedPages.clear(); offersByType.clear(); metadataCache=null; offers.clear(); quotes.clear(); ++catalogRevision; if (job) job.cancelled = true;}
    if (header === 869 && job?.purchase?.offerId === parser.offer?.offerId) job.purchase.confirmed = true;
    if ((header === 1404 || header === 3770) && job?.purchase) job.error = 'O catálogo recusou a compra. Verifique o saldo e a disponibilidade dos itens.';
    if (header === 1534) latestPlacement = parser.item && {ref:parser.item.itemId, id:parser.item.spriteId, x:parser.item.x, y:parser.item.y, z:parser.item.z};
    wake();
  }
  function copyItem(item) {return {itemId:Number(item.itemId), ref:Number(item.ref), id:Number(item.spriteId), floor:String(item.furniType).toUpperCase() === 'S' && !item.isWallItem, free:Number(item.flatId) === 0 && !item.rentable};}
  function clearInventory() {inventory.clear();stockByType.clear();}
  function removeItem(id) {const item=inventory.get(id);if(item){const group=stockByType.get(item.id);group?.delete(id);if(group&&!group.size)stockByType.delete(item.id);}inventory.delete(id);}
  function putItem(raw) {const item=copyItem(raw);removeItem(item.itemId);inventory.set(item.itemId,item);if(item.floor&&item.free&&Number.isSafeInteger(item.itemId)&&item.itemId!==0&&Number.isSafeInteger(item.ref)&&item.ref>0){const group=stockByType.get(item.id)||new Map();group.set(item.itemId,item);stockByType.set(item.id,group);}}
  function stock(id) {return [...(stockByType.get(id)?.values() || [])];}
  function nativeFurniture() {
    const manager=engine()?.sessionDataManager;if(!manager)return [];
    const map=manager._floorItems;
    if(metadataCache?.manager===manager && metadataCache.size===(map?.size??-1) && metadataCache.items.length)return metadataCache.items;
    let source;
    try {source=manager.getAllFurnitureData?.(null);}finally{manager.removePendingFurniDataListener?.(null);}
    source=source || (map?.values ? [...map.values()] : []);
    const items=source.filter(item=>String(item.type||'s').toLowerCase()!=='i' && Number(item.tileSizeX)===1 && Number(item.tileSizeY)===1 && Number.isSafeInteger(Number(item.id)) && Number(item.id)>0).map(item=>({id:Number(item.id),name:String(item.name||item.className||`Mobi ${item.id}`),className:String(item.className||''),offerId:Number(item.purchaseOfferId),block:/bloco|block|cube|cubo|brick|tijolo|constru/i.test(`${item.name} ${item.className}`)})).sort((a,b)=>Number(b.block)-Number(a.block)||a.name.localeCompare(b.name));
    metadataCache={manager,size:map?.size??-1,items};return items;
  }
  function offerFor(id, preferred) {
    const exact=offers.get(preferred);if(exact?.id===id)return exact;
    for(const offerId of offersByType.get(id)||[]) {const value=offers.get(offerId);if(value?.id===id)return value;}
    return null;
  }
  function metadata() {return nativeFurniture().map(item=>({...item,stock:inventoryReady?(stockByType.get(item.id)?.size||0):null,inShop:!!offerFor(item.id,item.offerId),pageIds:[...(offersByType.get(item.id)||[])].map(id=>offers.get(id)?.pageId)}));}
  function check(run) {
    if (run.cancelled) throw Error('Operação interrompida. Os itens já comprados e colocados foram mantidos.');
    if (run.error) throw Error(run.error);
    permitted(run.roomId);
    if (run.revision !== catalogRevision) throw Error('O catálogo mudou. Confira os materiais novamente.');
  }
  function until(condition, timeout, run, message) {
    return new Promise((resolve,reject) => {
      const start = Date.now(); let timer,finished=false;
      const finish = (error,value) => {if(finished)return;finished=true;clearTimeout(timer); waiters.delete(poll); error ? reject(error) : resolve(value);};
      const poll = () => {
        if(finished)return;
        clearTimeout(timer);
        try {if (run) check(run); const value=condition(); if(value) return finish(null,value); if(Date.now()-start >= timeout) return finish(Error(message)); timer=setTimeout(poll,100);} catch(error) {finish(error);}
      };
      waiters.add(poll); poll();
    });
  }
  async function synchronize(options={}) {
    if(syncPending)return syncPending;
    ready();
    syncPending=(async()=>{
      const warnings=[];
      const tasks=[];
      if(options.force || !inventoryReady) tasks.push((async()=>{inventoryReady=false;fragments.clear();send(3150,[],[]);await until(()=>inventoryReady,10000,null,'O inventário não respondeu. Abra o inventário do jogo e atualize os materiais.');})().catch(error=>warnings.push(error.message)));
      if(options.force || !indexReady) tasks.push((async()=>{indexReady=false;send(1195,['NORMAL'],['NORMAL']);await until(()=>indexReady,10000,null,'A loja não respondeu. Abra o catálogo do jogo e atualize os materiais.');})().catch(error=>warnings.push(error.message)));
      await Promise.all(tasks);return warnings;
    })();
    try{return await syncPending;}finally{syncPending=null;}
  }
  async function loadPage(pageId) {
    if(job)throw Error('Aguarde a operação atual.');ready();pageId=Number(pageId);
    if(!Number.isSafeInteger(pageId)||!catalogPages.has(pageId))throw Error('Escolha uma página disponível na loja.');
    loadedPages.delete(pageId);send(412,[pageId,-1,'NORMAL'],[pageId,-1,'NORMAL']);
    await until(()=>loadedPages.has(pageId),8000,null,'A página da loja não respondeu. Abra essa página no catálogo do jogo e tente novamente.');
    return snapshot();
  }
  async function snapshot(options={}) {
    const room=ready();if(options.force)metadataCache=null; const warnings=await synchronize(options);ready(room.roomId);
    const materials=metadata();if(!materials.length)warnings.push('Os dados dos mobis ainda não carregaram. Abra a loja ou o inventário e atualize os materiais.');
    return {roomId:room.roomId,rights:!room.isSpectator&&room.controllerLevel>=1,materials,inventoryReady,indexReady,warnings,pages:[...catalogPages.values()],inventoryCount:inventoryReady?[...stockByType.values()].reduce((n,items)=>n+items.size,0):null};
  }
  async function quote(data) {
    if (job) throw Error('Aguarde a operação atual ou clique em Parar.');
    const room=permitted(); await synchronize();if(!inventoryReady)throw Error('Aguarde a leitura completa do inventário antes de calcular ou comprar materiais.');
    const plan=projects.create(data.plan), requirements=projects.requirements(plan,data.materials), list=metadata(), rows=[];
    const revision=catalogRevision;
    for (const requirement of requirements) {
      const item=list.find(value=>value.id === requirement.id); if(!item) throw Error('Use apenas mobis de piso com tamanho 1 × 1.');
      let offer=offerFor(item.id,item.offerId), purchaseError=null;
      if(!offer && pages.has(item.offerId)) {
        send(412,[pages.get(item.offerId),item.offerId,'NORMAL'],[pages.get(item.offerId),item.offerId,'NORMAL']);
        try {await until(()=>loadedPages.has(pages.get(item.offerId)),4000,null,'Este item não possui uma oferta compatível no catálogo.');} catch(error) {purchaseError=error.message;}
        offer=offerFor(item.id,item.offerId);
      }
      if(offer?.id !== item.id) offer=null;
      const available=stock(item.id).length, missing=Math.max(0,requirement.quantity-available), packs=offer ? Math.ceil(missing/offer.productCount) : 0;
      rows.push({...requirement,name:item.name,available,missing,packs,buyQuantity:offer ? packs*offer.productCount : 0,offer:offer || null,purchaseError:purchaseError || (!offer ? 'Escolha a página deste item na loja para consultar a oferta. Os itens do inventário continuam disponíveis.' : null)});
    }
    permitted(room.roomId); if(revision !== catalogRevision) throw Error('O catálogo mudou. Atualize a lista de materiais.');
    const id=`quote-${Date.now()}-${++serial}`, value={id,roomId:room.roomId,revision,plan,materials:{...data.materials},rows};
    quotes.set(id,value); if(quotes.size>20) quotes.delete(quotes.keys().next().value);
    return {id,roomId:value.roomId,rows,total:plan.cells.length};
  }
  function area(plan, origin, roomId) {
    permitted(roomId);
    if(!origin || origin.roomId !== roomId || !Number.isSafeInteger(origin.x) || !Number.isSafeInteger(origin.y)) throw Error('Selecione um piso deste quarto antes de construir.');
    const map=engine().getFurnitureStackingHeightMap?.(roomId); if(!map || typeof map.validateLocation !== 'function') throw Error('Aguarde o mapa de pisos do quarto.');
    const positions=[...new Map(plan.cells.map(cell=>[`${cell.x},${cell.y}`,cell])).values()];
    const occupied=new Set(), total=engine().getTotalObjectsForManager(roomId,FLOOR);
    for(let i=0;i<total;i++) {
      const object=engine().getRoomObjectByIndex(roomId,i,FLOOR), point=object?.getLocation?.(); if(!point) continue;
      let w=Math.max(1,Math.ceil(Number(object.model?.getValue?.('furniture_size_x')) || 1)), h=Math.max(1,Math.ceil(Number(object.model?.getValue?.('furniture_size_y')) || 1));
      const direction=Number(object.getDirection?.()?.x)||0; if(Math.round(direction/90)%2) [w,h]=[h,w];
      for(let y=0;y<h;y++) for(let x=0;x<w;x++) occupied.add(`${Math.round(point.x)+x},${Math.round(point.y)+y}`);
    }
    let height;
    for(const cell of positions) {
      const x=origin.x+cell.x,y=origin.y+cell.y;
      if(x<0||y<0||x>=map.width||y>=map.height || !map.validateLocation(x,y,1,1,0,0,0,0,false)) throw Error('O projeto ultrapassa o piso do quarto ou ocupa uma área bloqueada.');
      if(occupied.has(`${x},${y}`)) throw Error('Esta área já contém mobis. Escolha uma área livre.');
      const z=map.getTileHeight(x,y); if(!Number.isFinite(z)) throw Error('O piso ainda não está disponível.');
      if(height === undefined) height=z; else if(Math.abs(height-z)>.01) throw Error('Escolha uma área plana, com todos os pisos na mesma altura.');
    }
    return height;
  }
  function post(target, data) {try {target.postMessage({source:'pixelsquad',...data}, '*');} catch {}}
  function progress(run, extra={}) {post(run.target,{type:'PS_BUILDER_EVENT',event:'progress',requestId:run.requestId,data:{phase:run.phase,placed:run.placed,bought:run.bought,total:run.quote.plan.cells.length,...extra}});}
  function stopSelection() {
    if(!selection) return;
    const {handler,wrapper,descriptor,timer}=selection;
    if(handler.handleRoomObjectEvent===wrapper) {if(descriptor) Object.defineProperty(handler,'handleRoomObjectEvent',descriptor); else delete handler.handleRoomObjectEvent;}
    clearTimeout(timer); selection=null;
  }
  function select(target,requestId) {
    if(job) throw Error('Aguarde a operação atual.');
    const room=permitted(),handler=engine().objectEventHandler;
    if(typeof handler?.handleRoomObjectEvent !== 'function') throw Error('O cliente não disponibilizou a seleção de piso.');
    stopSelection();
    const original=handler.handleRoomObjectEvent,descriptor=Object.getOwnPropertyDescriptor(handler,'handleRoomObjectEvent');
    const wrapper=new Proxy(original,{apply(fn,receiver,args) {
      const [event,id]=args;
      if(selection && event?.type==='ROE_MOUSE_CLICK' && id===room.roomId && Number.isFinite(event.tileX) && Number.isFinite(event.tileY)) {
        const x=Number.isInteger(event.tileXAsInt)?event.tileXAsInt:Math.trunc(event.tileX+.499),y=Number.isInteger(event.tileYAsInt)?event.tileYAsInt:Math.trunc(event.tileY+.499);
        stopSelection(); post(target,{type:'PS_BUILDER_EVENT',event:'origin',requestId,data:{roomId:id,x,y}}); return;
      }
      return Reflect.apply(fn,receiver,args);
    }});
    Object.defineProperty(handler,'handleRoomObjectEvent',{value:wrapper,writable:true,configurable:true});
    selection={target,requestId,handler,descriptor,wrapper,roomId:room.roomId,timer:setTimeout(()=>{stopSelection();post(target,{type:'PS_BUILDER_EVENT',event:'selection-cancelled',requestId,data:{message:'Seleção encerrada. Escolha o piso novamente.'}});},30000)};
    return {selecting:true,roomId:room.roomId};
  }
  async function purchases(run, quantities) {
    const shopping=run.quote.rows.map(row=>{
      check(run); const shortage=Math.max(0,row.quantity-stock(row.id).length);
      const desired=quantities?.[row.id] === undefined ? shortage : Number(quantities[row.id]);
      if(!quantities && shortage>row.missing) throw Error('A quantidade disponível no inventário mudou. Atualize os materiais antes da compra automática.');
      if(!Number.isSafeInteger(desired)||desired<0||desired>4096) throw Error('A quantidade de compra precisa estar entre 0 e 4096 itens.');
      if(!desired)return null;
      const offer=row.offer;
      if(!offer) throw Error(`${row.name}: não há oferta compatível no catálogo.`);
      if(offers.get(offer.offerId)!==offer) throw Error('A oferta mudou. Confira os preços antes de comprar.');
      return {row,offer,packs:Math.ceil(desired/offer.productCount)};
    }).filter(Boolean);
    run.phase='buy'; progress(run);
    for(const entry of shopping) {
      const {row,offer}=entry;let packs=entry.packs;
      while(packs>0) {
        check(run);if(offers.get(offer.offerId)!==offer) throw Error('A oferta mudou. Confira os preços antes de comprar.');const amount=offer.bulk?Math.min(100,packs):1, before=stock(row.id).length, expected=amount*offer.productCount;
        run.purchase={offerId:offer.offerId,confirmed:false};
        send(3492,[offer.pageId,offer.offerId,offer.extra,amount],[offer.pageId,offer.offerId,offer.extra,amount]);
        await until(()=>run.purchase.confirmed,12000,run,'A compra não foi confirmada. Nenhuma nova tentativa foi enviada; confira o inventário antes de tentar novamente.');
        run.bought+=expected; progress(run);
        if(stock(row.id).length<before+expected) send(3150,[],[]);
        await until(()=>inventoryReady && stock(row.id).length>=before+expected,12000,run,'A compra foi confirmada, mas os itens ainda não apareceram no inventário. Aguarde e confira antes de continuar.');
        run.purchase=null; packs-=amount; await sleep(450);
      }
    }
  }
  async function execute(target,requestId,action,data) {
    if(job) throw Error('Já existe uma operação em andamento.');
    const value=quotes.get(data.quoteId); if(!value || value.revision!==catalogRevision) throw Error('Atualize os materiais e os preços antes de continuar.');
    permitted(value.roomId);
    const run={target,requestId,quote:value,roomId:value.roomId,revision:value.revision,phase:'prepare',placed:0,bought:0,cancelled:false,error:null}; job=run; stopSelection();
    try {
      await synchronize();check(run);if(!inventoryReady)throw Error('Aguarde a leitura completa do inventário antes de construir ou comprar.');
      if(action==='build') area(value.plan,data.origin,value.roomId);
      if(action==='buy' || data.autoBuy===true) await purchases(run,action==='buy'?data.quantities:null);
      check(run);
      if(action==='build') {
        area(value.plan,data.origin,value.roomId);
        for(const row of value.rows) if(stock(row.id).length<row.quantity) throw Error(`Faltam ${row.quantity-stock(row.id).length} itens de ${row.name}. Compre os materiais antes de construir.`);
        run.phase='build'; progress(run); const heights=new Map();
        for(const cell of value.plan.cells) {
          check(run); const x=data.origin.x+cell.x,y=data.origin.y+cell.y,key=`${x},${y}`,map=engine().getFurnitureStackingHeightMap(value.roomId);
          if(!map.validateLocation(x,y,1,1,0,0,0,0,false)) throw Error('O piso não permite colocar ou empilhar este bloco. Escolha mobis empilháveis.');
          const item=stock(Number(value.materials[cell.role]))[0]; if(!item) throw Error('Um dos materiais não está mais disponível no inventário.');
          latestPlacement=null;
          send(1258,[item.itemId,FLOOR,'',x,y,value.plan.rotation*2],[`${item.itemId} ${x} ${y} ${value.plan.rotation*2}`]);
          const placed=await until(()=>{
            if(latestPlacement?.ref===item.ref && latestPlacement.id===item.id && latestPlacement.x===x && latestPlacement.y===y) return latestPlacement;
            const object=engine().getRoomObject(value.roomId,item.ref,FLOOR),point=object?.getLocation?.();
            if(point && point.x===x && point.y===y) return {z:point.z};
            return null;
          },10000,run,'O jogo não confirmou a colocação do bloco. A construção foi interrompida.');
          removeItem(item.itemId); ++run.placed; progress(run);
          if(heights.has(key) && !(placed.z>heights.get(key)+.001)) throw Error('Este mobi não empilhou como previsto. A construção foi interrompida.');
          heights.set(key,placed.z); await sleep(450);
        }
      }
      run.phase='done'; progress(run); return {placed:run.placed,bought:run.bought,rows:value.rows.map(row=>({id:row.id,available:stock(row.id).length}))};
    } catch(error) {
      run.phase=run.cancelled?'cancelled':'error'; progress(run,{message:error.message}); throw error;
    } finally {job=null;}
  }
  async function handle(event) {
    if(!trusted(event) || event.data?.source!=='pixelsquad' || event.data.type!=='PS_BUILDER_REQUEST') return;
    const {requestId,action,data={}}=event.data; if(typeof requestId!=='string'||requestId.length>100) return;
    if(requests.has(requestId)) {const previous=requests.get(requestId); if(previous.target===event.source) post(event.source,await previous.promise); return;}
    const promise=(async()=>{
      try {
        let result;
        if(action==='discover') {const room=ready();result={roomId:room.roomId};}
        else if(action==='snapshot') result=await snapshot(data);
        else if(action==='catalog-page') result=await loadPage(data.pageId);
        else if(action==='quote') result=await quote(data);
        else if(action==='select') result=select(event.source,requestId);
        else if(action==='buy'||action==='build') result=await execute(event.source,requestId,action,data);
        else if(action==='cancel') {if(job?.target===event.source) job.cancelled=true; if(selection?.target===event.source) stopSelection(); wake();result={cancelled:true};}
        else throw Error('Ação de construção desconhecida.');
        return {type:'PS_BUILDER_REPLY',requestId,ok:true,data:result};
      } catch(error) {return {type:'PS_BUILDER_REPLY',requestId,ok:false,error:error.message};}
    })();
    requests.set(requestId,{target:event.source,promise}); if(requests.size>100) requests.delete(requests.keys().next().value);
    post(event.source,await promise);
    if(['snapshot','quote','catalog-page','discover'].includes(action))requests.delete(requestId);
  }
  window.addEventListener('message',handle);
  window.addEventListener('pixelsquad-native-room-ready',connect);
  window.addEventListener('pageshow',connect);
  window.addEventListener('keydown',event=>{if(event.key==='Escape' && selection) {const previous=selection;stopSelection();post(previous.target,{type:'PS_BUILDER_EVENT',event:'selection-cancelled',requestId:previous.requestId,data:{message:'Seleção cancelada.'}});}},true);
  window.addEventListener('pagehide',()=>{stopSelection(); if(job) job.cancelled=true; wake();releaseEvents(); unsubscribe?.(); unsubscribe=null; native=null;});
  connect();
})();
