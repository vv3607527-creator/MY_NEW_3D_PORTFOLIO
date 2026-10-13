import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const filesToPatch = [
  'node_modules/vite/dist/node/chunks/node.js',
  'node_modules/vite/dist/node/module-runner.js'
];

for (const rel of filesToPatch) {
  const p = join(process.cwd(), rel);
  if (!existsSync(p)) continue;
  let code = readFileSync(p, 'utf-8');
  if (code.includes('url.lastIndexOf("/")')) continue; // already patched

  const target = 'function cleanUrl(url) {\n\treturn url.replace(postfixRE, "");\n}';
  const replacement = 'function cleanUrl(url) {\n\tconst idx = Math.max(url.lastIndexOf("/"), url.lastIndexOf("\\\\"));\n\tif (idx === -1) return url.replace(postfixRE, "");\n\treturn url.slice(0, idx + 1) + url.slice(idx + 1).replace(postfixRE, "");\n}';

  if (code.includes(target)) {
    code = code.replace(target, replacement);
    writeFileSync(p, code, 'utf-8');
    console.log(`Patched ${rel}`);
  }
}
