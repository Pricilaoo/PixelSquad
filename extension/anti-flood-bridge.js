(() => {
  if (window.__PIXELSQUAD_ANTIFLOOD_BRIDGE__ || !window.PixelSquadAntiFloodRules) return;
  window.__PIXELSQUAD_ANTIFLOOD_BRIDGE__ = true;
  const rules = window.PixelSquadAntiFloodRules, UNIT = 100, records = new Map(), friends = new Set(), fragments = new Set(), messageBlocked = new Set(), hiddenBubbles = new Set();
  let prefs = rules.normalize(null), engine = null, connection = null, parseHook = null, chatHook = null, bindHook = null;
  let interval = null, captureTimer = null, connectionGetter = null, queued = false, revision = 0, spriteVersion = 0, currentRoom = null, currentRoomId = null, friendsReady = false;
  let suspended = false, gameListeners = [], statusSignature = '', statusTimer = null;
  const nativeSubscribers = new Set();
  window.PixelSquadNativeClient = Object.freeze({
    get roomEngine() {return engine;}, get connection() {if(!suspended) {const next=engine?._communication?.connection || engine?.roomSessionManager?.communication?.connection;if(next)connect(next);}return connection;},
    subscribeMessages(callback) {if (typeof callback !== 'function') return () => {}; nativeSubscribers.add(callback); return () => nativeSubscribers.delete(callback);}
  });
  try {prefs = rules.normalize(JSON.parse(localStorage.getItem('pixelsquad_antiflood') || 'null'));} catch {}
  // Native API shapes and sprite alpha are verified against nitro-renderer 9e9a623.
  // The early bind hook captures the engine before the client's private module scope closes.
  const validEngine = value => value && typeof value.getRoomObject === 'function' && typeof value.getRoomObjectByIndex === 'function' && typeof value.getTotalObjectsForManager === 'function';
  const session = () => {try {return engine?.roomSessionManager?.getSession(-1) || null;} catch {return null;}};
  function restoreMethod(hook) {
    if (!hook || hook.object[hook.name] !== hook.wrapper) return;
    if (hook.descriptor) Object.defineProperty(hook.object, hook.name, hook.descriptor); else delete hook.object[hook.name];
  }
  function hookMethod(object, name, handler) {
    if (!object || typeof object[name] !== 'function') return null;
    const original = object[name], descriptor = Object.getOwnPropertyDescriptor(object, name);
    const wrapper = new Proxy(original, {apply: (target, receiver, args) => handler(target, receiver, args)});
    try {Object.defineProperty(object, name, {value: wrapper, writable: true, configurable: true});} catch {return null;}
    return {object, name, wrapper, descriptor};
  }
  function invalidate(visualization) {
    if (typeof visualization?.updateSpriteCounter === 'number') visualization.updateSpriteCounter = -(++spriteVersion + 1);
  }
  function touchSprites(record) {
    for (const [sprite, saved] of record.sprites) {
      const raw = saved.original.get.call(sprite);
      saved.original.set.call(sprite, raw === 255 ? 254 : 255);
      saved.original.set.call(sprite, raw);
    }
  }
  function release(record) {
    record.active = false; restoreMethod(record.updateHook);
    for (const [sprite, saved] of record.sprites) {
      if (Object.getOwnPropertyDescriptor(sprite, 'alpha')?.get !== saved.getter) continue;
      if (saved.descriptor) Object.defineProperty(sprite, 'alpha', saved.descriptor); else delete sprite.alpha;
    }
    touchSprites(record);
    invalidate(record.visualization);
  }
  function releaseRoom() {
    for (const record of records.values()) release(record);
    records.clear(); messageBlocked.clear();
    for (const bubble of hiddenBubbles) bubble.classList.remove('ps-antiflood-hidden'); hiddenBubbles.clear();
  }
  function dataFor(object, room) {
    const data = room?.userDataManager?.getUserDataByIndex(object.id);
    if (!data) return null;
    return {name: data.name || '', mission: data.custom || '', points: data.activityPoints, type: data.type, webID: data.webID,
      own: object.id === room.ownRoomIndex, isFriend: friends.has(data.webID) ? true : friendsReady ? false : null,
      idle: !!object.model?.getValue?.('figure_sleep')};
  }
  function position(object) {
    const location = object.getLocation?.(), direction = object.getDirection?.();
    return location ? [location.x, location.y, location.z, direction?.x].join('|') : null;
  }
  function factor(record) {
    const room = session(), user = dataFor(record.object, room); if (!user) return 1;
    const next = position(record.object);
    if (record.position !== null && next !== null && record.position !== next) record.moved = true;
    record.position = next; user.moved = record.moved; user.chat = record.chat;
    const signature = [revision, user.name, user.mission, user.points, user.own, messageBlocked.has(record.object.id)].join('|');
    if (signature !== record.policySignature) {
      record.blocked = rules.blocked(prefs, user, messageBlocked.has(record.object.id)); record.policySignature = signature;
    }
    return record.blocked ? 0 : rules.opacity(prefs, user);
  }
  function patchSprites(record) {
    let changed = false;
    for (const sprite of record.visualization.sprites || []) {
      if (!sprite || record.sprites.has(sprite)) continue;
      const own = Object.getOwnPropertyDescriptor(sprite, 'alpha'); let descriptor = own, proto = sprite;
      while (!descriptor && (proto = Object.getPrototypeOf(proto))) descriptor = Object.getOwnPropertyDescriptor(proto, 'alpha');
      if (!descriptor?.get || !descriptor.set || own?.configurable === false) continue;
      const original = descriptor, getter = function() { return Math.round(original.get.call(this) * record.factor); };
      try {
        Object.defineProperty(sprite, 'alpha', {get: getter, set(value) {original.set.call(this, value);}, configurable: true, enumerable: original.enumerable});
        record.sprites.set(sprite, {descriptor: own, getter, original}); changed = true;
      } catch {}
    }
    return changed;
  }
  function update(record) {
    if (!record.active) return;
    const previous = record.factor; record.factor = factor(record);
    const patched = patchSprites(record);
    if (previous !== record.factor || patched) {touchSprites(record); invalidate(record.visualization); scheduleStatus();}
  }
  function attach(object) {
    const visualization = object?.visualization;
    if (!visualization || typeof visualization.update !== 'function' || !Array.isArray(visualization.sprites)) return null;
    const record = {object, visualization, webID: dataFor(object, session())?.webID, active: true, factor: 1, blocked: false, moved: false, chat: false,
      position: position(object), sprites: new Map(), policySignature: '', updateHook: null};
    record.updateHook = hookMethod(visualization, 'update', (target, receiver, args) => {
      const result = Reflect.apply(target, receiver, args); if (receiver === visualization && !suspended) update(record); return result;
    });
    if (!record.updateHook) return null;
    records.set(object.id, record); update(record); return record;
  }
  function bubbleData(element) {
    const key = Object.keys(element).find(name => name.startsWith('__reactFiber$') || name.startsWith('__reactInternalInstance$'));
    let fiber = key && element[key];
    for (let depth = 0; fiber && depth < 8; depth++, fiber = fiber.return) {
      const chat = fiber.memoizedProps?.chat;
      if (chat && typeof chat.senderId === 'number' && typeof chat.roomId === 'number') return chat;
    }
    return null;
  }
  function collectBubbles(room) {
    for (const bubble of document.querySelectorAll('.bubble-container')) {
      const chat = bubbleData(bubble); if (!chat || chat.roomId !== room.roomId) continue;
      const object = engine.getRoomObject(room.roomId, chat.senderId, UNIT), user = object && dataFor(object, room);
      if (!user || user.own) continue;
      if (prefs.messageEnabled && rules.matches(chat.text, prefs.messagePattern)) messageBlocked.add(chat.senderId);
      const blocked = rules.blocked(prefs, user, messageBlocked.has(chat.senderId));
      bubble.classList.toggle('ps-antiflood-hidden', blocked);
      if (blocked) hiddenBubbles.add(bubble); else hiddenBubbles.delete(bubble);
    }
    for (const bubble of hiddenBubbles) if (!bubble.isConnected) hiddenBubbles.delete(bubble);
  }
  function synchronize() {
    if (suspended || !engine || engine.disposed) return;
    const room = session();
    if (room !== currentRoom || room?.roomId !== currentRoomId) {releaseRoom(); currentRoom = room; currentRoomId = room?.roomId;}
    if (!rules.enabled(prefs) || !room) {releaseRoom(); report(); return;}
    collectBubbles(room);
    const seen = new Set(), total = engine.getTotalObjectsForManager(room.roomId, UNIT);
    for (let index = 0; index < total; index++) {
      const object = engine.getRoomObjectByIndex(room.roomId, index, UNIT), user = object && dataFor(object, room); if (!object || !user) continue;
      seen.add(object.id); let record = records.get(object.id);
      if (record && (record.object !== object || record.visualization !== object.visualization || record.webID !== user.webID)) {release(record); records.delete(object.id); messageBlocked.delete(object.id); record = null;}
      if (record) update(record); else attach(object);
    }
    for (const [index, record] of records) if (!seen.has(index)) {release(record); records.delete(index); messageBlocked.delete(index);}
    report();
  }
  function queue() {
    if (queued || suspended) return; queued = true;
    queueMicrotask(() => {queued = false; boot();});
  }
  function report() {
    const room = session(), status = {connected: !!(engine && !engine.disposed && connection), room: !!room,
      friendsReady, translucent: 0, hiddenPlayers: 0, blocked: 0};
    for (const record of records.values()) {
      const user = dataFor(record.object, room);
      if (record.blocked) ++status.blocked;
      else if (prefs.hidePlayers && user?.type === 1 && !user.own) ++status.hiddenPlayers;
      else if (record.factor < 1) ++status.translucent;
    }
    const signature = JSON.stringify(status); if (signature === statusSignature) return; statusSignature = signature;
    const message = {source: 'pixelsquad', type: 'PS_ANTIFLOOD_STATUS', status};
    window.postMessage(message, '*'); if (window.top !== window) window.top.postMessage(message, '*');
  }
  function scheduleStatus() {
    if (statusTimer) return;
    statusTimer = setTimeout(() => {statusTimer = null; report();}, 200);
  }
  function observeFriends(header, parser) {
    if (header === 2491) {friends.clear(); fragments.clear(); friendsReady = false;}
    if (header === 3130 && Array.isArray(parser?.fragment)) {
      if (parser.fragmentNumber === 0) {friends.clear(); fragments.clear(); friendsReady = false;}
      for (const friend of parser.fragment) if (Number.isSafeInteger(friend.id)) friends.add(friend.id);
      fragments.add(parser.fragmentNumber); friendsReady = fragments.size >= parser.totalFragments;
    }
    if (header === 2800 && Array.isArray(parser?.removedFriendIds)) {
      for (const id of parser.removedFriendIds) friends.delete(id);
      for (const friend of [...(parser.addedFriends || []), ...(parser.updatedFriends || [])]) if (Number.isSafeInteger(friend.id)) friends.add(friend.id);
    }
    if ([2491,3130,2800].includes(header)) queue();
  }
  function connect(next) {
    if (!next || next === connection && parseHook) return;
    const changed = next !== connection;
    restoreMethod(parseHook); parseHook = null; connection = next;
    if (changed) {friends.clear(); fragments.clear(); friendsReady = false;}
    parseHook = hookMethod(connection, 'getMessagesForWrapper', (target, receiver, args) => {
      const messages = Reflect.apply(target, receiver, args);
      if (receiver === connection && messages?.length) {
        observeFriends(args[0]?.header, messages[0].parser);
        for (const callback of nativeSubscribers) try {callback(args[0]?.header, messages[0].parser);} catch {}
      }
      return messages;
    });
    // A list already received before capture can still supply its most recent fragment.
    if (changed) try {const message = connection._messages?.getEvents?.(3130)?.[0]; if (message?.parser) observeFriends(3130, message.parser);} catch {}
  }
  function stopConnectionGetter() {
    const hook = connectionGetter; if (!hook) return;
    if (Object.getOwnPropertyDescriptor(hook.object, 'connection')?.get === hook.getter) {
      if (hook.own) Object.defineProperty(hook.object, 'connection', hook.own); else delete hook.object.connection;
    }
    connectionGetter = null;
  }
  function watchConnection(communication) {
    if (!communication || connectionGetter) return;
    const current = communication.connection; if (current) {connect(current); return;}
    const own = Object.getOwnPropertyDescriptor(communication, 'connection'); let descriptor = own, proto = communication;
    while (!descriptor && (proto = Object.getPrototypeOf(proto))) descriptor = Object.getOwnPropertyDescriptor(proto, 'connection');
    if (!descriptor?.get || own?.configurable === false) return;
    const original = descriptor, getter = function() {
      const value = original.get.call(this);
      if (value) {connect(value); stopConnectionGetter(); queue();}
      return value;
    };
    try {
      Object.defineProperty(communication, 'connection', {get: getter, set: original.set, configurable: true, enumerable: original.enumerable});
      connectionGetter = {object: communication, own, getter};
    } catch {}
  }
  function attachChat(manager) {
    const dispatcher = manager?.events; if (!dispatcher || chatHook?.object === dispatcher) return;
    restoreMethod(chatHook);
    chatHook = hookMethod(dispatcher, 'dispatchEvent', (target, receiver, args) => {
      const event = args[0];
      if (!suspended && rules.enabled(prefs) && event?.type === 'RSCE_CHAT_EVENT' && event.session === session()) {
        const room = event.session, object = engine.getRoomObject(room.roomId, event.objectId, UNIT), user = object && dataFor(object, room);
        if (user && !user.own) {
          const spoken = event.chatType >= 0 && event.chatType <= 2 && typeof event.message === 'string';
          if (spoken && prefs.messageEnabled && rules.matches(event.message, prefs.messagePattern)) messageBlocked.add(object.id);
          const record = records.get(object.id) || attach(object);
          if (record) {if (spoken) record.chat = true; update(record);}
          if (rules.blocked(prefs, user, messageBlocked.has(object.id))) {scheduleStatus(); return true;}
        }
      }
      return Reflect.apply(target, receiver, args);
    });
  }
  function stopInterval() {if (interval) clearInterval(interval); interval = null;}
  function boot() {
    if (suspended || !engine || engine.disposed) return;
    watchConnection(engine._communication || engine.roomSessionManager?.communication);
    const manager = engine.roomSessionManager, next = manager?.communication?.connection || engine._communication?.connection;
    connect(next);
    if (rules.enabled(prefs)) {
      attachChat(manager);
      if (!gameListeners.length && engine.events?.addEventListener) for (const type of ['REOE_ADDED','REOE_REMOVED','REE_INITIALIZED','REE_DISPOSED']) {
        engine.events.addEventListener(type, queue); gameListeners.push([engine.events, type]);
      }
    } else {
      restoreMethod(chatHook); chatHook = null;
      for (const [dispatcher, type] of gameListeners) dispatcher.removeEventListener(type, queue); gameListeners = [];
    }
    synchronize();
    if (document.hidden || connection && !rules.enabled(prefs)) stopInterval();
    else if (!interval) interval = setInterval(boot, 500);
  }
  function stopCapture() {
    if (captureTimer) clearTimeout(captureTimer); captureTimer = null;
    if (bindHook && Function.prototype.bind === bindHook.wrapper) Object.defineProperty(Function.prototype, 'bind', bindHook.descriptor);
    bindHook = null;
  }
  function capture(candidate) {
    if (engine || !candidate || candidate === window) return;
    let found = null;
    try {found = validEngine(candidate) ? candidate : validEngine(candidate.roomEngine) ? candidate.roomEngine : null;} catch {}
    if (!found) return;
    engine = found; stopCapture(); watchConnection(engine._communication); queue();
    window.dispatchEvent(new window.Event('pixelsquad-native-room-ready'));
  }
  for (const name of ['Nitro','nitro','NitroInstance','nitroInstance']) {
    try {const value = window[name]; capture(value?.instance || value);} catch {}
  }
  if (!engine) {
    const descriptor = Object.getOwnPropertyDescriptor(Function.prototype, 'bind'), original = descriptor.value;
    const wrapper = new Proxy(original, {apply(target, receiver, args) {
      const result = Reflect.apply(target, receiver, args); if (!engine) capture(args[0]); return result;
    }});
    bindHook = {descriptor, wrapper}; Object.defineProperty(Function.prototype, 'bind', {...descriptor, value: wrapper});
    captureTimer = setTimeout(stopCapture, 30000);
  }
  window.addEventListener('message', event => {
    if (event.source !== window || event.data?.source !== 'pixelsquad') return;
    if (event.data.type === 'PS_ANTIFLOOD_CONFIG') {
      const next = rules.normalize(event.data.config);
      if (prefs.messagePattern !== next.messagePattern || !next.messageEnabled) messageBlocked.clear();
      prefs = next; ++revision; statusSignature = ''; boot(); report();
    }
  });
  window.addEventListener('pagehide', () => {
    suspended = true; stopCapture(); stopConnectionGetter(); stopInterval(); releaseRoom(); restoreMethod(chatHook); chatHook = null;
    restoreMethod(parseHook); parseHook = null;
    for (const [dispatcher, type] of gameListeners) dispatcher.removeEventListener(type, queue); gameListeners = [];
    if (statusTimer) clearTimeout(statusTimer); statusTimer = null;
  });
  window.addEventListener('pageshow', () => {suspended = false; statusSignature = ''; boot();});
  document.addEventListener('visibilitychange', () => {if (document.hidden) stopInterval(); else boot();});
  boot(); report();
})();
