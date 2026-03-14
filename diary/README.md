# CasualDiary (React + Supabase)

一个支持账号注册登录、个人日记 CRUD、公开广场（点赞/评论/搜索/排序/作者页/互动记录）的项目。

## 技术栈

- React 19 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres + RLS)

## 功能概览

- 账号：邮箱密码注册/登录/退出
- 我的日记：新建、编辑、删除、分页、公开/私有切换
- 广场：公开日记列表（按时间/点赞排序 + 搜索）
- 日记详情：点赞、评论、评论删除（本人）、评论分页
- 作者主页：查看作者公开日记
- 我的互动：我的点赞记录、我的评论记录（分页）

## 环境变量

在项目根目录创建 `.env.local`：

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## 本地启动

```bash
npm install
npm run dev
```

## Supabase Migration 管理（推荐）

本项目已改成 migration 链管理，文件在：

- `supabase/migrations/20260303130900_init_profiles.sql`
- `supabase/migrations/20260304163400_diaries.sql`
- `supabase/migrations/20260305154100_square_public_features.sql`
- `supabase/migrations/20260305170000_profiles_profile_page.sql`

### 1) 安装 Supabase CLI

先安装 Supabase CLI（本机未安装时 `npx supabase ...` 会自动拉取，但建议全局安装）：

- 官方文档：[Supabase CLI](https://supabase.com/docs/guides/cli)

### 2) 连接你的 Supabase 项目

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

然后把 `supabase/config.toml` 里的 `project_id` 改成你的 project ref。

### 3) 推送迁移到远程数据库

```bash
npm run db:push
```

### 4) 常用命令

```bash
npm run db:start    # 启动本地 Supabase
npm run db:status   # 查看本地状态
npm run db:reset    # 重置本地 DB 并重放 migrations
npm run db:pull     # 从远程拉取 schema（谨慎使用）
npm run db:stop     # 停止本地 Supabase
```

## 生产环境初始化顺序

对于一个全新 Supabase 项目，推荐按下面顺序：

1. 创建项目并拿到 URL / anon key
2. 执行 `npx supabase link --project-ref <your-project-ref>`
3. 执行 `npm run db:push`
4. 在 Supabase Auth 中确认 Email Provider 配置符合预期
5. 启动前端并做一轮注册、发帖、点赞、评论的冒烟测试

## 兼容脚本说明

`supabase/init.sql`、`supabase/diaries.sql`、`supabase/square.sql` 仍保留，作为历史快照和手工排障用。

日常开发与协作请以 `supabase/migrations/*.sql` 为准，不要再直接改快照脚本。

## 面试展示建议

- 展示 RLS 策略如何保护“只能改自己的数据”
- 展示 migration 链如何让数据库变更可追踪、可复现
- 演示“从空库到可用系统”的一键初始化流程
