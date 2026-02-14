---
title: "大切な人とやりたいことリスト - Project Status"
---

# 大切な人とやりたいことリスト - Project Status

**Last Updated:** 2026-02-14  
**Current Phase:** ハッカソンMVP バックエンド垂直スライス完成  
**Branch Policy:** 基本は `main` で高速開発。必要に応じて短命ブランチを切って即マージ。

---

## Current Phase Status
**Current Phase:** ハッカソンMVP バックエンド垂直スライス完成  
**State:** 🟢 実装完了・ローカル検証済み  
**Branch:** main

## Recent updates (2026-02-14)
- **バックエンド新設:** `backend/` に Fastify + SQLite のAPIサーバーを追加。
- **MVP API実装:** ユーザー作成、招待コードペアリング、Wish CRUD、完了管理、フィルタ取得を実装。
- **通知ロジック実装:** pending + high + 経過日数条件のWishをランダム抽出し、2人へ同時通知（実運用時はExpo Push、未設定時はシミュレーション）。
- **通知頻度実装:** nudge level 0/1/2/3 を週1・3日ごと・毎日・1日2回の判定ロジックに反映。
- **手動デモ導線:** `/nudges/trigger` で強制トリガー可能。ハッカソン本番で再現しやすい構成。
- **動作確認:** `pnpm` で依存導入、`pnpm start`、`/health` と `/nudges/config` を確認済み。
- **E2E確認:** curlで「ユーザー2名作成 → 招待/参加 → Wish作成 → 通知トリガー」まで成功。

## ✅ What's already done (documentation)
- [x] PRD更新（`docs/PRD.md`）
- [x] プロジェクトステータス更新（`docs/PROJECT_STATUS.md`）
- [x] バックエンド仕様書（`backend/README.md`）

---

## 🚀 Hackathon MVP Goal
**MVP = 「2人で共有して、通知で動く」体験を1本通す**
- シンプル認証（email または device_id）
- 招待コードによる2人ペアリング
- Wish 作成・編集・削除・完了
- Wish 一覧フィルタ
- お節介通知のデモ（同時に2人へ）

---

## Phase 0: 企画・体験定義（完了）
**Objective:** 誰にどんな感情価値を届けるかを定義する。

- [x] プロダクトコンセプトと言語化
- [x] ユーザーストーリー策定
- [x] 主要画面と導線の草案化

**Exit criteria:** 「忘れる二人を、お節介に繋ぎ止める」体験の軸が明確。

---

## Phase 1: モバイルUIプロトタイプ（完了）
**Objective:** Expoで画面遷移とWish操作の体験を作る。

- [x] タブ構成（ホーム・一覧・イベント・設定）
- [x] Wish追加/編集画面
- [x] フィルタUIと進捗表示
- [x] モックデータでの体験確認

**Exit criteria:** デモ用の画面遷移と主要UIが成立。

---

## Phase 2: バックエンド垂直スライス（完了）
**Objective:** ハッカソンデモに必要なAPI一式を最短で成立させる。

- [x] DBスキーマ（users, pairs, wishes, pair_nudge_state）
- [x] ユーザー作成/更新API
- [x] 招待コード発行・参加API
- [x] Wish CRUD + 完了API
- [x] Wishフィルタ取得API
- [x] 通知トリガーAPI（手動 + スケジュール対応）
- [x] 通知ロジック（優先度/経過日数/頻度レベル）

**Test checklist (Phase 2)**
- [x] `GET /health` が `{"ok":true}` を返す
- [x] `GET /nudges/config` が nudge level 定義を返す
- [x] 招待コードで2ユーザーが `active` ペアになる
- [x] high priority wish を作成し `POST /nudges/trigger` で `status: "nudged"` になる

**Exit criteria:** デモ本番で「同時通知される瞬間」を再現可能。

---

## Phase 3: アプリ統合・実機通知（進行中）
**Objective:** モバイルアプリからAPIを呼び、可能なら実機プッシュ通知までつなぐ。

- [ ] フロントのデータソースをモックからAPIに切替
- [ ] Expo Push Token 収集と `users.push_token` 保存
- [ ] `EXPO_PUSH_ENABLED=true` で実機通知確認
- [ ] 最低限のエラー表示/リトライ導線

**Exit criteria:** 実機2台で「同時に通知が来る」デモが成立。

---

## Phase 4: デモ最終調整（未着手）
**Objective:** 審査時間内に刺さるデモ導線へ磨き込む。

- [ ] 3分デモ台本（ペアリング→Wish作成→通知）
- [ ] 失敗時フォールバック（手動トリガー、モック通知）
- [ ] 画面と文言の最終調整

**Exit criteria:** どの環境でもデモ失敗率を最小化できる。

---

## Post-hackathon backlog（参考）
- [ ] 認証/認可強化
- [ ] 同時更新や整合性の強化
- [ ] 通知時間帯設定、高優先度限定通知オプション
- [ ] 監視、メトリクス、障害検知
- [ ] イベント推薦・AI提案は将来機能として別フェーズ化
