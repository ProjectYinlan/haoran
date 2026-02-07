import { mkdir, readdir, stat, copyFile } from 'node:fs/promises'
import { join, relative, dirname } from 'node:path'

const rootDir = process.cwd()
const srcDir = join(rootDir, 'src')
const distDir = join(rootDir, 'dist')

const ensureDir = async (path) => {
  await mkdir(path, { recursive: true })
}

const isDocsDir = (name) => name.toLowerCase() === 'docs'

const copyDocsFiles = async (sourceDir) => {
  const entries = await readdir(sourceDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(sourceDir, entry.name)
    if (entry.isDirectory()) {
      if (isDocsDir(entry.name)) {
        await copyDocsDir(fullPath)
      } else {
        await copyDocsFiles(fullPath)
      }
    }
  }
}

const copyDocsDir = async (docsDir) => {
  const entries = await readdir(docsDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(docsDir, entry.name)
    if (entry.isDirectory()) {
      await copyDocsDir(fullPath)
      continue
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue
    const relPath = relative(srcDir, fullPath)
    const targetPath = join(distDir, relPath)
    await ensureDir(dirname(targetPath))
    await copyFile(fullPath, targetPath)
  }
}

const main = async () => {
  try {
    await ensureDir(distDir)
    await copyDocsFiles(srcDir)
  } catch (error) {
    console.error('copy-docs failed:', error)
    process.exitCode = 1
  }
}

await main()