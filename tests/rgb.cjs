const vm=require('vm'),fs=require('fs'),assert=require('assert');
const {parseHTML}=require('linkedom');
const {window}=parseHTML('<html><body><main><section class="panel-position-settings"></section></main></body></html>');
delete window.PixelSquadRGB;
const values=new Map(),writes=[];let changed;
const ctx=vm.createContext({window,document:window.document,
 localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},
 chrome:{storage:{local:{get:async()=>({}),set:async data=>writes.push(data)},onChanged:{addListener:f=>changed=f}}}});
vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../extension/rgb.js'),'utf8'),ctx);
const rgb=window.PixelSquadRGB,root=window.document.documentElement;
assert.equal(rgb.get().enabled,false);
rgb.set({enabled:true,text:true,toolbar:true,purse:true,intensity:90,transparency:20});
for(const target of ['text','toolbar','purse'])assert(root.classList.contains('ps-rgb-'+target));
assert(!root.classList.contains('ps-rgb-sidebar'));
assert.equal(root.style.getPropertyValue('--ps-rgb-alpha'),'0.8');
assert.equal(root.style.getPropertyValue('--ps-rgb-saturation'),'90%');
assert.equal(JSON.parse(values.get('pixelsquad_rgb')).transparency,20);assert(writes.length);
rgb.settings(window.document.querySelector('main'));
assert.equal(window.document.querySelectorAll('[data-rgb]').length,8);
const slider=window.document.querySelector('[data-rgb=transparency]');slider.value='100';slider.dispatchEvent(new window.Event('input'));
assert.equal(root.style.getPropertyValue('--ps-rgb-alpha'),'0');
changed({pixelsquad_rgb:{newValue:{enabled:true,sidebar:true,intensity:200,transparency:-100}}},'local');
assert(root.classList.contains('ps-rgb-sidebar'));assert(!root.classList.contains('ps-rgb-toolbar'));
assert.equal(root.style.getPropertyValue('--ps-rgb-saturation'),'100%');assert.equal(root.style.getPropertyValue('--ps-rgb-alpha'),'1');
rgb.set({enabled:false});for(const target of ['text','sidebar','toolbar','purse','animated'])assert(!root.classList.contains('ps-rgb-'+target));
console.log('PASS: RGB targets, live intensity/transparency, bounds, saved preferences, eight controls and cross-frame preference updates');
