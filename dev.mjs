import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))
const entries = [
  path.join(root, 'node_modules', 'nodemon', 'bin', 'nodemon.js'),
  path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
]
const children = entries.map(entry => spawn(process.execPath, [entry], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
}))

let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill()
  process.exitCode = code
}

for (const child of children) {
  child.on('error', error => {
    console.error('Local development process failed:', error)
    stop(1)
  })
  child.on('exit', code => {
    if (!stopping) stop(code || 1)
  })
}
process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
