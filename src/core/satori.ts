import { join } from "path";
import satori, { Font } from "satori";
import fs, { readdir } from 'fs/promises'
import { Resvg } from "@resvg/resvg-js";
import { Frame } from "./templates/Frame";
import { fontsPath } from "../utils/path";
import { createLogger } from "../logger";

const logger = createLogger('core/satori')

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

const FONTS_MAP: Record<string, { fileName: RegExp, weight?: Weight }[]> = {
  'Unifont': [
    {
      fileName: /unifont(?:.*).otf/,
    }
  ],
  'HarmonyOS Sans SC': [
    {
      fileName: /HarmonyOS_Sans_SC_Thin.ttf/,
      weight: 100,
    },
    {
      fileName: /HarmonyOS_Sans_SC_Light.ttf/,
      weight: 200,
    },
    {
      fileName: /HarmonyOS_Sans_SC_Regular.ttf/,
      weight: 400,
    },
    {
      fileName: /HarmonyOS_Sans_SC_Medium.ttf/,
      weight: 500,
    },
    {
      fileName: /HarmonyOS_Sans_SC_Bold.ttf/,
      weight: 700,
    },
    {
      fileName: /HarmonyOS_Sans_SC_Black.ttf/,
      weight: 900,
    },
  ],
  'JetBrains Mono': [
    {
      fileName: /JetBrainsMono-Thin.ttf/,
      weight: 100,
    },
    {
      fileName: /JetBrainsMono-ExtraLight.ttf/,
      weight: 200,
    },
    {
      fileName: /JetBrainsMono-Light.ttf/,
      weight: 300,
    },
    {
      fileName: /JetBrainsMono-Regular.ttf/,
      weight: 400,
    },
    {
      fileName: /JetBrainsMono-Medium.ttf/,
      weight: 500,
    },
    {
      fileName: /JetBrainsMono-SemiBold.ttf/,
      weight: 600,
    },
    {
      fileName: /JetBrainsMono-Bold.ttf/,
      weight: 700,
    },
    {
      fileName: /JetBrainsMono-ExtraBold.ttf/,
      weight: 800,
    },
  ],
}

const fontsMapConverted: { name: string, weight?: Weight, fileName: RegExp, filePath?: string }[] = Object.keys(FONTS_MAP).reduce((acc, key) => {
  acc.push(...FONTS_MAP[key].map(font => ({
    name: key,
    weight: font.weight,
    fileName: font.fileName,
  })))
  return acc
}, [] as { name: string, weight?: Weight, fileName: RegExp, filePath?: string }[])

const fontFileList = (await readdir(fontsPath)).filter(file => file.endsWith('.ttf') || file.endsWith('.otf'))

const fonts: Font[] = []

for (const fontPattern of fontsMapConverted) {
  const fontFile = fontFileList.find(file => fontPattern.fileName.test(file))
  if (!fontFile) {
    continue
  }
  logger.debug(`加载字体: ${fontPattern.name} ${fontPattern.weight ? ` (字重: ${fontPattern.weight})` : ''}`)
  const data = await fs.readFile(join(fontsPath, fontFile))
  fonts.push({
    name: fontPattern.name,
    data,
    weight: fontPattern.weight,
  })
}

logger.info(`加载 ${fonts.length} 个字体`)

type RenderTemplateOptions = {
  width?: number
  height?: number
}
let warmupPromise: Promise<void> | null = null

export const warmupSatori = async (): Promise<void> => {
  if (warmupPromise) {
    return warmupPromise
  }

  warmupPromise = (async () => {
    const svg = await satori(Frame({ children: null }), {
      fonts,
      width: 1,
      height: 1
    })
    new Resvg(svg, {
      fitTo: {
        mode: 'zoom',
        value: 1,
      },
    }).render()
  })().catch((error) => {
    warmupPromise = null
    logger.warn('Satori 预热失败', error)
  })

  return warmupPromise
}
export const renderTemplate = async (el: JSX.Element, options?: RenderTemplateOptions): Promise<Buffer> => {

  const svg = await satori(Frame({ children: el }), {
    fonts,
    width: options?.width ?? 300,
    height: options?.height ?? 100
  })
  const png = new Resvg(svg, {
    fitTo: {
      mode: 'zoom',
      value: 4,
    },
  }).render().asPng()
  return png
}