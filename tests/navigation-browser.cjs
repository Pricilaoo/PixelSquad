const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright-core');
const root = path.join(__dirname, '../extension');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
const markup = '<div class="nitro-toolbar"></div><div id="toolbar-chat-input-container"><div class="nitro-chat-input-container"><input class="chat-input" type="text" placeholder="Clique aqui para conversar"><button data-chat-send>Enviar</button><button id="chat-style">Estilo do balão</button></div></div>';
const socketFixture = () => {
  window.testPackets = [];
  window.WebSocket = class extends EventTarget {
    static OPEN = 1;
    readyState = 1;
    send(data) { window.testPackets.push([...new Uint8Array(data)]); }
  };
};
const authenticate = () => {
  window.testSocket = new window.WebSocket();
  const buffer = new ArrayBuffer(6), view = new DataView(buffer);
  view.setUint32(0, 2); view.setUint16(4, 2491);
  window.testSocket.dispatchEvent(new MessageEvent('message', {data: buffer}));
};
const profileHeader = bytes => new DataView(Uint8Array.from(bytes).buffer).getUint16(4);
async function prepareGame(frame) {
  await frame.evaluate(socketFixture);
  await frame.addScriptTag({content: source('performance-bridge.js')});
  await frame.addScriptTag({content: source('pixel-shortcut.js')});
  await frame.evaluate(authenticate);
}
(async () => {
  const browser = await chromium.launch({headless: true, executablePath: process.env.PIXELSQUAD_TEST_CHROME || '/usr/bin/google-chrome'});
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    // Every URL is served from this fixture. No real hotel connection or credentials are used.
    await page.route('**/*', route => route.fulfill({contentType: 'text/html', body: '<html><body>' + markup + '</body></html>'}));
    await page.goto('https://www.habblet.city/pixelsquad-fixture');
    await prepareGame(page);
    await page.evaluate(() => {
      window.nativeChats = [];
      document.body.addEventListener('keydown', event => {
        if (event.key === 'Enter') window.nativeChats.push(event.target.value);
      });
    });
    const cdp = await page.context().newCDPSession(page);
    const {frameTree} = await cdp.send('Page.getFrameTree');
    const {executionContextId} = await cdp.send('Page.createIsolatedWorld', {frameId: frameTree.frame.id, worldName: 'PixelSquadFixture'});
    const result = await cdp.send('Runtime.evaluate', {contextId: executionContextId, expression:
      'window.chrome={runtime:{getURL:()=>"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD/8AAAAASUVORK5CYII=",onMessage:{addListener(){}}},storage:{local:{get:async()=>({})}}};\n' + source('locales.js') + '\n' + source('content.js')});
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    const field = page.locator('.chat-input');
    await field.fill(':pixel'); await field.press('Enter');
    await page.waitForSelector('#pixelsquad');
    assert.equal(await field.inputValue(), '');
    assert.deepEqual(await page.evaluate(() => window.nativeChats), []);
    assert.equal(await page.locator('#ps-creator').textContent(), 'Feito por Pricilao.');
    // A main-world click calls the isolated UI handler and reaches the game before it returns.
    const first = await page.evaluate(() => {
      const before = window.testPackets.length;
      document.querySelector('#ps-creator').click();
      return {delta: window.testPackets.length - before, bytes: window.testPackets.at(-1)};
    });
    assert.equal(first.delta, 1); assert.equal(profileHeader(first.bytes), 2249);
    assert.equal(String.fromCharCode(...first.bytes.slice(8)), 'Pricilao.');
    await page.evaluate(() => {
      const name = 'Pricilao.', buffer = new ArrayBuffer(40 + name.length), view = new DataView(buffer);
      view.setUint32(0, buffer.byteLength - 4); view.setUint16(4, 3898); view.setInt32(6, 12345); view.setUint16(10, name.length);
      for (let i = 0; i < name.length; i++) view.setUint8(12 + i, name.charCodeAt(i));
      view.setUint8(buffer.byteLength - 1, 1);
      window.testSocket.dispatchEvent(new MessageEvent('message', {data: buffer}));
    });
    const second = await page.evaluate(() => {
      const before = window.testPackets.length; document.querySelector('#ps-creator').click();
      return {delta: window.testPackets.length - before, bytes: window.testPackets.at(-1)};
    });
    assert.equal(second.delta, 1); assert.equal(profileHeader(second.bytes), 3265);
    assert.equal(new DataView(Uint8Array.from(second.bytes).buffer).getInt32(6), 12345);
    assert.equal(second.bytes[10], 1);
    await page.locator('#ps-close').click();
    await field.fill('Olá'); await field.press('Enter');
    assert.equal(await page.locator('#pixelsquad').count(), 0);
    assert.deepEqual(await page.evaluate(() => window.nativeChats), ['Olá']);
    await field.fill(':pixel'); await page.locator('#chat-style').click();
    assert.equal(await page.locator('#pixelsquad').count(), 0); assert.equal(await field.inputValue(), ':pixel');
    await page.locator('[data-chat-send]').click(); await page.waitForSelector('#pixelsquad');
    await page.locator('#ps-close').click();
    const frameReady = page.waitForEvent('framenavigated', {predicate: frame => frame.url().includes('/game-fixture')});
    await page.evaluate(() => {
      const frame = document.createElement('iframe'); frame.src = 'https://game.habblet.city/game-fixture'; document.body.appendChild(frame);
    });
    const game = await frameReady; await game.waitForSelector('.chat-input'); await prepareGame(game);
    await game.locator('.chat-input').fill(':pixel'); await game.locator('.chat-input').press('Enter');
    await page.waitForSelector('#pixelsquad');
    // The credit still reaches a game in another frame when the parent has no toolbar.
    await page.evaluate(() => document.querySelector('.nitro-toolbar').remove());
    await page.locator('#ps-creator').click();
    await game.waitForFunction(() => window.testPackets.some(bytes => new DataView(Uint8Array.from(bytes).buffer).getUint16(4) === 2249));
    const frameProfiles = await game.evaluate(() => window.testPackets.filter(bytes => new DataView(Uint8Array.from(bytes).buffer).getUint16(4) === 2249));
    assert.equal(frameProfiles.length, 1);
    assert.equal(String.fromCharCode(...frameProfiles[0].slice(8)), 'Pricilao.');
    assert.deepEqual(errors, []);
    console.log('PASS: Chrome main/isolated worlds, native Nitro chat interception, real panel rendering, synchronous creator click, confirmed ID and game iframe fallback');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
