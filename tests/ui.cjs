const {parseHTML}=require('linkedom');
const vm=require('vm'),fs=require('fs'),assert=require('assert');
const root=require('path').join(__dirname,'../extension')+require('path').sep;
function fixture(initial={},body='',catalogStorage={}){
 const {window}=parseHTML('<html><head></head><body>'+body+'</body></html>');
 delete window.__PIXELSQUAD__;delete window.__PIXELSQUAD_MUSIC__;
 const store=new Map(Object.entries(initial)),timers=new Map(),intervals=new Map(),observers=[],resize=new Set();
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 let id=0,openPanel;
 const add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window);
 window.addEventListener=(k,f,...rest)=>{if(k==='resize')resize.add(f);return add(k,f,...rest)};
 window.removeEventListener=(k,f,...rest)=>{if(k==='resize')resize.delete(f);return remove(k,f,...rest)};
 window.HTMLElement.prototype.getBoundingClientRect=function(){return {left:parseFloat(this.style.getPropertyValue('--ps-left')||this.style.left)||0,top:parseFloat(this.style.getPropertyValue('--ps-top')||this.style.top)||0,width:parseFloat(this.style.width)||300,height:parseFloat(this.style.height)||170}};
 Object.defineProperty(window.HTMLElement.prototype,'offsetWidth',{configurable:true,get(){return this.getBoundingClientRect().width}});
 Object.defineProperty(window.HTMLElement.prototype,'offsetHeight',{configurable:true,get(){return this.getBoundingClientRect().height}});
 window.HTMLElement.prototype.setPointerCapture=function(){};
 window.postMessage=()=>{};
 const sandbox={window,document:window.document,localStorage:storage,navigator:{mediaSession:{metadata:null}},
  chrome:{runtime:{getURL:p=>p,onMessage:{addListener:f=>openPanel=f}},storage:{local:{get:async()=>catalogStorage}}},
  innerWidth:1000,innerHeight:700,Event:window.Event,CustomEvent:window.CustomEvent,
  MutationObserver:class{constructor(f){this.f=f;observers.push(this)}observe(){}disconnect(){}},
  setTimeout(f,ms){timers.set(++id,{f,ms});return id},clearTimeout:i=>timers.delete(i),
  setInterval(f){intervals.set(++id,f);return id},clearInterval:i=>intervals.delete(i),console,prompt:()=>null};
 const ctx=vm.createContext(sandbox);
 const run=p=>vm.runInContext(fs.readFileSync(root+p,'utf8'),ctx,{filename:p});
 const flush=()=>{for(const [i,t] of [...timers])if(t.ms===100){timers.delete(i);t.f()}};
 const pointer=(el,type,props)=>{const e=new window.Event(type,{bubbles:true});Object.assign(e,{pointerId:1,button:0,clientX:20,clientY:20},props);el.dispatchEvent(e)};
 return {window,document:window.document,store,run,resize,intervals,observers,pointer,sandbox,open:()=>openPanel({type:'openPanel'}),tick:()=>{for(const f of [...intervals.values()])f()},flush,
 mutate(node){observers.forEach(o=>o.f([{addedNodes:[node]}]));flush()}};
}
for(const invalid of ['{','null']){
 const f=fixture({pixelsquad_state:invalid});f.run('locales.js');f.run('content.js');f.open();assert(f.document.querySelector('#pixelsquad'));
}
let f=fixture({pixelsquad_state:JSON.stringify({tab:'effects'})});
f.run('locales.js');f.run('content.js');f.open();
assert(!f.document.querySelector('[data-tab=effects]'));assert(f.document.querySelector('[data-tab=home]').classList.contains('active'));
const tabs=[...f.document.querySelectorAll('[data-tab]')].map(x=>x.dataset.tab);
f.window.PixelSquadTranslate={getConfig:()=>({}),langs:{pt:'Português',en:'English'}};
for(const tab of tabs){f.document.querySelector('[data-tab="'+tab+'"]').click();assert(f.document.querySelector('#ps-main').children.length,tab)}
assert.equal(f.resize.size,2);
f.document.querySelector('[data-tab=settings]').click();
const controls=f.document.querySelectorAll('[data-appearance]');assert.equal(controls.length,9);
const accent=f.document.querySelector('[data-appearance=accent]');accent.value='#123456';accent.dispatchEvent(new f.window.Event('input'));
assert.equal(f.document.querySelector('#pixelsquad').style.getPropertyValue('--ps-accent'),'#123456');
const radius=f.document.querySelector('[data-appearance=radius]');radius.value='0';radius.dispatchEvent(new f.window.Event('input'));
f.open();assert.equal(f.document.querySelector('#pixelsquad').style.getPropertyValue('--ps-radius'),'0px');assert.equal(f.resize.size,2);
f.document.querySelector('#ps-close').click();assert.equal(f.resize.size,0);
console.log('PASS: corrupt preferences, retired tab migration, tab rendering, nine appearance controls, persistence and drag-listener cleanup');

