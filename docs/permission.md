# 权限系统（RBAC）

项目已内置 RBAC 权限系统，角色与权限在命令执行前检查。

## 角色定义

- `owner`：机器人主人，最高权限，需在配置文件中指定。
- `group_admin`：群管理员（含群主），通过群消息 `sender.role` 自动识别。
- `bot_admin`：机器人管理员，可设置为全局或按群生效。
- `member`：默认角色（无以上角色时）。

## 权限匹配规则

- `*`：匹配所有权限。
- `xxx.*`：匹配 `xxx` 下的所有权限（包括 `xxx` 与 `xxx.yyy`）。
- `xxx.yyy`：精确匹配。

命令若未标注 `@Permission`，则不进行权限校验，默认放行。

## 配置示例

在 `config.yaml` 中新增 `rbac` 配置：

```yaml
rbac:
  owners: [123456]
  botAdmins:
    global: [234567]
    groups:
      "987654": [345678]
  rolePermissions:
    owner:
      - "*"
    bot_admin:
      - "*"
    group_admin:
      - "utils.*"
      - "question.*"
    member: []
```

说明：
- `owners`：最高权限用户列表。
- `botAdmins.global`：全局管理员列表。
- `botAdmins.groups`：按群配置管理员（键为群号字符串）。
- `rolePermissions`：角色权限规则（可覆盖默认值）。

## 默认权限

若未配置 `rolePermissions`，默认规则如下：
- `owner`、`bot_admin`：`*`
- `group_admin`：`utils.*`、`question.*`
- `member`：无权限
