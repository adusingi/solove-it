---
title: "大切な人とやりたいことリスト - プロジェクト概要"
---

# 大切な人とやりたいことリスト - プロジェクト概要

## プロジェクト概要
恋人・夫婦・家族など、2人で「いつかやりたいこと」を共有し、通知で実行を後押しするモバイルファーストアプリ。

- 招待コードで2人をペア化
- 共有Wishを作成・管理
- バックエンドがお節介通知をトリガー

デモ用API: `http://127.0.0.1:8787`

## コアMVP機能
- シンプルユーザー作成（email または device_id）
- ペアリング（招待コード発行・参加）
- Wish CRUD（作成・更新・削除）
- Wish完了ステータス管理
- Wish一覧のフィルタ・ソート
- 通知手動トリガーAPI（デモ用）
- 任意の定期チェック（cron）
- 通知頻度レベル（0/1/2/3）
- pending + 高優先度 + 経過日数条件でランダム抽出
- Expo Push未設定時のシミュレーション通知フォールバック

## 技術スタック（目標構成）
- モバイルアプリ: Expo（React Native + TypeScript + Expo Router）
- 状態管理/UIデータ: React Query + Context + AsyncStorage（現状）
- バックエンド: Node.js + Fastify
- データベース: SQLite（`better-sqlite3`）
- 通知: Expo Push API（任意）+ `node-cron`
- API形式: REST JSON

## デザインシステム

### カラーパレット
| トークン | 値 | 用途 |
|-------|-----|-------|
| `primary` | `#E86A50` | 主要CTA、重要強調 |
| `primary-light` | `#FFF0EC` | プライマリの淡色背景 |
| `secondary` | `#F5A623` | サブ強調、タグ |
| `accent` | `#4ECDC4` | 補助チップ、メタ情報 |
| `background` | `#FAFAF8` | 画面背景 |
| `surface` | `#FFFFFF` | カード面、浮き面 |
| `text` | `#1A1A1A` | 本文・主要テキスト |
| `text-secondary` | `#6B7280` | 補助テキスト |
| `border` | `#F0EDED` | 入力欄/カード境界 |
| `success` | `#34D399` | 完了状態 |
| `warning` | `#FBBF24` | 注意状態 |
| `error` | `#EF4444` | エラー/高優先度 |

### タイポグラフィ
| 役割 | フォント | 変数 | 用途 |
|------|-------------|----------|-------|
| **見出し** | System（React Native既定） | なし | 画面タイトル、セクション見出し |
| **本文** | System（React Native既定） | なし | 一般UIテキスト |
| **数値/補助** | System（React Native既定） | なし | 統計、ラベル、補助情報 |

### UI標準
- **カード**
  - 角丸: `16`
  - 余白: 約`14`
  - 白背景 + ソフトシャドウ
- **ボタン/チップ**
  - 主要ボタン角丸: `12-18`
  - フィルタチップ角丸: `20`
  - 小タグ角丸: `6-10`
- **アイコン**
  - ライブラリ: `lucide-react-native`
  - 方針: アウトライン、`currentColor`準拠
- **レイアウト**
  - モバイルファーストのタブ構成（`home` / `list` / `events` / `settings`）
  - Wish追加・編集はモーダル画面

## MVP方針
- 本番最適化よりデモ再現性を優先
- 認証は最短構成（`email` or `device_id`）
- ハッカソン速度重視でSQLite採用
- 通知頻度はペア内の高い `nudge_level` を採用
- 手動トリガー (`/nudges/trigger`) と定期実行を両対応
- Push未接続でもシミュレーションでデモを成立させる

## 最近の変更（2026-02-14）
- `backend/` に Fastify + SQLite のMVPバックエンドを新設
- ユーザー・ペアリング・Wish・通知のREST APIを実装
- pending/高優先度/経過日数を満たすWish抽出ロジックを実装
- nudge level（週1/3日ごと/毎日/1日2回）の頻度判定を実装
- Expo Push連携（任意）+ 安全なシミュレーションフォールバックを実装

## 最近の変更（2026-02-14）
- curlでE2E動作確認を実施
  - ユーザー2名作成
  - 招待コード発行・参加
  - 高優先度Wish作成
  - 通知トリガー実行で2ユーザー同報を確認
- ヘルス/設定エンドポイント確認
  - `GET /health`
  - `GET /nudges/config`

## 最近の変更（2026-02-14）
- バックエンド依存管理を `pnpm` に統一
- `better-sqlite3` のネイティブビルド承認を反映
- `PRD` / `PROJECT_STATUS` / `PROJECT_SUMMARY` の整合を更新
