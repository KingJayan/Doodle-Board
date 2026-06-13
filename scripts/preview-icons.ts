/*
usage:
bun run preview-icons -- previews icons in new-icons
bun run preview-icons:all -- previews all icons


*/

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import WebSocket from 'ws';

const SHOW_ALL = process.argv.includes('--all');

const ICON_DIR = new URL('../src/assets/icons/', import.meta.url);

const NEW_ICONS = [
  'heart', 'bell', 'clock', 'calendar', 'bookmark', 'lightbulb', 'lock', 'key', 'mail',
  'link', 'bolt', 'cloud', 'sun', 'moon', 'music', 'camera', 'brush', 'flag', 'rocket',
  'gift', 'trophy', 'map-pin', 'eye', 'compass',
  'home', 'user', 'download', 'share', 'plus', 'refresh',
];

const ICONS = SHOW_ALL
  ? readdirSync(ICON_DIR)
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.slice(0, -4))
      .sort()
  : NEW_ICONS;

const THEMES = [
  { name: 'Paper', bg: '#fdfbf7', ink: '#2d2d2d' },
  { name: 'Sepia', bg: '#ece0c8', ink: '#433422' },
  { name: 'Sakura', bg: '#ffeef3', ink: '#6a2f44' },
  { name: 'Forest', bg: '#e7efe0', ink: '#2f3d2a' },

  { name: 'Chalkboard', bg: '#16181a', ink: '#eef3ee' },
  { name: 'Midnight', bg: '#0e1020', ink: '#eef0ff' },
  { name: 'Terminal', bg: '#0b130e', ink: '#9ff7c0' },
  { name: 'Blueprint', bg: '#10336b', ink: '#eaf2ff' },
];

const htmlPaths = THEMES.map((theme) => {
  const cells = ICONS.map((name) => {
    const svg = readFileSync(new URL(`${name}.svg`, ICON_DIR), 'utf8');

    return `
      <div class="cell">
        <div class="ic" style="color:${theme.ink}">${svg}</div>
        <div class="lbl" style="color:${theme.ink};opacity:.6">${name}</div>
      </div>
    `;
  }).join('');

  const html = `
<!doctype html>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; }

  body {
    font-family: system-ui, sans-serif;
    background: ${theme.bg};
    padding: 20px 24px;
  }

  h2 {
    font-size: 13px;
    letter-spacing: .1em;
    text-transform: uppercase;
    margin-bottom: 12px;
    opacity: .7;
    color: ${theme.ink};
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 18px;
  }

  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }

  .ic {
    width: 80px;
    height: 80px;
    color: ${theme.ink};
  }

  .ic svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .lbl {
    font-size: 9px;
    text-align: center;
    color: ${theme.ink};
    opacity: .6;
  }
</style>

<h2>${theme.name} (${ICONS.length} icons)</h2>
<div class="grid">${cells}</div>
`;

  const path = new URL(
    `./icon-preview-${theme.name.toLowerCase()}.html`,
    import.meta.url,
  );

  writeFileSync(path, html);

  return { theme, path };
});


const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9222;

const proc = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=2',
    '--window-size=1100,1300',
    `about:blank`,
  ],
  { stdio: 'ignore' },
);

async function cdp() {
  let target;

  for (let i = 0; i < 40; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json`).then((r) => r.json());

      target = list.find(
        (t: any) => t.type === 'page' && t.webSocketDebuggerUrl,
      );

      if (target) break;
    } catch {}

    await sleep(250);
  }

  if (!target) {
    throw new Error('no CDP page target');
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl, {
    perMessageDeflate: false,
  });

  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

  let id = 0;
  const pending = new Map<number, (msg: any) => void>();

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)?.(msg);
      pending.delete(msg.id);
    }
  });

  const send = (method: string, params = {}) =>
    new Promise<any>((resolve) => {
      const mid = ++id;

      pending.set(mid, resolve);

      ws.send(
        JSON.stringify({
          id: mid,
          method,
          params,
        }),
      );
    });

  await send('Page.enable');
  for (const { theme, path } of htmlPaths) {
    await send('Page.navigate', {
      url: `file://${path.pathname}`,
    });

    await sleep(500);

    const { result } = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    });

    writeFileSync(
      new URL(
        `./icon-preview-${theme.name.toLowerCase()}.png`,
        import.meta.url,
      ),
      Buffer.from(result.data, 'base64'),
    );

    console.log(`generated ${theme.name}`);
  }
  ws.close();
}

try {
  await cdp();

  console.log(
    `generated ${THEMES.length} theme previews (${SHOW_ALL ? 'all icons' : 'new icons'})`,
  );
} finally {
  proc.kill('SIGTERM');
}