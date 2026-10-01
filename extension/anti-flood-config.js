(() => {
  if (window.PixelSquadAntiFloodRules) return;
  const defaults = Object.freeze({opacity: 0.3, untilActive: false, chatOnlyActivity: false, botsPets: false, nonFriends: false, friendsNever: false, idle: false,
    pointsEnabled: false, minPoints: 3000, nameEnabled: false, namePattern: '', missionEnabled: false, missionPattern: '', messageEnabled: false, messagePattern: ''});
  const flags = ['untilActive','chatOnlyActivity','botsPets','nonFriends','friendsNever','idle','pointsEnabled','nameEnabled','missionEnabled','messageEnabled'];
  const number = (value, fallback, min, max) => value !== '' && value !== null && Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
  const text = value => typeof value === 'string' ? value.slice(0, 200) : '';
  const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  function normalize(value) {
    const data = value && typeof value === 'object' ? value : {}, out = {...defaults};
    for (const key of flags) out[key] = data[key] === true;
    out.opacity = number(data.opacity, defaults.opacity, 0, 1);
    out.minPoints = Math.floor(number(data.minPoints, defaults.minPoints, 0, 2147483647));
    for (const key of ['namePattern','missionPattern','messagePattern']) out[key] = text(data[key]);
    return out;
  }
  const matches = (value, pattern) => { const query = normalized(pattern); return query.length > 0 && normalized(value).includes(query); };
  function blocked(prefs, user, byMessage = false) {
    if (user.own) return false;
    return !!(byMessage && prefs.messageEnabled ||
      prefs.pointsEnabled && typeof user.points === 'number' && Number.isFinite(user.points) && user.points < prefs.minPoints ||
      prefs.nameEnabled && matches(user.name, prefs.namePattern) || prefs.missionEnabled && matches(user.mission, prefs.missionPattern));
  }
  function opacity(prefs, user) {
    if (user.own || prefs.friendsNever && user.isFriend === true) return 1;
    if (prefs.botsPets && user.type !== 1 || prefs.nonFriends && user.isFriend === false || prefs.idle && user.idle ||
      prefs.untilActive && !(user.chat || !prefs.chatOnlyActivity && user.moved)) return prefs.opacity;
    return 1;
  }
  const enabled = prefs => ['untilActive','botsPets','nonFriends','friendsNever','idle','pointsEnabled','nameEnabled','missionEnabled','messageEnabled'].some(key => prefs[key]);
  window.PixelSquadAntiFloodRules = Object.freeze({defaults, normalize, matches, blocked, opacity, enabled});
})();
