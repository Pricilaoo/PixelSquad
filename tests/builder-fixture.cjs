// Native-contract fixture. All network traffic is intercepted; no live hotel purchases.
window.createNativeBuilderFixture = function(options={}) {
  const subscribers=new Set(),messages=[],items=new Map(),objects=[],blocked=new Set();let nextItem=100,walks=0,furnitureReads=0;
  const room={roomId:42,controllerLevel:4,isSpectator:false},metadata=new Map([
    [1,{id:1,name:'Bloco Verde',className:'block_green',tileSizeX:1,tileSizeY:1,purchaseOfferId:501}],
    [2,{id:2,name:'Bloco Roxo',className:'block_purple',tileSizeX:1,tileSizeY:1,purchaseOfferId:502}],
    [3,{id:3,name:'Sofá Grande',className:'sofa_large',tileSizeX:2,tileSizeY:1,purchaseOfferId:503}]
  ]);
  if(options.staleOfferIds)for(const item of metadata.values())item.purchaseOfferId=-1;
  if(options.manyMaterials)for(let id=4;id<options.manyMaterials+4;id++)metadata.set(id,{id,name:`Bloco Teste ${id}`,className:`block_test_${id}`,type:'s',tileSizeX:1,tileSizeY:1,purchaseOfferId:-1});
  function add(id,count=1) {const added=[];for(let i=0;i<count;i++){const item={itemId:-(++nextItem),ref:nextItem,spriteId:id,furniType:'S',isWallItem:false,flatId:0,rentable:false};items.set(item.itemId,item);added.push(item);}return added;}
  add(1,options.stock??1);add(2,options.otherStock??0);
  const offer=id=>({offerId:id===1?501:502,products:[{productType:'s',furniClassId:id,productCount:options.packSize||1,extraParam:'',uniqueLimitedItem:false}],priceCredits:2,priceActivityPoints:1,priceActivityPointsType:5,bundlePurchaseAllowed:options.bulk!==false,rent:false,isPet:false});
  const registeredEvents=new Map(), eventRegistry=new Map();
  for(const header of [1032,804,869,1404,3770,1866,994,104,159,3151,1534,2491]) {class NativeMessageEvent{constructor(callback){this.callback=callback;this.parserClass=class {};}}eventRegistry.set(NativeMessageEvent,header);}
  const emit=(header,parser)=>{if(!registeredEvents.get(header)?.size)return;for(const callback of subscribers)callback(header,parser);};
  const index=()=>{const page={visible:true,pageId:8,localization:'Blocos da loja',offerIds:(options.emptyOfferIds?[]:[501,502]).filter(id=>id!==(options.noOffer===2?502:-1)),children:[]};emit(1032,{catalogType:'NORMAL',root:options.hiddenRoot?{visible:false,pageId:-1,children:[page]}:page});};
  const inventory=()=>{
    const values=[...items.values()],middle=Math.ceil(values.length/2);
    emit(994,{totalFragments:2,fragmentNumber:0,fragment:new Map(values.slice(0,middle).map(item=>[item.itemId,item]))});
    if(!options.partialInventory)emit(994,{totalFragments:2,fragmentNumber:1,fragment:new Map(values.slice(middle).map(item=>[item.itemId,item]))});
  };
  class GetCatalogIndexComposer{constructor(mode){this.value=[mode];}getMessageArray(){return this.value;}}
  class GetCatalogPageComposer{constructor(page,id,mode){this.value=[page,id,mode];}getMessageArray(){return this.value;}}
  class PurchaseFromCatalogComposer{constructor(page,id,extra,amount){this.value=[page,id,extra,amount];}getMessageArray(){return this.value;}}
  class FurnitureListComposer{getMessageArray(){return [];}}
  class FurniturePlaceComposer{constructor(id,category,wall,x,y,direction){this.value=category===10?[`${id} ${x} ${y} ${direction}`]:[];}getMessageArray(){return this.value;}}
  const registry=new Map([[GetCatalogIndexComposer,1195],[GetCatalogPageComposer,412],[PurchaseFromCatalogComposer,3492],[FurnitureListComposer,3150],[FurniturePlaceComposer,1258]]);
  const map={width:30,height:30,getTileHeight(x,y){return options.sloped&&x>5?1:objects.filter(o=>o.x===x&&o.y===y).length;},validateLocation(x,y){return x>=0&&y>=0&&x<30&&y<30&&!blocked.has(`${x},${y}`);}};
  class Handler{handleRoomObjectEvent(){++walks;return 'native-walk';}}
  const handler=new Handler();
  const engine={disposed:false,sessionDataManager:{...(options.publicMetadata?{}:{_floorItems:metadata}),getAllFurnitureData(){++furnitureReads;return [...metadata.values()];},removePendingFurniDataListener(){},getFloorItemData:id=>metadata.get(id)},roomSessionManager:{getSession:()=>room},objectEventHandler:handler,getFurnitureStackingHeightMap:()=>map,
    getTotalObjectsForManager:(id,category)=>category===10?objects.length:0,
    getRoomObjectByIndex:(id,i,category)=>category===10?objects[i]:null,getRoomObject:(id,ref,category)=>category===10?objects.find(o=>o.id===ref):null};
  const connection={disposed:false,isAuthenticated:true,_isReady:true,_messages:{_messageIdByComposer:registry,_messageIdByEvent:eventRegistry},
    addMessageEvent(event){const header=eventRegistry.get(event.constructor);if(!header)throw Error('Native event class required');const list=registeredEvents.get(header)||new Set();list.add(event);registeredEvents.set(header,list);},
    removeMessageEvent(event){registeredEvents.get(eventRegistry.get(event.constructor))?.delete(event);},send(value){
    if(!registry.has(value.constructor))throw Error('Composer must be a registered native class');
    const header=registry.get(value.constructor),args=value.getMessageArray();messages.push({header,args});
    if(header===3150)inventory();
    if(header===1195)index();
    if(header===412)emit(804,{pageId:8,catalogType:'NORMAL',offers:args[1]===-1?[offer(1),offer(2)]:[offer(args[1]===501?1:2)]});
    if(header===3492) {
      if(options.purchaseError){emit(1404,{error:1});return true;}
      if(options.purchaseTimeout)return true;
      const id=args[1]===501?1:2,count=args[3]*(options.packSize||1);emit(869,{offer:offer(id)});
      if(!options.missingDelivery)emit(104,{items:add(id,count)});
    }
    if(header===1258 && !options.placeTimeout) {
      const [itemId,x,y]=args[0].split(' ').map(Number),item=items.get(itemId);if(!item)throw Error('Missing inventory item');
      items.delete(itemId);const z=options.noStack?0:objects.filter(o=>o.x===x&&o.y===y).length;
      const object={id:item.ref,x,y,z,model:{getValue:()=>1},getLocation(){return this;},getDirection:()=>({x:0})};objects.push(object);
      emit(159,{itemId});emit(1534,{item:{itemId:item.ref,spriteId:item.spriteId,x,y,z}});
      if(options.cancelAfter && objects.length>=options.cancelAfter)window.dispatchEvent(new window.Event('fixture-cancel'));
    }
    return true;
  }};
  window.PixelSquadNativeClient={roomEngine:engine,connection,subscribeMessages(callback){subscribers.add(callback);return()=>subscribers.delete(callback);}};
  return {options,room,engine,connection,registry,eventRegistry,registeredEvents,map,handler,messages,items,objects,blocked,emit,inventory,index,add,offer,get furnitureReads(){return furnitureReads;},get walks(){return walks;},clickFloor(x=5,y=5){return handler.handleRoomObjectEvent({type:'ROE_MOUSE_CLICK',tileX:x,tileY:y,tileXAsInt:x,tileYAsInt:y},room.roomId);}};
};
