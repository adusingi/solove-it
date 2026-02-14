# Supabase Org / Project 設定手順

このリポジトリの現行バックエンドは `backend/` の SQLite 実装です。  
Supabase は「実機デモ用の将来接続先」または「本番向けDB」に切り替える場合に使います。

## 1. Org 作成後に最初にやること

1. Supabase Dashboard で対象 Org を開く
2. `New project` からプロジェクトを作成
3. リージョンはユーザーに近い場所（例: `Northeast Asia (Tokyo)`）を選択
4. DB パスワードを安全に保存（再表示できない）

## 2. APIキーとURLの取得

1. `Project Settings` -> `API` を開く
2. 次を控える
- `Project URL`
- `anon` key（クライアント公開用）
- `service_role` key（サーバー専用。絶対にクライアントへ渡さない）

## 3. MVPテーブル作成（Postgres）

`SQL Editor` で以下を実行します。

```sql
create table if not exists users (
  id text primary key,
  email text unique,
  device_id text unique,
  push_token text,
  nudge_level smallint not null default 1 check (nudge_level between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or device_id is not null)
);

create table if not exists pairs (
  id text primary key,
  user1_id text not null references users(id),
  user2_id text references users(id),
  invite_code text not null unique,
  status text not null default 'awaiting' check (status in ('awaiting', 'active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wishes (
  id text primary key,
  pair_id text not null references pairs(id) on delete cascade,
  created_by text not null references users(id),
  title text not null,
  category text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  timing text,
  budget_range text,
  budget_min integer,
  budget_max integer,
  memo text,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists pair_nudge_state (
  pair_id text primary key references pairs(id) on delete cascade,
  last_nudged_at timestamptz,
  last_wish_id text references wishes(id),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pairs_user1 on pairs(user1_id);
create index if not exists idx_pairs_user2 on pairs(user2_id);
create index if not exists idx_wishes_pair_status_priority on wishes(pair_id, status, priority);
create index if not exists idx_wishes_created_at on wishes(created_at);
```

## 4. 環境変数設定（推奨）

### モバイル（Expo）

`.env` か `app.json` の `extra` で次を設定:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### バックエンド（サーバー）

サーバー側だけで使う値:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` は秘密情報なので、クライアントアプリに入れないでください。

## 5. セキュリティ初期設定

1. `Authentication` -> `URL Configuration` で許可ドメインを設定
2. 本番前は RLS（Row Level Security）を有効化
3. 最初は簡易ポリシーで開始し、デモ後に厳密化

## 6. このリポジトリとの関係

- 現在の `backend/src/server.js` は SQLite 前提で動作します
- Supabase へ切替える場合は `db.js` と各SQL実行箇所を Supabase/Postgres 用に置換します
- 先に API 仕様を固定し、DB 実装だけ差し替える方が安全です
