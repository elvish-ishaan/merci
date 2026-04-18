import { readFileSync } from 'fs'
import { join } from 'path'

export function assertViteProject(projectDir: string): void {
  const pkgJsonPath = join(projectDir, 'package.json')
  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
  try {
    pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as typeof pkg
  } catch {
    throw new Error('Could not read package.json — is this a valid Node.js project?')
  }
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
  if (!('vite' in allDeps)) {
    throw new Error('Only Vite projects are supported. vite not found in package.json dependencies.')
  }
}
