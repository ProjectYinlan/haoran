import { dirname, join } from "path";
import { fileURLToPath } from "url";

export const baseDir = join(dirname(fileURLToPath(import.meta.url)), '../..')
export const srcBaseDir = join(baseDir, 'src')
export const modulesPath = join(srcBaseDir, 'modules')
export const externalModulesPath = join(srcBaseDir, 'external-modules')

export const assetsDir = join(baseDir, 'assets')
export const fontsPath = join(assetsDir, 'fonts')
