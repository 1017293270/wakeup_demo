import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const target = resolve('public/live2dcubismcore.min.js')

// The Cubism 5 Core required by the robot model (MOC3 v5) is committed
// directly in public/. The npm live2dcubismcore package only provides
// Cubism 4.2.2 which cannot load MOC3 v5 models. Skip overwriting if
// the committed Core is already present.
if (existsSync(target)) {
  console.log('[live2d] Cubism Core already exists in public/, skipping copy.')
  process.exit(0)
}

const candidates = [
  resolve('node_modules/live2dcubismcore/live2dcubismcore.min.js'),
  resolve('node_modules/live2dcubismcore/index.min.js')
]
const source = candidates.find((path) => existsSync(path))

if (!source) {
  console.warn('[live2d] live2dcubismcore package not found; place live2dcubismcore.min.js in public/ manually.')
  process.exit(0)
}

mkdirSync(dirname(target), { recursive: true })
copyFileSync(source, target)
console.log(`[live2d] copied ${source} -> ${target}`)
