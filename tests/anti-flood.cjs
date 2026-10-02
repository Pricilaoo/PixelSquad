const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {parseHTML} = require('linkedom');
const source = name => fs.readFileSync(path.join(__dirname, '../extension', name), 'utf8');
const rulesContext = vm.createContext({window: {}}); vm.runInContext(source('anti-flood-config.js'), rulesContext);
const rules = rulesContext.window.PixelSquadAntiFloodRules, defaults = rules.normalize(null);
assert.equal(defaults.opacity, .3); assert.equal(defaults.minPoints, 3000); assert.equal(rules.enabled(defaults), false);
assert.equal(defaults.hidePlayers, false); assert.equal(rules.normalize({hidePlayers: 'true'}).hidePlayers, false);
assert(rules.enabled({...defaults, hidePlayers: true}));
assert.equal(rules.normalize({opacity: 9, minPoints: -1}).opacity, 1); assert.equal(rules.normalize({opacity: 9, minPoints: -1}).minPoints, 0);
assert.equal(rules.normalize({opacity: null, namePattern: '<hello>'}).opacity, .3);
assert.equal(rules.normalize({pointsEnabled: 'true'}).pointsEnabled, false);
assert(rules.matches('Missão de coleção', 'MISSAO')); assert(!rules.matches('qualquer pessoa', ''));
const user = {type: 1, points: 1000, name: 'Pessoa', mission: 'Venda de raros', own: false, isFriend: false, chat: false, moved: false, idle: false};
assert(rules.blocked({...defaults, pointsEnabled: true}, user)); assert(!rules.blocked({...defaults, pointsEnabled: true}, {...user, points: undefined}));
assert(!rules.blocked({...defaults, pointsEnabled: true}, {...user, own: true}));
assert(rules.blocked({...defaults, missionEnabled: true, missionPattern: 'raros'}, user));
assert.equal(rules.opacity({...defaults, nonFriends: true}, {...user, isFriend: null}), 1);
assert.equal(rules.opacity({...defaults, nonFriends: true}, user), .3);
assert.equal(rules.opacity({...defaults, untilActive: true}, {...user, moved: true}), 1);
assert.equal(rules.opacity({...defaults, untilActive: true, chatOnlyActivity: true}, {...user, moved: true}), .3);
assert.equal(rules.opacity({...defaults, untilActive: true, chatOnlyActivity: true}, {...user, chat: true}), 1);
assert.equal(rules.opacity({...defaults, untilActive: true, friendsNever: true}, {...user, isFriend: true}), 1);
assert.equal(rules.opacity({...defaults, botsPets: true}, {...user, type: 2}), .3);
assert.equal(rules.opacity({...defaults, idle: true}, {...user, idle: true}), .3);
assert.equal(rules.opacity({...defaults, hidePlayers: true, friendsNever: true}, {...user, isFriend: true}), 0);
assert.equal(rules.opacity({...defaults, hidePlayers: true}, {...user, own: true}), 1);
assert.equal(rules.opacity({...defaults, hidePlayers: true}, {...user, type: 2}), 1);
assert.equal(rules.opacity({...defaults, hidePlayers: true}, {...user, type: 3}), 1);
class Dispatcher {
  constructor() {this.listeners = new Map(); this.delivered = [];}
  addEventListener(type, callback) {const list = this.listeners.get(type) || []; list.push(callback); this.listeners.set(type, list);}
  removeEventListener(type, callback) {this.listeners.set(type, (this.listeners.get(type) || []).filter(fn => fn !== callback));}
  dispatchEvent(event) {this.delivered.push(event); for (const callback of this.listeners.get(event.type) || []) callback(event); return true;}
}
class Sprite {
  constructor(alpha) {this.raw = alpha; this.updateCounter = 0;}
  get alpha() {return this.raw;}
  set alpha(value) {if (this.raw !== value) {this.raw = value; ++this.updateCounter;}}
}
class Visualization {
  constructor() {this.sprites = [new Sprite(255), new Sprite(50)]; this.updateSpriteCounter = 1;}
  update(...args) {this.lastArgs = args; return 'native-result';}
}
const {window} = parseHTML('<html><body><div class="bubble-container" id="old-message"></div></body></html>'), document = window.document;
delete window.PixelSquadAntiFloodRules; delete window.__PIXELSQUAD_ANTIFLOOD_BRIDGE__;
const messages = [], microtasks = [], timers = new Map(), intervals = new Map(); let timerId = 0;
window.postMessage = message => messages.push(message); Object.defineProperty(window, 'top', {value: window, configurable: true});
const connection = {getMessagesForWrapper(wrapper) {return [{parser: wrapper.parser}];}}, originalParser = connection.getMessagesForWrapper;
class Communication {constructor() {this.current = null;} get connection() {return this.current;}}
const communication = new Communication(), chatDispatcher = new Dispatcher(), originalChat = chatDispatcher.dispatchEvent;
const data = new Map([0, 1, 2, 3, 4].map(index => [index, {name: ['Eu','Amiga','Pessoa','Bot','Pet'][index], webID: 10 + index,
  custom: index === 2 ? 'Venda de raros' : '', activityPoints: index === 2 ? 1000 : 5000, type: index === 3 ? 3 : index === 4 ? 2 : 1}]));
