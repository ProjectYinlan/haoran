# 模板渲染与预览

本文档说明模板渲染流程、预览方式、以及模板组件的约定。

## 渲染流程

模板渲染由 `src/core/playwright.ts` 提供：

1. 业务模块直接传入 React 组件：`renderTemplate(Component(props))`。
2. 组件在服务端渲染为 HTML 字符串。
3. Playwright 加载 HTML 并截图返回 PNG。

渲染过程不依赖 URL 路由，数据直接通过 props 传入组件。

## 预览与调试

模板预览使用 Vite + Tailwind + Monaco：

- 启动预览：`pnpm templates:dev`
- 编译 CSS：`pnpm templates:build`
- 预览页入口：`src/template-preview/App.tsx`

预览页会自动扫描以下目录下的模板：

- `src/modules/**/templates/*.tsx`
- `src/external-modules/**/templates/*.tsx`

## 模板组件约定

模板组件建议提供 `preview` 导出，便于预览页注册与默认数据展示：

```ts
export const preview = {
  title: 'UserProfile',
  component: UserProfile,
  defaultData: {
    qq: 10000,
    nickname: 'QQ',
    permissionTag: 'OWNER',
    permissionTagColor: 'danger',
  },
}
```

组件本身接收 props 作为渲染数据。

## 环境变量与渲染行为

- `TEMPLATE_DEV_SERVER_URL`：dev 模式下用于加载 Vite 的 CSS（例如 `http://localhost:39993`）。
- `TEMPLATE_HEADLESS`：是否无头（默认 true）。
- `TEMPLATE_KEEP_OPEN`：dev 模式保留浏览器窗口（true 时不自动关闭）。
- `TEMPLATE_SCALE`：截图缩放倍数（默认 4）。
