import { basename, extname, join } from 'path'
import fs, { readdir } from 'fs/promises'
import { chromium, type Browser, type Page } from 'playwright'
import { renderToStaticMarkup } from 'react-dom/server'
import { Frame } from './templates/Frame.js'
import { configManager } from '../config.js'
import { assetsDir, fontsPath } from '../utils/path.js'
import { createLogger } from '../logger.js'

const logger = createLogger('core/template-renderer')

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900

type FontAsset = {
  name: string
  weight?: Weight
  fileUrl: string
  fileName: string
  format: 'truetype' | 'opentype'
}

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

const fontsMapConverted: { name: string, weight?: Weight, fileName: RegExp }[] = Object.keys(FONTS_MAP).reduce((acc, key) => {
  acc.push(...FONTS_MAP[key].map(font => ({
    name: key,
    weight: font.weight,
    fileName: font.fileName,
  })))
  return acc
}, [] as { name: string, weight?: Weight, fileName: RegExp }[])

const tailwindCssPath = process.env.TAILWIND_CSS_PATH ?? join(assetsDir, 'tailwind.css')
const tailwindDevServerUrl = process.env.TEMPLATE_DEV_SERVER_URL
const localFontsBaseUrl = 'http://local-fonts'
let fontCssCache: string | null = null
let tailwindCssCache: string | null = null
let browserPromise: Promise<Browser> | null = null
let debugContextPromise: Promise<import('playwright').BrowserContext> | null = null
let debugPagePromise: Promise<import('playwright').Page> | null = null
const routedPages = new WeakSet<Page>()
let warmupPromise: Promise<void> | null = null

type RenderTemplateOptions = {
  width?: number
  height?: number | 'auto'
  minHeight?: number
  maxHeight?: number
  scale?: number
}

const getTailwindCss = async (): Promise<string> => {
  if (tailwindCssCache !== null) {
    return tailwindCssCache
  }
  try {
    tailwindCssCache = await fs.readFile(tailwindCssPath, 'utf-8')
  } catch (error) {
    tailwindCssCache = ''
    logger.warn({ err: toError(error) }, `Tailwind CSS 未找到: ${tailwindCssPath}`)
  }
  return tailwindCssCache
}

const getFontCss = async (): Promise<string> => {
  if (fontCssCache !== null) {
    return fontCssCache
  }
  const fontFileList = (await readdir(fontsPath)).filter(file => file.endsWith('.ttf') || file.endsWith('.otf'))
  const fontAssets: FontAsset[] = []

  for (const fontPattern of fontsMapConverted) {
    const fontFile = fontFileList.find(file => fontPattern.fileName.test(file))
    if (!fontFile) {
      continue
    }
    const fileUrl = `${localFontsBaseUrl}/${encodeURIComponent(fontFile)}`
    const ext = extname(fontFile).toLowerCase()
    const format = ext === '.otf' ? 'opentype' : 'truetype'
    fontAssets.push({
      name: fontPattern.name,
      weight: fontPattern.weight,
      fileUrl,
      fileName: fontFile,
      format,
    })
  }

  logger.info(`加载 ${fontAssets.length} 个字体`)

  fontCssCache = fontAssets.map(asset => {
    return `
@font-face {
  font-family: "${asset.name}";
  src: url("${asset.fileUrl}") format("${asset.format}");
  font-weight: ${asset.weight ?? 400};
  font-style: normal;
  font-display: swap;
}
`.trim()
  }).join('\n')

  return fontCssCache
}

const getBrowser = async (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: resolveHeadless(),
    })
  }
  return browserPromise
}

const getDebugPage = async (): Promise<import('playwright').Page> => {
  if (debugPagePromise) {
    return debugPagePromise
  }
  debugPagePromise = (async () => {
    const browser = await getBrowser()
    if (!debugContextPromise) {
      debugContextPromise = browser.newContext({
        deviceScaleFactor: resolveScale(),
      })
    }
    const context = await debugContextPromise
    return await context.newPage()
  })()
  return debugPagePromise
}

const ensureLocalFontRoute = async (page: Page): Promise<void> => {
  if (routedPages.has(page)) {
    return
  }
  routedPages.add(page)
  await page.route(`${localFontsBaseUrl}/**`, async (route) => {
    try {
      const url = new URL(route.request().url())
      const fileName = basename(decodeURIComponent(url.pathname))
      const filePath = join(fontsPath, fileName)
      const data = await fs.readFile(filePath)
      const ext = extname(fileName).toLowerCase()
      const contentType = ext === '.otf' ? 'font/otf' : 'font/ttf'
      await route.fulfill({
        status: 200,
        body: data,
        contentType,
      })
    } catch (error) {
      logger.warn({ err: toError(error) }, '字体加载失败')
      await route.fulfill({ status: 404 })
    }
  })
}