let room = {roomId: 100, ownRoomIndex: 0, userDataManager: {getUserDataByIndex: id => data.get(id)}};
const objects = [...data.keys()].map(id => ({id, instanceId: id + 100, visualization: new Visualization(), coords: {x: 0, y: 0, z: 0}, direction: {x: 0}, asleep: false,
  getLocation() {return this.coords;}, getDirection() {return this.direction;}, model: {getValue: () => objects?.find(object => object.id === id)?.asleep}}));
const engine = {_communication: communication, events: new Dispatcher(), disposed: false,
  roomSessionManager: {getSession: () => room, communication, events: chatDispatcher},
  getRoomObject: (roomId, id) => objects.find(object => object.id === id), getRoomObjectByIndex: (roomId, index) => objects[index],
  getTotalObjectsForManager: () => objects.length};
const context = vm.createContext({window, document, testEngine: engine, localStorage: {getItem: () => null},
  queueMicrotask: fn => microtasks.push(fn), setTimeout: (fn, ms) => {const id = ++timerId; timers.set(id, {fn, ms}); return id;}, clearTimeout: id => timers.delete(id),
  setInterval: fn => {const id = ++timerId; intervals.set(id, fn); return id;}, clearInterval: id => intervals.delete(id)});
vm.runInContext(source('anti-flood-config.js'), context);
const nativeBind = vm.runInContext('Function.prototype.bind', context);
vm.runInContext(source('anti-flood-bridge.js'), context);
assert.notEqual(vm.runInContext('Function.prototype.bind', context), nativeBind);
assert.equal(vm.runInContext('(function(a){return this.offset + a;}).bind({offset: 7}, 5)()', context), 12);
vm.runInContext('(function(){}).bind(testEngine)', context);
assert.equal(vm.runInContext('Function.prototype.bind', context), nativeBind);
communication.current = connection;
assert.equal(communication.connection, connection); assert(!Object.hasOwn(communication, 'connection'));
const flush = () => {let count = 0; while (microtasks.length) {assert(++count < 100, 'microtask loop'); microtasks.shift()();}};
flush(); assert.equal(intervals.size, 0);
const config = changes => {
  const event = new window.Event('message'); Object.assign(event, {source: window, data: {source: 'pixelsquad', type: 'PS_ANTIFLOOD_CONFIG', config: {...defaults, ...changes}}});
  window.dispatchEvent(event); flush();
};
const alpha = index => objects[index].visualization.sprites[0].alpha;
config({untilActive: true}); assert.equal(alpha(0), 255); assert.equal(alpha(1), 77); assert.equal(alpha(2), 77);
const sprite = objects[2].visualization.sprites[0], changedCounter = sprite.updateCounter;
assert(changedCounter > 0, 'the native renderer must see the changed sprite counter');
for (let i = 0; i < 5; i++) assert.equal(objects[2].visualization.update('geometry', 50, true, false), 'native-result');
assert.equal(alpha(2), 77, 'opacity must not compound across frames');
sprite.alpha = 150; assert.equal(sprite.raw, 150); assert.equal(sprite.alpha, 45);
objects[2].coords.x = 1; objects[2].visualization.update(); assert.equal(alpha(2), 150);
config({untilActive: true, chatOnlyActivity: true}); assert.equal(alpha(2), 45);
const say = (id, message) => chatDispatcher.dispatchEvent({type: 'RSCE_CHAT_EVENT', session: room, objectId: id, chatType: 0, message});
say(2, 'Olá'); assert.equal(alpha(2), 150); assert.equal(chatDispatcher.delivered.at(-1).message, 'Olá');
connection.getMessagesForWrapper({header: 3130, parser: {fragmentNumber: 0, totalFragments: 2, fragment: [{id: 11}]}}); flush();
config({nonFriends: true}); assert.equal(alpha(1), 255); assert.equal(alpha(2), 150, 'unknown friendship must not be treated as non-friend');
connection.getMessagesForWrapper({header: 3130, parser: {fragmentNumber: 1, totalFragments: 2, fragment: []}}); flush();
assert.equal(alpha(2), 45); config({untilActive: true, friendsNever: true}); assert.equal(alpha(1), 255);
connection.getMessagesForWrapper({header: 2800, parser: {removedFriendIds: [11], addedFriends: [], updatedFriends: []}}); flush(); assert.equal(alpha(1), 77);
config({botsPets: true}); assert.equal(alpha(3), 77); assert.equal(alpha(4), 77); assert.equal(alpha(1), 255);
objects[1].asleep = true; config({idle: true}); assert.equal(alpha(1), 77); objects[1].asleep = false;
config({pointsEnabled: true}); assert.equal(alpha(2), 0); assert.equal(alpha(0), 255);
const delivered = chatDispatcher.delivered.length; say(2, 'Oi'); assert.equal(chatDispatcher.delivered.length, delivered); say(0, 'Meu texto'); assert.equal(chatDispatcher.delivered.length, delivered + 1);
config({nameEnabled: true, namePattern: 'PESSOA'}); assert.equal(alpha(2), 0);
config({missionEnabled: true, missionPattern: 'raros'}); assert.equal(alpha(2), 0);
config({messageEnabled: true, messagePattern: 'spam'}); const before = chatDispatcher.delivered.length;
say(2, 'SPAM aqui'); assert.equal(chatDispatcher.delivered.length, before); assert.equal(alpha(2), 0);
say(2, 'Outra frase'); assert.equal(chatDispatcher.delivered.length, before);
config({messageEnabled: true, messagePattern: 'diferente'}); assert.equal(alpha(2), 150);
const bubble = document.querySelector('#old-message'); bubble.__reactFiber$test = {return: {memoizedProps: {chat: {senderId: 2, roomId: 100, text: 'spam antigo'}}}};
config({messageEnabled: true, messagePattern: 'spam'}); assert(bubble.classList.contains('ps-antiflood-hidden')); assert.equal(alpha(2), 0);
room = {...room, roomId: 200}; engine.events.dispatchEvent({type: 'REE_INITIALIZED'}); flush();
assert.equal(alpha(2), 150); assert(!bubble.classList.contains('ps-antiflood-hidden'));
config({untilActive: true}); window.dispatchEvent(new window.Event('pagehide'));
assert.equal(alpha(1), 255); assert.equal(intervals.size, 0); assert.equal(connection.getMessagesForWrapper, originalParser); assert.equal(chatDispatcher.dispatchEvent, originalChat);
window.dispatchEvent(new window.Event('pageshow')); flush(); assert.equal(alpha(1), 77);
config({}); assert.equal(alpha(1), 255); assert.equal(alpha(2), 150); assert.equal(intervals.size, 0);
assert.equal(chatDispatcher.dispatchEvent, originalChat); assert(!Object.hasOwn(objects[1].visualization, 'update'));
assert(!Object.hasOwn(objects[1].visualization.sprites[0], 'alpha'));
config({hidePlayers: true, friendsNever: true, opacity: 1});
assert.equal(alpha(0), 255); assert.equal(alpha(1), 0); assert.equal(alpha(2), 0);
assert.equal(objects[1].visualization.sprites[1].alpha, 0, 'all avatar layers must disappear');
assert.equal(alpha(3), 255); assert.equal(alpha(4), 255);
const beforeHiddenChat = chatDispatcher.delivered.length;
say(2, 'Continuo no chat'); assert.equal(chatDispatcher.delivered.length, beforeHiddenChat + 1);
data.set(5, {name: 'Novo jogador', webID: 15, type: 1, activityPoints: 5000, custom: ''});
objects.push({...objects[1], id: 5, instanceId: 105, visualization: new Visualization()});
engine.events.dispatchEvent({type: 'REOE_ADDED'}); flush(); assert.equal(alpha(5), 0);
room = {...room, roomId: 300}; engine.events.dispatchEvent({type: 'REE_INITIALIZED'}); flush();
assert.equal(alpha(0), 255); assert.equal(alpha(1), 0); assert.equal(alpha(2), 0); assert.equal(alpha(5), 0);
sprite.alpha = 180; assert.equal(sprite.raw, 180); assert.equal(alpha(2), 0);
config({untilActive: true}); assert.equal(alpha(1), 77); assert.equal(alpha(2), 54, 'previous filters resume after hiding is disabled');
config({}); assert.equal(alpha(1), 255); assert.equal(alpha(2), 180); assert.equal(alpha(5), 255);
assert.equal(objects[1].visualization.sprites[1].alpha, 50);
assert(!Object.hasOwn(objects[1].visualization.sprites[0], 'alpha')); assert.equal(intervals.size, 0);
console.log('PASS: hide other players, own avatar/bots/pets preserved, chat delivered, arriving players, room changes, current native alpha and complete restoration');
window.dispatchEvent(new window.Event('pagehide')); assert.equal(timers.size, 0);
console.log('PASS: Anti-flood defaults/bounds, early native capture/bind semantics, connection getter, real sprite counters, no opacity compounding, activity/chat/idle/friends/bots/pets, four local filters, own-user exception, historical bubbles, room changes and native restoration');
