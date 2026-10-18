import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const port = 4174;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'inherit'],
});

const stop = () => server.kill('SIGTERM');
process.on('exit', stop);

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('preview server did not start within 10 seconds')), 10_000);
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes(`127.0.0.1:${port}`)) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.once('exit', (code) => reject(new Error(`preview exited before start (${code})`)));
  });

  const root = await fetch(`http://127.0.0.1:${port}/`);
  if (!root.ok) throw new Error(`root returned HTTP ${root.status}`);
  const html = await root.text();
  if (!html.includes('<main id="main">') || !html.includes('assets/index-')) {
    throw new Error('built entrypoint is missing expected main markup or JavaScript asset');
  }

  const assetMatch = html.match(/src="(\.\/assets\/[^"']+\.js)"/);
  if (!assetMatch) throw new Error('built entrypoint did not reference a JavaScript asset');
  const asset = await fetch(new URL(assetMatch[1], `http://127.0.0.1:${port}/`));
  if (!asset.ok) throw new Error(`JavaScript asset returned HTTP ${asset.status}`);

  const source = await readFile('dist/index.html', 'utf8');
  if (source !== html) throw new Error('preview HTML differs from the checked-in build output');
  console.log('smoke test passed: root, entry JavaScript asset, and build consistency');
} finally {
  stop();
}
