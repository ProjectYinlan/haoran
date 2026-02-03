# 生产环境启动

## 依赖说明

- 需准备 Playwright Chromium 浏览器目录并挂载到容器内 `/ms-playwright`。
- 配置文件目录挂载到容器内 `/etc/bot`，配置文件名为 `config.yaml`。

## 运行命令（Docker）

```bash
docker run -d --name haoran-bot \
  -v /path/to/config:/etc/bot \
  -v /path/to/ms-playwright:/ms-playwright \
  -e CONFIG_FILE_PATH=/etc/bot/config.yaml \
  haoran-bot:latest
```

说明：
- `/path/to/config` 替换为你的配置目录，目录中需包含 `config.yaml`。
- `/path/to/ms-playwright` 替换为宿主机已安装的 Playwright 浏览器目录。

## 宿主机准备 Playwright 浏览器目录

在宿主机执行（与项目无关，任意目录均可）：

```bash
npx playwright install chromium
```

执行完成后，Playwright 会在用户目录下创建浏览器缓存目录。常见位置：
- Linux: `~/.cache/ms-playwright`
- macOS: `~/Library/Caches/ms-playwright`
- Windows: `%USERPROFILE%\AppData\Local\ms-playwright`

将上述目录挂载到容器内 `/ms-playwright` 即可。
