# Zhang Space Admin

独立的 Zhang Space Owner 管理后台，共用主站 Supabase 项目。

## 启动

1. 复制 `.env.example` 为 `.env`，填入与主站相同的 Supabase URL 和 publishable key。
2. 在主项目执行 `supabase/migrations/202609120001_admin_console.sql`。
3. 运行 `npm install && npm run dev`，访问 `http://127.0.0.1:5174`。

后台只接受 `app_metadata.role=owner`。量化运维页面只读，不会触发同步或交易。
