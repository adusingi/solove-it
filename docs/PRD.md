# PRD: 大切な人とやりたいことリスト

> **キャッチコピー：「忘れる二人を、お節介に繋ぎ止める。」**

---

## 1. 製品概要

### 1.1 プロダクト名
**大切な人とやりたいことリスト**

### 1.2 プロダクトの説明
大切な人（恋人・夫婦・家族）と「いつかやりたいこと」を共有し、通知で背中を押して実行につなげるモバイルアプリ。

### 1.3 提供価値
- 二人で話した「やりたいこと」を忘れにくくする
- 予定決めの会話コストを下げる
- 「通知が来たから今やろう」を作る

---

## 2. ハッカソンMVP定義（2026-02-14版）

### 2.1 Must Have（今回実装対象）
- ユーザー作成（email または device_id）
- 招待コードで2人をペアリング
- Wish の作成 / 編集 / 削除
- Wish の完了管理
- Wish 一覧取得 + フィルタ
- 通知トリガー（手動またはスケジュール）

### 2.2 Out of Scope（今回やらない）
- 厳密な同時実行制御
- 大規模スケール最適化
- イベント推薦エンジン
- AI提案機能

### 2.3 MVP成功条件
- ペアリングから通知トリガーまでが1本で通る
- 2台（または2ユーザー）へ同時通知のデモが成立する

---

## 3. ユーザーと主要ユースケース

### 3.1 メインペルソナ
- 恋人・夫婦: デートや旅行の「いつか」を可視化
- 親子: 後回しになりがちな願いを実行に近づける

### 3.2 主要ユースケース
1. Aさんがユーザー登録して招待コード発行
2. Bさんが招待コードで参加し、ペアが有効化
3. AさんがWish（例: 焼肉に行く）を高優先度で登録
4. 一定条件で通知が2人に届く
5. 実行後にWishを完了へ更新

---

## 4. 機能要件

### 4.1 ペアリング
- 招待コードを生成し、相手が入力して参加
- ステータスは `awaiting` / `active` / `closed`

### 4.2 Wish管理
- 項目: title, category, priority, timing, budget_range, memo
- ステータス: `pending` / `completed`
- 完了時に `completed_at` を保持

### 4.3 フィルタリング
- フィルタ: status, category, priority, timing, createdBy, budget帯, キーワード
- ソート: createdAt, updatedAt, priority, timing, budgetMin, budgetMax, status

### 4.4 通知（Nudge）
- 条件: `pending` かつ `priority=high` かつ作成からX日以上
- 対象Wishからランダムに1件選択
- 2人へ同時通知（Expo Pushまたはシミュレーション）

---

## 5. 技術仕様（MVP）

### 5.1 構成
- フロント: Expo / React Native / TypeScript
- バックエンド: Node.js + Fastify
- DB: SQLite（`better-sqlite3`）
- 通知: Expo Push API（未設定時はシミュレーション）

### 5.2 データモデル（最小）

#### User
- id
- email または device_id
- push_token
- nudge_level（0-3）
- created_at, updated_at

#### Pair
- id
- user1_id
- user2_id
- invite_code
- status
- created_at, updated_at

#### Wish
- id
- pair_id
- created_by
- title
- category
- priority
- timing
- budget_range
- budget_min, budget_max
- memo
- status
- created_at, updated_at, completed_at

#### PairNudgeState
- pair_id
- last_nudged_at
- last_wish_id
- updated_at

### 5.3 API一覧（実装済み）

#### User
- `POST /users`
- `GET /users/:userId`
- `PATCH /users/:userId`

#### Pairing
- `POST /pairs/invite`
- `POST /pairs/join`
- `GET /users/:userId/pair`

#### Wishes
- `POST /pairs/:pairId/wishes`
- `GET /pairs/:pairId/wishes`
- `PATCH /wishes/:wishId`
- `POST /wishes/:wishId/complete`
- `DELETE /wishes/:wishId`

#### Nudge
- `POST /nudges/trigger`
- `GET /nudges/config`

### 5.4 Nudgeレベル仕様
- `0`: 週1回
- `1`: 3日ごと
- `2`: 毎日
- `3`: 1日2回

実装では、ペア内2ユーザーの `nudge_level` の高い方を採用する。

### 5.5 環境変数
- `PORT`（default: 8787）
- `DB_FILE`（SQLiteファイルパス）
- `NUDGE_MIN_AGE_DAYS`（通知対象の最小経過日数）
- `NUDGE_CRON_ENABLED`（定期トリガー有効化）
- `EXPO_PUSH_ENABLED`（Expo Push有効化）

---

## 6. デモ設計

### 6.1 デモ導線（3-4分）
1. ユーザー2名を作成
2. 招待コードでペアリング
3. 高優先度Wishを追加
4. `POST /nudges/trigger` を実行
5. 「ねえ、焼肉忘れてない？」系通知を2人に同時表示

### 6.2 デモ勝ち筋
- 「同時に2人へ通知が飛ぶ瞬間」を見せる
- 通知文面がランダムで遊び心がある
- Wish完了までワンフローで完結できる

---

## 7. フェーズ計画

### Phase 0: 企画確定（完了）
- コンセプト、訴求、主要導線の確定

### Phase 1: UIプロトタイプ（完了）
- 主要画面とWish操作のモック体験

### Phase 2: バックエンド垂直スライス（完了）
- ペアリング、Wish CRUD、通知トリガーを実装

### Phase 3: 実機通知統合（進行中）
- Expo Push Token連携
- API接続をモックから置換

### Phase 4: 審査デモ最適化（未着手）
- 台本、演出、失敗時フォールバック整備

---

## 8. 将来拡張（ハッカソン後）
- 通知時間帯指定（朝/昼/夜）
- 高優先度のみ通知オプション
- 思い出アルバム
- イベント推薦
- AI提案
- 3人以上のグループ共有

