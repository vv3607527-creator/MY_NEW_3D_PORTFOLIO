import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const required = [
  'index.html',
  'src/main.js',
  'src/content.js',
  'src/style.css',
  'package-lock.json',
  'public/assets/img/hero-human-sm.webp',
  'public/assets/img/hero-machine-sm.webp',
  'public/assets/video/agents-loop.mp4',
]

const missing = required.filter((file) => !existsSync(join(root, file)))
if (missing.length) {
  console.error(`Missing required project files:\n- ${missing.join('\n- ')}`)
  process.exitCode = 1
} else {
  const html = readFileSync(join(root, 'index.html'), 'utf8')
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  if (!html.includes('<main id="main">') || !html.includes('id="hero"')) {
    console.error('index.html is missing the expected accessible main/hero structure')
    process.exitCode = 1
  } else if (!packageJson.scripts?.build) {
    console.error('package.json is missing the production build script')
    process.exitCode = 1
  } else {
    console.log(`Smoke checks passed (${required.length} required files and core markup verified).`)
  }
}