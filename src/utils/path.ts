import { dirname, join, sep } from "path";
import { fileURLToPath } from "url";

const runtimePath = fileURLToPath(import.meta.url)
export const baseDir = join(dirname(runtimePath), '../..')
const isDistRuntime = runtimePath.includes(`${sep}dist${sep}`)
export const srcBaseDir = join(baseDir, 'src')
export const modulesPath = isDistRuntime
  ? join(baseDir, 'dist', 'modules')
  : join(srcBaseDir, 'modules')
export const externalModulesPath = isDistRuntime
  ? join(baseDir, 'dist', 'external-modules')
  : join(srcBaseDir, 'external-modules')

export const assetsDir = join(baseDir, 'assets')
export const fontsPath = join(assetsDir, 'fonts')