const creatorFixture=fixture();creatorFixture.run('locales.js');creatorFixture.run('content.js');creatorFixture.open();
const creatorButton=creatorFixture.document.querySelector('#ps-creator');
assert.equal(creatorButton.textContent,'Feito por Pricilao.');
assert.equal(creatorButton.getAttribute('aria-label'),'Abrir perfil de Pricilao.');
const directClicks=[],profileMessages=[],frameMessages=[];let handled=true;
creatorFixture.document.addEventListener('pixelsquad-open-creator',event=>{directClicks.push(event.detail.requestId);if(handled)event.preventDefault()});
creatorFixture.window.postMessage=message=>profileMessages.push(message);
const profileFrame=creatorFixture.document.createElement('iframe');
Object.defineProperty(profileFrame,'contentWindow',{value:{postMessage:message=>frameMessages.push(message)}});creatorFixture.document.body.appendChild(profileFrame);
creatorButton.click();assert.equal(directClicks.length,1);assert.equal(profileMessages.length,0);assert.equal(frameMessages.length,0);
handled=false;creatorButton.click();assert.equal(directClicks.length,2);assert.notEqual(directClicks[0],directClicks[1]);
assert.equal(profileMessages.length,1);assert.equal(frameMessages.length,1);
assert.equal(profileMessages[0].type,'PS_OPEN_CREATOR');assert.equal(profileMessages[0].requestId,directClicks[1]);assert.equal(frameMessages[0].requestId,directClicks[1]);
console.log('PASS: full creator credit is clickable, synchronous local delivery and iframe fallback with one request ID');

const catalogFixture=fixture();catalogFixture.run('effects-catalog.js');catalogFixture.run('handitems-catalog.js');catalogFixture.run('locales.js');catalogFixture.run('content.js');catalogFixture.open();
catalogFixture.document.querySelector('[data-tab=enables]').click();
assert.equal(catalogFixture.document.querySelectorAll('.enable-card').length,465);
catalogFixture.document.querySelector('[data-item-favorite="enable:1"]').click();
catalogFixture.document.querySelector('#ps-item-favorites').click();
assert.equal(catalogFixture.document.querySelectorAll('.enable-card').length,1);
assert(JSON.parse(catalogFixture.store.get('pixelsquad_state')).itemFavorites.includes('enable:1'));
catalogFixture.document.querySelector('#ps-item-favorites').click();
const search=catalogFixture.document.querySelector('#ps-enable-search');search.value='Jetpack';search.oninput();
assert.equal(catalogFixture.document.querySelectorAll('.enable-card').length,1);
assert.equal(catalogFixture.document.querySelector('[data-item-id]').dataset.itemId,'6');
console.log('PASS: 465 copied catalog items, favorite filter/persistence, name search and original effect IDs');

