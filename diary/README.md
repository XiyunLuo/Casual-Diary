# CasualDiary

一个以 `React + Supabase` 为核心实现的个人日记社区项目，覆盖了从账号体系、个人日记管理，到公开广场、互动通知、个人资料、头像上传、AI 日记总结的完整闭环。

这个项目的目标不是只做一个前端页面，而是尽量按真实全栈项目的方式推进：

- 前端使用 `React 19 + TypeScript + Vite`
- UI 使用 `Tailwind CSS + shadcn/ui`
- 后端能力基于 `Supabase Auth + Postgres + Storage + Edge Functions`
- 数据库变更通过 `Supabase migrations` 管理
- 权限控制依赖 `RLS`

![CasualDiary logo](./public/logo.png)

## 在线能力概览

- 邮箱密码注册、登录
- 我的日记：新建、编辑、删除、分页、权限筛选
- 日记权限：公开 / 私密
- 公开广场：按时间排序、按点赞数排序、搜索作者/标题
- 日记详情：点赞、评论、评论删除、评论分页
- 作者主页：展示作者资料和公开日记
- 我的互动：点赞记录、评论记录
- 消息中心：通知列表、一键已读、跳转到对应日记/评论
- 个人资料：昵称、个人简介、头像上传
- 设置页：统一管理退出登录
- AI 日记总结：按时间范围和关注主题生成中文总结

## 技术栈

- `React 19`
- `TypeScript`
- `Vite`
- `React Router 7`
- `@tanstack/react-query`
- `Tailwind CSS`
- `shadcn/ui`
- `Supabase`
- `Lucide React`

## 项目亮点

- 使用 `Supabase Auth` 完成注册登录流程
- 使用 `profiles`、`diaries`、`diary_comments`、`diary_likes` 等表构建完整业务模型
- 使用 `RLS` 限制“只能操作自己的数据”
- 使用 `Supabase Storage` 上传头像
- 使用 `Supabase Edge Function` 对接 `Gemini` 生成 AI 日记总结
- 使用 `migrations` 管理数据库演进，而不是手动堆 SQL
- 前端拆分为 `types / services / hooks / pages / components`，结构清晰
- 包含基础测试脚本与若干渲染/工具测试

## 页面与功能

### 1. 账号系统

- 注册时支持前端校验
- 密码要求至少 8 位，且同时包含字母和数字
- 用户首次注册后，数据库侧自动建立资料数据

### 2. 我的日记

- 新建日记
- 编辑日记
- 删除日记
- 分页浏览
- 按权限筛选：所有 / 公开 / 私有

### 3. 公开广场

- 查看所有公开日记
- 搜索作者昵称或日记标题
- 按最新时间排序
- 按点赞数排序
- 查看日记详情

### 4. 社区互动

- 点赞 / 取消点赞
- 评论
- 删除自己的评论
- 查看我的点赞记录
- 查看我的评论记录
- 查看消息通知并一键已读

### 5. 用户资料

- 修改昵称
- 修改个人简介
- 上传头像
- 展示个人公开主页

### 6. AI 总结

- 按时间范围选择日记
- 自定义关注主题
- 调用 Edge Function + Gemini 生成中文总结

## 目录结构

```text
diary/
├─ public/
│  └─ logo.png
├─ scripts/
│  └─ run-tests.mjs
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ hooks/
│  ├─ lib/
│  ├─ pages/
│  ├─ services/
│  ├─ store/
│  └─ types/
├─ supabase/
│  ├─ config.toml
│  ├─ functions/
│  │  └─ ai-diary-summary/
│  └─ migrations/
└─ tests/
```

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local`：

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. 启动前端

```bash
npm run dev
```

### 4. 生产构建

```bash
npm run build
```

## Supabase 初始化

这个项目已经切到 `migration-first` 的方式，数据库初始化应以 `supabase/migrations/*.sql` 为准。

### 1. 登录并关联项目

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

### 2. 推送数据库迁移

```bash
npm run db:push
```

### 3. 本地数据库常用命令

```bash
npm run db:start
npm run db:status
npm run db:reset
npm run db:pull
npm run db:stop
```

## Storage 配置

项目头像上传依赖一个公开 bucket：

- bucket 名称必须是 `avatars`
- 建议设置为 `public`

如果启用了 `storage.objects` 的 RLS，需要允许：

- 公共读取 `avatars`
- 已登录用户写入自己目录下的头像文件

目录约定为：

```text
avatars/<user_id>/<timestamp>.<ext>
```

## Edge Function 配置

项目包含一个 Edge Function：

- `supabase/functions/ai-diary-summary`

它用于读取用户指定时间范围内的日记，并调用 `Gemini` 生成结构化中文总结。

部署前需要配置服务端环境变量：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

本地或远程部署示例：

```bash
npx supabase functions deploy ai-diary-summary
```

## 数据库迁移文件

当前仓库中已包含以下迁移链：

- `20260303130900_init_profiles.sql`
- `20260304163400_diaries.sql`
- `20260305154100_square_public_features.sql`
- `20260305170000_profiles_profile_page.sql`
- `20260313103000_diary_images.sql`
- `20260313160000_fix_diary_updated_at_trigger.sql`
- `20260313173000_message_notifications.sql`
- `20260313191000_notification_reads.sql`
- `20260313194000_fix_notification_keys.sql`

这些迁移覆盖了：

- 用户资料
- 日记表
- 公开广场能力
- 资料页字段
- 图片相关结构
- `updated_at` 触发器修复
- 消息通知与已读状态

## 测试

项目内置了一个轻量测试运行脚本：

```bash
npm run test
```

当前仓库已包含若干测试，覆盖：

- 登录页渲染
- 设置页渲染
- `AppShell` 渲染
- 日记编辑表单渲染
- AI 总结弹窗渲染
- 鉴权表单与请求工具函数
- 文本校验逻辑
- AI 总结参数处理

## 适合放在 GitHub / 面试展示的点

- 不是单纯静态页面，而是带真实权限控制的完整业务流
- 前后端边界清楚，前端、数据库、Storage、Edge Function 各自职责明确
- 数据库通过 migration 管理，能体现工程化意识
- 包含 RLS、上传、通知、AI 总结，展示面较完整
- 从“个人工具”自然扩展到“公开社区”，项目故事线清晰

## 后续可继续优化的方向

- 增加单元测试和集成测试覆盖率
- 引入图片压缩与裁剪
- 完善消息系统的实时更新
- 增加举报、屏蔽、内容审核等社区治理能力
- 对广场和评论进一步做缓存与性能优化

## License

This project is for learning, portfolio, and interview demonstration.
