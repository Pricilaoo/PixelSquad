const assert = require('assert'), vm = require('vm'), fs = require('fs');
const {parseHTML} = require('linkedom');
const root = require('path').join(__dirname, '../extension');
const {window} = parseHTML('<html><body><div class="nitro-toolbar"></div><div class="nitro-chat-input"><input type="text"><button>Enviar</button></div><input id="search" placeholder="Pesquisar"></body></html>');
delete window.PixelSquadLauncher; delete window.__PIXELSQUAD_PIXEL_SHORTCUT__;
const saved = new Map(), messages = [];
window.postMessage = data => messages.push(data);
Object.defineProperty(window, 'top', {value: window, configurable: true});
window.HTMLElement.prototype.getBoundingClientRect = function() {return {left:parseFloat(this.style.left) || 20, top:parseFloat(this.style.top) || 100,width:56,height:56};};
window.HTMLElement.prototype.setPointerCapture = function() {};
const ctx = vm.createContext({window, document: window.document, innerWidth:1000,innerHeight:700,
 Event: window.Event, HTMLInputElement:window.HTMLInputElement, HTMLTextAreaElement:window.HTMLTextAreaElement,
 localStorage: {getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)}});
const run = file => vm.runInContext(fs.readFileSync(root + '/' + file, 'utf8'), ctx);
run('launcher.js');
const button = window.document.createElement('button');window.document.body.appendChild(button);
window.PixelSquadLauncher.movable(button);
const pointer = (type,x,y) => {const e = new window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{pointerId:1,button:0,clientX:x,clientY:y});button.dispatchEvent(e);};
pointer('pointerdown',20,100);pointer('pointermove',22,101);pointer('pointerup',22,101);assert.equal(saved.size,0);
pointer('pointerdown',20,100);pointer('pointermove',9999,9999);pointer('pointerup',9999,9999);
assert.deepEqual(JSON.parse(saved.get('pixelsquad_launcher_position')),{x:936,y:636});
const another = window.document.createElement('button');window.document.body.appendChild(another);window.PixelSquadLauncher.movable(another);assert.equal(another.style.left,'936px');
run('pixel-shortcut.js');
const field = window.document.querySelector('.nitro-chat-input input');
function enter(input,value,extra={}) {input.value=value;const e=new window.Event('keydown',{bubbles:true,cancelable:true});Object.assign(e,{key:'Enter',...extra});input.dispatchEvent(e);return e;}
const command=enter(field,' :PiXeL ');assert(command.defaultPrevented);assert.equal(field.value,'');assert.equal(messages.length,1);assert.equal(messages[0].type,'PS_OPEN_PANEL');
assert(!enter(field,'Olá').defaultPrevented);assert.equal(field.value,'Olá');
assert(!enter(window.document.querySelector('#search'),':pixel').defaultPrevented);
assert(!enter(field,':pixel',{isComposing:true}).defaultPrevented);
assert(!enter(field,':pixel',{shiftKey:true}).defaultPrevented);
assert.equal(messages.length,1);
console.log('PASS: launcher drag threshold, bounds and persistence; :pixel interception, normal chat and composition');
