const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const {chromium} = require('playwright-core');
const source = file => fs.readFileSync(path.join(__dirname, '../extension', file), 'utf8');
const packages = file => fs.readFileSync(path.join(__dirname, 'node_modules', file), 'utf8');
async function prepare(frame) {
  await frame.addScriptTag({content: packages('react/umd/react.development.js')});
  await frame.addScriptTag({content: packages('react-dom/umd/react-dom.development.js')});
  await frame.evaluate(() => {
    window.nativeChats = []; window.panelRequests = 0;
    window.addEventListener('message', event => { if (event.data?.type === 'PS_OPEN_PANEL') ++window.panelRequests; });
    function Chat() {
      const [text, setText] = React.useState('');
      window.nativeInputValue = text;
      return React.createElement('div', {className: 'nitro-chat-input-container'},
        React.createElement('input', {className: 'chat-input', type: 'text', role: 'textbox', placeholder: 'Clique aqui para conversar', value: text,
          onChange: event => setText(event.target.value)}),
        React.createElement('button', {id: 'chat-style'}, 'Balão'));
    }
    ReactDOM.createRoot(document.getElementById('toolbar-chat-input-container')).render(React.createElement(Chat));
    document.body.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.matches('.chat-input')) window.nativeChats.push(window.nativeInputValue);
    });
  });
  await frame.waitForSelector('.chat-input');
  await frame.addStyleTag({content: source('command-suggestions.css')});
  await frame.addScriptTag({content: source('command-suggestions.js')});
  await frame.addScriptTag({content: source('pixel-shortcut.js')});
}
(async () => {
  const browser = await chromium.launch({headless: true, executablePath: process.env.PIXELSQUAD_TEST_CHROME || '/usr/bin/google-chrome'});
  try {
    const page = await browser.newPage({viewport: {width: 1000, height: 700}}), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // A controlled React 18 input follows the same onChange boundary as native Nitro.
    await page.route('**/*', route => route.fulfill({contentType: 'text/html', body: '<html><head><style>body{margin:0;background:#932856}.nitro-toolbar{position:fixed;bottom:8px;left:20%;width:60%}.chat-input{box-sizing:border-box;width:90%;padding:10px;border:1px solid #333;border-radius:6px}#chat-style{width:10%}iframe{width:980px;height:660px;border:0}</style></head><body><div class="nitro-toolbar"><div id="toolbar-chat-input-container"></div></div><input id="search" placeholder="Pesquisar"></body></html>'}));
    await page.goto('https://www.habblet.city/commands-fixture'); await prepare(page);
    const input = page.locator('.chat-input'), popup = page.locator('#pixelsquad-command-suggestions');
    const names = () => popup.locator('.ps-command-name').allTextContents();
    await input.fill(':'); await popup.waitFor();
    const expected = 'empty emptypets emptybots emptyrel sit lay pet home deletegroup friends trade moonwalk enable handitem cara follow diagonal mutepets mutebots pickrare ct wiredtool pickall pickwired ejectall kickpets kickbots setspeed blockroom up spin state wired autofloor tile pyramid eject playtest abracar push pull kis soco quickpoll ativar desativar setmax tele aus afk random habbletname pixel'.split(' ').sort();
    assert.deepEqual((await names()).map(name => name.split(' ')[0].slice(1)).sort(), expected);
    assert.equal(await popup.locator('.ps-command-vip').count(), 11);
    const geometry = await popup.boundingBox(), chat = await input.boundingBox();
    assert(geometry.y + geometry.height <= chat.y && geometry.x >= 0 && geometry.x + geometry.width <= 1000);
    assert.equal(await input.getAttribute('role'), 'combobox');
    const previews = '/tmp/pixelsquad-controls'; fs.mkdirSync(previews, {recursive: true});
    await page.screenshot({path: path.join(previews, 'commands-all.png')});
    await input.fill(':kick'); assert.deepEqual(await names(), [':kickbots', ':kickpets']);
    await page.screenshot({path: path.join(previews, 'commands-kick.png')});
    await input.press('Tab'); assert.equal(await input.inputValue(), ':kickbots');
    assert.equal(await page.evaluate(() => window.nativeInputValue), ':kickbots');
    assert.equal(await page.evaluate(() => document.activeElement.className), 'chat-input');
    await input.press('Tab'); assert.equal(await input.inputValue(), ':kickpets');
    await input.press('Shift+Tab'); assert.equal(await input.inputValue(), ':kickbots');
    assert.deepEqual(await page.evaluate(() => window.nativeChats), []);
    await input.press('Escape'); assert.equal(await popup.count(), 0);
    assert.equal(await input.getAttribute('role'), 'textbox');
    assert.equal(await input.getAttribute('aria-controls'), null);
    await input.fill(':KiCk'); await input.press('ArrowDown'); await input.press('Tab');
    assert.equal(await input.inputValue(), ':kickpets');
    await input.fill(':enable'); await input.press('Tab'); assert.equal(await input.inputValue(), ':enable ');
    assert.equal(await popup.count(), 0);
    await input.pressSequentially('20'); assert.equal(await input.inputValue(), ':enable 20'); assert.equal(await popup.count(), 0);
    await input.fill(':kick'); await popup.locator('.ps-command-row').nth(1).click();
    assert.equal(await input.inputValue(), ':kickpets'); assert.equal(await page.evaluate(() => window.nativeInputValue), ':kickpets');
    assert.equal(await popup.count(), 0); assert.deepEqual(await page.evaluate(() => window.nativeChats), []);
    await input.fill('Olá'); await input.press('Enter');
    assert.deepEqual(await page.evaluate(() => window.nativeChats), ['Olá']);
    await input.fill(':pixel'); await input.press('Enter'); await page.waitForFunction(() => window.panelRequests === 1);
    assert.deepEqual(await page.evaluate(() => window.nativeChats), ['Olá']);
    await page.locator('#search').fill(':kick'); assert.equal(await popup.count(), 0);
    await input.fill(':kick'); await input.press('Home'); assert.equal(await popup.count(), 0);
    await input.press('End'); await popup.waitFor();
    await input.dispatchEvent('compositionstart'); assert.equal(await popup.count(), 0);
    await input.dispatchEvent('keydown', {key: 'Tab', isComposing: true}); assert.equal(await input.inputValue(), ':kick');
    await input.dispatchEvent('compositionend'); await popup.waitFor();
    await page.setViewportSize({width: 360, height: 600});
    await page.waitForFunction(() => {
      const rect = document.querySelector('#pixelsquad-command-suggestions')?.getBoundingClientRect();
      return rect && rect.left >= 0 && rect.right <= innerWidth;
    });
    const narrow = await popup.boundingBox(); assert(narrow.x >= 0 && narrow.x + narrow.width <= 360);
    await input.press('Escape');
    const frameReady = page.waitForEvent('framenavigated', {predicate: frame => frame.url().includes('/game-fixture')});
    await page.evaluate(() => { const frame = document.createElement('iframe'); frame.src = 'https://game.habblet.city/game-fixture'; document.body.append(frame); });
    await page.setViewportSize({width: 1000, height: 700});
    const game = await frameReady; await prepare(game);
    await game.locator('.chat-input').fill(':kick'); await game.locator('.chat-input').press('Tab');
    assert.equal(await game.locator('.chat-input').inputValue(), ':kickbots');
    assert.equal(await game.evaluate(() => window.nativeInputValue), ':kickbots');
    await game.locator('.chat-input').press('Tab'); assert.equal(await game.locator('.chat-input').inputValue(), ':kickpets');
    await game.evaluate(() => document.querySelector('#toolbar-chat-input-container').remove());
    await game.waitForFunction(() => !document.querySelector('#pixelsquad-command-suggestions'));
    assert.deepEqual(errors, []);
    console.log('PASS: all 53 commands, React-controlled chat, prefix/Tab cycling, Shift+Tab, arrows, parameters, mouse, IME, native sending, :pixel, resize, iframe and removal cleanup');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
