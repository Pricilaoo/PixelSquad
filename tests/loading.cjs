const vm=require('vm'),fs=require('fs'),assert=require('assert');
const code=fs.readFileSync(require('path').join(__dirname, '../extension/loading.js'),'utf8');
function fixture(path='/hotel') {
 let loader=null,toolbar=null;const timers=new Map(),intervals=new Map(),events={};let next=0,observe;
 const element=()=>({nodeType:1,isConnected:true,style:{},attrs:{},children:[],parentElement:null,textContent:'',setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},getClientRects(){return [{}]},append(...children){children.forEach(c=>{c.parentElement=this;this.children.push(c)})},appendChild(c){this.append(c)},remove(){this.isConnected=false},contains(e){return e===this||this.children.some(c=>c.contains(e))},addEventListener(k,f){this[k]=f}});
 const root=element();const document={documentElement:root,createElement:element,querySelectorAll(q){return q==='.nitro-loading'?(loader?[loader]:[]):q==='.nitro-toolbar'?(toolbar?[toolbar]:[]):[]},querySelector(q){return this.querySelectorAll(q)[0]||null},addEventListener(k,f){events[k]=f}};
 const win={addEventListener(k,f){events[k]=f}};
 vm.runInNewContext(code,{window:win,document,location:{pathname:path},chrome:{runtime:{getURL:p=>p}},getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),MutationObserver:class{constructor(f){observe=f}observe(){}disconnect(){}},setInterval(f){intervals.set(++next,f);return next},clearInterval:i=>intervals.delete(i),setTimeout(f,ms){timers.set(++next,{f,ms});return next},clearTimeout:i=>timers.delete(i)});
 const mutate=()=>{observe([{target:root}]);for(const [id,t] of [...timers])if(t.ms===80){timers.delete(id);t.f()}};
 const active=()=>root.children.filter(e=>e.isConnected&&e.id==='pixelsquad-loading').at(-1);
 const bar=()=>active()?.children[0].children[1].children[0];
 return {events,timers,intervals,active,bar,mutate,
 setLoader(percent,text=''){loader=element();loader.textContent=text;loader.querySelector=()=>percent===null?null:{style:{width:percent+'%'}};mutate()},
 clearLoader(){loader=null;mutate()},ready(){toolbar=element();mutate()},
 fire(ms){for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.f()}}
 };
}
let f=fixture('/');assert(!f.active(),'login page has no splash');
f=fixture();assert(f.active());f.setLoader(20);assert.equal(f.bar().attrs['aria-valuenow'],'20');
f.events.load?.();assert(f.active(),'page load must not dismiss client loader');
f.fire(20000);assert(f.active(),'slow native loading remains visible');
f.setLoader(100);assert.equal(f.bar().attrs['aria-valuenow'],'99');f.ready();assert.equal(f.bar().attrs['aria-valuenow'],'99','toolbar behind loader is insufficient');
f.clearLoader();assert.equal(f.bar().attrs['aria-valuenow'],'100');f.fire(350);assert(!f.active());assert.equal(f.intervals.size,0);
f.setLoader(40);assert(f.active(),'reconnect loader reopens splash');f.setLoader(null,'Connection Error');assert(!f.active(),'native errors remain visible');
f=fixture();f.setLoader(60);f.clearLoader();assert(f.active(),'loader removal without game UI does not complete');assert(!f.bar().attrs['aria-valuenow']);
f.events.pagehide();assert(!f.active());assert.equal(f.intervals.size,0);
f=fixture();f.fire(20000);assert(!f.active(),'unsupported layout falls back');f.setLoader(20);assert(f.active(),'late loader still supported');
f.active().children.at(-1).click();assert(!f.active(),'manual escape');f.setLoader(40);assert(!f.active(),'manual escape persists');
console.log('PASS: native progress, slow load, game readiness, errors, reconnection, fallback, manual escape and cleanup');
