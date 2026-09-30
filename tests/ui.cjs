const {parseHTML}=require('linkedom');
const vm=require('vm'),fs=require('fs'),assert=require('assert');
const root=require('path').join(__dirname,'../extension')+require('path').sep;
function fixture(initial={},body=''){
 const {window}=parseHTML('<html><head></head><body>'+body+'</body></html>');
 delete window.__PIXELSQUAD__;delete window.__PIXELSQUAD_MUSIC__;
 const store=new Map(Object.entries(initial)),timers=new Map(),intervals=new Map(),observers=[],resize=new Set();
 const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 let id=0,openPanel;
 const add=window.addEventListener.bind(window),remove=window.removeEventListener.bind(window);
 window.addEventListener=(k,f,...rest)=>{if(k==='resize')resize.add(f);return add(k,f,...rest)};
 window.removeEventListener=(k,f,...rest)=>{if(k==='resize')resize.delete(f);return remove(k,f,...rest)};
 window.HTMLElement.prototype.getBoundingClientRect=function(){return {left:parseFloat(this.style.left)||0,top:parseFloat(this.style.top)||0,width:300,height:170}};
 Object.defineProperty(window.HTMLElement.prototype,'offsetWidth',{configurable:true,get(){return 300}});
 Object.defineProperty(window.HTMLElement.prototype,'offsetHeight',{configurable:true,get(){return 170}});
 window.HTMLElement.prototype.setPointerCapture=function(){};
 const sandbox={window,document:window.document,localStorage:storage,navigator:{mediaSession:{metadata:null}},
  chrome:{runtime:{getURL:p=>p,onMessage:{addListener:f=>openPanel=f}},storage:{local:{get:async()=>({})}}},
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
assert.equal(f.resize.size,1);
f.document.querySelector('[data-tab=settings]').click();
const controls=f.document.querySelectorAll('[data-appearance]');assert.equal(controls.length,9);
const accent=f.document.querySelector('[data-appearance=accent]');accent.value='#123456';accent.dispatchEvent(new f.window.Event('input'));
assert.equal(f.document.querySelector('#pixelsquad').style.getPropertyValue('--ps-accent'),'#123456');
const radius=f.document.querySelector('[data-appearance=radius]');radius.value='0';radius.dispatchEvent(new f.window.Event('input'));
f.open();assert.equal(f.document.querySelector('#pixelsquad').style.getPropertyValue('--ps-radius'),'0px');assert.equal(f.resize.size,1);
f.document.querySelector('#ps-close').click();assert.equal(f.resize.size,0);
console.log('PASS: corrupt preferences, retired tab migration, tab rendering, nine appearance controls, persistence and drag-listener cleanup');

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
