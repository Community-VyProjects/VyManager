# UI translations

VyManager uses [next-intl](https://next-intl.dev/) without locale routing. The
locale comes from the language switcher (`NEXT_LOCALE` cookie), then the
browser's `Accept-Language`, then English. See `src/i18n/`.

## Layout

```
messages/
  en/              # source of truth
    index.ts       # registers every namespace (keep alphabetical)
    common.json    # strings shared across features (Cancel, Save, ...)
    sites.json     # one file per feature area
  zh-CN/
    common.json    # same file names; a missing file or key falls back to English
```

## Adding strings for a feature

1. Create `messages/en/<feature>.json` and register it in `messages/en/index.ts`.
   Namespace names follow `src/components/<feature>/` (camelCase for multi-word names).
2. In components:
   ```tsx
   const t = useTranslations("sites");        // client components
   const t = await getTranslations("sites");  // server components
   t("deleteTitle", { name: site.name })      // placeholders use {name}
   ```
   Use `useTranslations("common")` for shared words instead of duplicating them.
3. Add `messages/zh-CN/<feature>.json` with the same keys (optional; missing keys show English).

Keys are type-checked against the English files, so a typo is a TypeScript error.

## What not to translate

- VyOS configuration keywords and CLI paths (`set interfaces ethernet eth0 ...`,
  `default-action`, `masquerade`) and values that come from the router.
- Protocol names and acronyms: BGP, OSPF, NAT, VRF, QoS, PKI, VPN, DHCP, DNS,
  VLAN, API, SSH, WireGuard, OpenVPN, IPsec, ...
- Error messages returned by the backend (shown as-is for now).

## zh-CN glossary

Use 你 (not 您). Keep acronyms in English with a space around them in Chinese
text, e.g. `添加 VLAN`.

| English | 简体中文 |
|---|---|
| Dashboard | 仪表盘 |
| Site / Site Manager | 站点 / 站点管理 |
| Instance | 实例 |
| Interface | 接口 |
| Firewall | 防火墙 |
| Rule | 规则 |
| Policy / Policies | 策略 |
| Routing / Route | 路由 |
| Service | 服务 |
| Load Balancing | 负载均衡 |
| High Availability | 高可用 |
| Monitoring | 监控 |
| Certificate | 证书 |
| Connect / Disconnect | 连接 / 断开连接 |
| Enabled / Disabled | 已启用 / 已禁用 |
| Commit / Save configuration | 提交 / 保存配置 |
| Peer | 对等体 |
| Throughput | 吞吐量 |
| Uptime | 运行时间 |
