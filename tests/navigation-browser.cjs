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
async function validateControls(page) {
  const previews = '/tmp/pixelsquad-controls'; fs.mkdirSync(previews, {recursive: true});
  const tab = async name => {
    await page.locator('#ps-nav [data-tab="' + name + '"]').click();
    assert.equal(await page.locator('#ps-nav [aria-current="page"]').getAttribute('data-tab'), name);
    const layout = await page.evaluate(() => {
      const main = document.querySelector('#ps-main'), nav = document.querySelector('#ps-nav');
      return {
        main: [main.clientWidth, main.scrollWidth], nav: [nav.clientWidth, nav.scrollWidth],
        toggles: [...main.querySelectorAll('input[type="checkbox"]')].map(input => {
          const box = input.getBoundingClientRect(), label = input.closest('label').getBoundingClientRect();
          return {width: box.width, height: box.height, fits: box.left >= label.left && box.right <= label.right};
        })
      };
    });
    assert(layout.main[1] <= layout.main[0] + 1, name + ': horizontal content overflow ' + JSON.stringify(layout));
    assert(layout.nav[1] <= layout.nav[0] + 1, name + ': horizontal sidebar overflow');
    for (const toggle of layout.toggles) assert(toggle.width >= 16 && toggle.width <= 24 && toggle.height >= 16 && toggle.fits, JSON.stringify(toggle));
  };
  const screenshot = async name => {
    await page.locator('#ps-main').evaluate(main => {main.scrollTop = 0;});
    await page.locator('#pixelsquad .box').screenshot({path: path.join(previews, name + '.png')});
  };
  await tab('settings'); await screenshot('settings-default');
  const compact = page.locator('[data-appearance="compact"]');
  // Clicking the text/card and using Space keep the native checkbox semantics and persistence.
  await compact.locator('..').click({position: {x: 12, y: 12}});
  assert(await compact.isChecked());
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.pixelsquad_state).custom.compact), true);
  await compact.focus(); await compact.press('Space'); assert.equal(await compact.isChecked(), false);
  const rgb = page.locator('[data-rgb="text"]');
  await rgb.locator('..').click({position: {x: 12, y: 12}});
  assert(await rgb.isChecked());
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.pixelsquad_rgb).text), true);
  await rgb.uncheck();
  await tab('translate');
  const incoming = page.locator('#tr-in'); await incoming.locator('..').click({position: {x: 12, y: 12}});
  assert.equal(await incoming.isChecked(), false);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.pixelsquad_translation).incoming), false);
  await incoming.check();
  await tab('build');
  await page.locator('#ps-direction').focus(); await page.locator('#ps-direction').press('ArrowDown');
  await page.locator('#ps-direction').press('Enter');
  assert.equal(await page.locator('#ps-direction').inputValue(), '90');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.pixelsquad_state).direction), 90);
  await tab('wired');
  await page.locator('[data-filter="Condições"]').click();
  assert.equal(await page.locator('.filters [aria-pressed="true"]').getAttribute('data-filter'), 'Condições');
  assert((await page.locator('#ps-wired-list .card b').allTextContents()).every(name => name === 'Condições'));
  await screenshot('wired-default');
  for (const width of [320, 800]) {
    await page.locator('#pixelsquad .box').evaluate((box, size) => {
      box.classList.add('ps-user-size'); box.style.setProperty('--ps-user-width', size + 'px'); box.style.setProperty('--ps-user-height', '640px');
    }, width);
    for (const name of ['settings', 'translate', 'build', 'wired', 'enables', 'tools', 'visuals']) await tab(name);
    await tab('settings'); await screenshot('settings-' + width);
  }
  await page.locator('[data-appearance="scale"]').evaluate(input => {
    input.value = '140'; input.dispatchEvent(new Event('input', {bubbles: true}));
  });
  await page.setViewportSize({width: 375, height: 800});
  for (const name of ['settings', 'translate', 'build', 'wired', 'enables']) await tab(name);
  await tab('settings'); await screenshot('settings-small-large-text');
  await page.locator('[data-appearance="scale"]').evaluate(input => {
    input.value = '100'; input.dispatchEvent(new Event('input', {bubbles: true}));
  });
  await page.setViewportSize({width: 1280, height: 900});
  await page.locator('#pixelsquad .box').evaluate(box => box.classList.remove('ps-user-size'));
  await tab('home');
  console.log('PASS: real CSS, checkbox label/keyboard actions, saved preferences, select keyboard changes, selected filters, panel widths 320/490/800 and narrow viewport with 140% text');
}
(async () => {
  const browser = await chromium.launch({headless: true, executablePath: process.env.PIXELSQUAD_TEST_CHROME || '/usr/bin/google-chrome'});
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 900}});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    // Every URL is served from this fixture. No real hotel connection or credentials are used.
    await page.route('**/*', route => route.fulfill({contentType: 'text/html', body: '<html><body>' + markup + '</body></html>'}));
    await page.goto('https://www.habblet.city/pixelsquad-fixture');
    const manifest = JSON.parse(source('manifest.json'));
    for (const entry of manifest.content_scripts.filter(entry => entry.world === 'ISOLATED')) {
      for (const css of entry.css || []) await page.addStyleTag({content: source(css)});
    }
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
      'window.chrome={runtime:{getURL:()=>"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD/8AAAAASUVORK5CYII=",onMessage:{addListener(){}}},storage:{local:{get:async()=>({}),set:async()=>{}},onChanged:{addListener(){}}}};\n' + ['locales.js','rgb.js','translation.js','effects-catalog.js','handitems-catalog.js','content.js'].map(source).join('\n')});
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    const field = page.locator('.chat-input');
    await field.fill(':pixel'); await field.press('Enter');
    await page.waitForSelector('#pixelsquad');
    assert.equal(await field.inputValue(), '');
    assert.deepEqual(await page.evaluate(() => window.nativeChats), []);
    assert.equal(await page.locator('#ps-creator').textContent(), 'Feito por Pricilao.');
    await validateControls(page);
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