// The combined catalog keeps native IDs and independent favorites.
catalogFixture.document.querySelector('[data-catalog-tab=handitems]').click();
assert(!catalogFixture.document.querySelector('#ps-nav [data-tab=handitems]'));
assert(catalogFixture.document.querySelector('#ps-nav [data-tab=enables]').classList.contains('active'));
assert.equal(catalogFixture.document.querySelectorAll('.enable-card').length,296);
assert.equal(catalogFixture.document.querySelectorAll('.ps-item-preview img').length,296);
assert.equal(catalogFixture.document.querySelector('[data-item-id="1157"]').dataset.itemAction,'handitem');
const coffee=catalogFixture.document.querySelector('#ps-enable-search');coffee.value='Cafe Descafeinado';coffee.oninput();
assert.equal(catalogFixture.document.querySelectorAll('.enable-card').length,1);
assert.equal(catalogFixture.document.querySelector('[data-item-id]').dataset.itemId,'9');
coffee.value='';coffee.oninput();
const tea=catalogFixture.document.querySelector('[data-item-favorite="handitem:1"]').closest('.enable-card');
assert.equal(tea.querySelector('img').getAttribute('src'),'https://proxy.bananablet.dev/previews/handitems/1.png?v=20260723-2');
tea.querySelector('img').onerror();
assert(tea.querySelector('img').hidden);assert(!tea.querySelector('.ps-item-preview span').hidden);
catalogFixture.document.querySelector('[data-item-favorite="handitem:1"]').click();
catalogFixture.document.querySelector('#ps-item-favorites').click();
assert.equal(catalogFixture.document.querySelectorAll('.enable-card').length,1);
const savedFavorites=JSON.parse(catalogFixture.store.get('pixelsquad_state')).itemFavorites;
assert(savedFavorites.includes('enable:1'));assert(savedFavorites.includes('handitem:1'));
catalogFixture.document.querySelector('#ps-item-favorites').click();
let message;catalogFixture.window.postMessage=m=>message=m;
catalogFixture.document.querySelector('[data-item-id="1"]').click();
assert.equal(message.command,':handitem 1');
catalogFixture.document.querySelector('[data-catalog-tab=enables]').click();
catalogFixture.document.querySelector('[data-item-id="1"]').click();
assert.equal(message.command,':enable 1');
assert.equal(catalogFixture.document.querySelectorAll('.enable-card').length,465);
assert(!/ToolsBlet|Bananablet/.test(catalogFixture.document.querySelector('#ps-main').textContent));
console.log('PASS: complete handitem photos, combined navigation, accent-insensitive search, preview fallback, independent favorites and native commands');

// Resize can grow and shrink, persists, stays in the viewport and removes listeners.
const sizeFixture=fixture();sizeFixture.run('locales.js');sizeFixture.run('content.js');sizeFixture.open();
let grip=sizeFixture.document.querySelector('.ps-resize-grip');
sizeFixture.pointer(grip,'pointerdown',{clientX:300,clientY:170});
sizeFixture.pointer(grip,'pointermove',{clientX:500,clientY:430});
sizeFixture.pointer(grip,'pointerup');
assert.deepEqual(JSON.parse(sizeFixture.store.get('pixelsquad_panel_size')),{width:500,height:430});
sizeFixture.document.querySelector('#ps-close').click();assert.equal(sizeFixture.resize.size,0);
sizeFixture.open();assert.equal(sizeFixture.resize.size,2);
assert.equal(sizeFixture.document.querySelector('.box').style.width,'500px');
assert.equal(sizeFixture.document.querySelector('.box').style.height,'430px');
grip=sizeFixture.document.querySelector('.ps-resize-grip');
sizeFixture.pointer(grip,'pointerdown',{clientX:500,clientY:430});
sizeFixture.pointer(grip,'pointermove',{clientX:400,clientY:360});
sizeFixture.pointer(grip,'pointerup');
assert.deepEqual(JSON.parse(sizeFixture.store.get('pixelsquad_panel_size')),{width:400,height:360});
const key=(value,shiftKey=false)=>{const e=new sizeFixture.window.Event('keydown',{bubbles:true});Object.assign(e,{key:value,shiftKey});grip.dispatchEvent(e)};
key('ArrowRight');key('ArrowDown',true);
assert.deepEqual(JSON.parse(sizeFixture.store.get('pixelsquad_panel_size')),{width:410,height:400});
sizeFixture.pointer(grip,'pointerdown',{clientX:400,clientY:400});
sizeFixture.pointer(grip,'pointermove',{clientX:9999,clientY:9999});
sizeFixture.pointer(grip,'pointercancel');
let box=sizeFixture.document.querySelector('.box'),r=box.getBoundingClientRect();
assert(r.left+r.width<=992);assert(r.top+r.height<=692);
sizeFixture.sandbox.innerWidth=400;sizeFixture.sandbox.innerHeight=350;
sizeFixture.window.dispatchEvent(new sizeFixture.window.Event('resize'));
r=box.getBoundingClientRect();assert(r.left+r.width<=392);assert(r.top+r.height<=342);
assert(r.width>=320);assert(r.height>=280);
sizeFixture.document.querySelector('#ps-close').click();assert.equal(sizeFixture.resize.size,0);
const invalidSize=fixture({pixelsquad_panel_size:'null'});invalidSize.run('locales.js');invalidSize.run('content.js');invalidSize.open();assert(invalidSize.document.querySelector('.ps-resize-grip'));
console.log('PASS: pointer/keyboard resizing, saved dimensions, viewport limits and resize-listener cleanup');

