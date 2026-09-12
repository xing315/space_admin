# Zhang Space Admin

## Netlify 部署

构建命令和 SPA 路由重写已在 `netlify.toml` 中配置。Netlify 站点还需要配置以下生产环境变量（值与 `my-vue-app/.env` 保持一致）：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SITE_URL`（前台站点地址，可选）

环境变量修改后需要重新触发部署，因为 Vite 会在构建阶段将 `VITE_` 变量写入前端产物。

独立的 Zhang Space Owner 管理后台，共用主站 Supabase 项目。

## 启动

1. 复制 `.env.example` 为 `.env`，填入与主站相同的 Supabase URL 和 publishable key。
2. 在主项目执行 `supabase/migrations/202609120001_admin_console.sql`。
3. 运行 `npm install && npm run dev`，访问 `http://127.0.0.1:5174`。

后台只接受 `app_metadata.role=owner`。量化运维页面只读，不会触发同步或交易。