export const warmupTemplateRenderer = async (): Promise<void> => {
  if (warmupPromise) {
    return warmupPromise
  }

  warmupPromise = (async () => {
    if (!tailwindDevServerUrl) {
      await getFontCss()
      await getTailwindCss()
    }

    const browser = await getBrowser()
    const context = await browser.newContext({
      viewport: { width: 1, height: 1 },
      deviceScaleFactor: 4,
    })
    const page = await context.newPage()
    await page.setContent('<html><body></body></html>')
    await page.close()
    await context.close()
  })().catch((error) => {
    warmupPromise = null
    logger.warn({ err: toError(error) }, '模板渲染器预热失败')
  })

  return warmupPromise
}

export const renderTemplate = async (el: JSX.Element, options?: RenderTemplateOptions): Promise<Buffer> => {
  const width = options?.width ?? 300
  const heightOption = options?.height ?? 100
  const autoHeight = heightOption === 'auto'
  const minHeight = options?.minHeight ?? 1
  const maxHeight = options?.maxHeight
  const height = autoHeight ? minHeight : heightOption
  const scale = options?.scale ?? 4
  const useDevCss = Boolean(tailwindDevServerUrl)
  const [fontCss, tailwindCss] = useDevCss
    ? ['', '']
    : await Promise.all([
      getFontCss(),
      getTailwindCss(),
    ])

  const markup = renderToStaticMarkup(Frame({
    children: el,
    meta: {
      botName: (configManager.config as any)?.bot?.name,
      generatedAt: new Date(),
      devMode: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development',
    },
  }))
  const devCssLink = tailwindDevServerUrl
    ? `<link rel="stylesheet" href="${tailwindDevServerUrl.replace(/\/$/, '')}/styles.css" />
    <link rel="stylesheet" href="${tailwindDevServerUrl.replace(/\/$/, '')}/fonts.css" />`
    : ''
  const html = `
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    ${useDevCss ? devCssLink : `
    <style>
      ${fontCss}
    </style>
    <style>
      ${tailwindCss}
    </style>
    `}
    <style>
      html, body, #root {
        width: ${width}px;
        ${autoHeight ? `height: auto; min-height: ${minHeight}px;` : `height: ${height}px;`}
        margin: 0;
        padding: 0;
      }
      body {
        background: transparent;
      }
    </style>
  </head>
  <body>
    <div id="root">${markup}</div>
  </body>
</html>
`

  const useDebugPage = !resolveHeadless() && resolveKeepOpen()
  const effectiveScale = useDebugPage ? resolveScale() : scale
  const browser = await getBrowser()
  const context = useDebugPage
    ? null
    : await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: effectiveScale,
    })
  const page = useDebugPage ? await getDebugPage() : await context!.newPage()
  if (!useDevCss) {
    await ensureLocalFontRoute(page)
  }
  if (useDebugPage) {
    await page.setViewportSize({ width, height })
  }
  await page.setContent(html, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle', { timeout: 1500 }).catch(() => null)
  await page.evaluate(() => document.fonts.ready)

  let finalHeight = height
  if (autoHeight) {
    const measuredHeight = await page.evaluate(({ minHeight, maxHeight }) => {
      const root = document.getElementById('root')
      const candidates = [
        root?.getBoundingClientRect().height ?? 0,
        root?.scrollHeight ?? 0,
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
      ]
      const raw = Math.ceil(Math.max(...candidates))
      const limited = Math.max(minHeight, maxHeight ? Math.min(raw, maxHeight) : raw)
      return limited
    }, { minHeight, maxHeight })
    finalHeight = measuredHeight
    await page.setViewportSize({ width, height: finalHeight })
  }

  const png = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width, height: finalHeight },
  })

  if (!useDebugPage) {
    await page.close()
    await context!.close()
  }

  return png
}

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error
  }
  return new Error(String(error))
}

const resolveHeadless = (): boolean => {
  const value = process.env.TEMPLATE_HEADLESS
  if (!value) {
    return true
  }
  return !['0', 'false', 'no', 'off'].includes(value.toLowerCase())
}

const resolveKeepOpen = (): boolean => {
  const value = process.env.TEMPLATE_KEEP_OPEN
  if (!value) {
    return false
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

const resolveScale = (): number => {
  const value = process.env.TEMPLATE_SCALE
  if (!value) {
    return 4
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 4
}