// Refresh merges imported extras without erasing or replacing the bundled catalog.
(async()=>{
 const mergeFixture=fixture({},'',{pixelsquad_handitems:[
  {id:1,name:'Changed',image:'https://example.com/changed.png'},
  {id:10000,name:'Extra',image:'https://example.com/extra.png'},
  {id:null,name:'Invalid'},{id:'',name:'Invalid'},{id:-1,name:'Invalid'}
 ]});
 mergeFixture.run('effects-catalog.js');mergeFixture.run('handitems-catalog.js');mergeFixture.run('locales.js');mergeFixture.run('content.js');
 await Promise.resolve();mergeFixture.open();mergeFixture.document.querySelector('[data-tab=enables]').click();mergeFixture.document.querySelector('[data-catalog-tab=handitems]').click();
 await mergeFixture.document.querySelector('#ps-enable-refresh').onclick();
 assert.equal(mergeFixture.document.querySelectorAll('.enable-card').length,297);
 assert.equal(mergeFixture.document.querySelector('[data-item-id="1"]').closest('.enable-card').querySelector('strong').textContent,'Cha');
 assert(mergeFixture.document.querySelector('[data-item-id="10000"]'));
 assert(!mergeFixture.document.querySelector('[data-item-id="-1"]'));
 mergeFixture.open();assert(mergeFixture.document.querySelector('#ps-nav [data-tab=enables]').classList.contains('active'));
 console.log('PASS: imported extras preserve all bundled IDs, names and previews, reject invalid IDs and restore the inner tab');
})().catch(e=>{console.error(e);process.exitCode=1});

f=fixture({pixelsquad_music_player:'null'},'<div id="area_player"><button id="pause">Pause</button><input id="volume" type="range"><span data-song-title="Faixa de teste"></span><span data-origin-room="Sala de teste"></span></div>');
const native=f.document.querySelector('#pause');let clicked=0;native.addEventListener('click',()=>clicked++);
f.run('music-player.js');assert.equal(f.intervals.size,1);
assert.equal(f.document.querySelector('#pause'),native);native.click();assert.equal(clicked,1);
assert(f.document.querySelector('.ps-music-song').textContent.includes('Faixa de teste'));assert(f.document.querySelector('.ps-music-room').textContent.includes('Sala de teste'));
const color=f.document.querySelector('input[type=color]');color.value='#00ffee';color.dispatchEvent(new f.window.Event('input'));
assert.equal(JSON.parse(f.store.get('pixelsquad_music_player')).color,'#00ffee');
const handle=f.document.querySelector('.ps-music-heading');
f.pointer(handle,'pointerdown',{clientX:700,clientY:105});f.pointer(handle,'pointermove',{clientX:9999,clientY:9999});f.pointer(handle,'pointerup');
const prefs=JSON.parse(f.store.get('pixelsquad_music_player'));assert(prefs.x<=692&&prefs.y<=522);
const player=f.document.querySelector('#area_player');player.remove();f.tick();assert.equal(f.intervals.size,0);
f.document.body.appendChild(player);f.mutate(player);assert.equal(f.intervals.size,1);assert.equal(f.document.querySelectorAll('.ps-music-heading').length,1);
f.window.dispatchEvent(new f.window.Event('pagehide'));assert.equal(f.intervals.size,0);
const restored=new f.window.Event('pageshow');restored.persisted=true;f.window.dispatchEvent(restored);assert.equal(f.intervals.size,1);
console.log('PASS: native audio control identity, song/room metadata, color save, drag bounds, reattachment and page lifecycle');
