# Expo アプリへようこそ 👋

このプロジェクトは [`create-expo-app`](https://www.npmjs.com/package/create-expo-app) で作成された [Expo](https://expo.dev) プロジェクトです。

## 前提条件

以下のツールが事前にインストールされている必要があります。

| ツール | バージョン | インストール方法 |
|--------|-----------|-----------------|
| [Node.js](https://nodejs.org/) | v18 以上推奨 | [公式サイト](https://nodejs.org/)からダウンロード、または [nvm](https://github.com/nvm-sh/nvm) を利用 |
| [pnpm](https://pnpm.io/) | v8 以上推奨 | `npm install -g pnpm` |
| [Expo CLI](https://docs.expo.dev/get-started/installation/) | — | `npm install -g expo-cli`（グローバル）、または `npx expo` で都度実行 |
| [Expo Go](https://expo.dev/go) | 最新版 | 実機テスト用。App Store / Google Play からインストール |
| [Git](https://git-scm.com/) | — | [公式サイト](https://git-scm.com/)からダウンロード |

## はじめかた

1. リポジトリのクローン

   ```bash
   git clone <リポジトリURL>
   cd solove-it
   ```

2. 依存パッケージのインストール

   ```bash
   pnpm install
   ```

2. Option1: アプリを起動する

   ```bash
   npx expo start
   ```

3. Option2: トンネルモードでアプリを起動する

   同じ Wi-Fi に接続していない端末や、ネットワーク制限のある環境（企業 Wi-Fi・VPN 等）でも実機テストができます。

   ```bash
   npx expo start --tunnel
   ```

   > **前提条件**: `@expo/ngrok` が必要です。初回実行時に自動でインストールを促されますが、事前にインストールしておくこともできます。
   >
   > ```bash
   > pnpm add -D @expo/ngrok
   > ```

   **トンネルモードの特徴**:
   - [ngrok](https://ngrok.com/) を使い、ローカルの開発サーバーをインターネット経由で公開します
   - 開発 PC と実機が同じネットワークにいなくても接続できます
   - 表示される QR コードを Expo Go アプリで読み取るだけで実機確認が可能です
   - LAN モード (`npx expo start`) よりレイテンシが大きくなる場合があります

起動後の出力から、以下の方法でアプリを開くことができます。

- [開発ビルド](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android エミュレーター](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS シミュレーター](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go) — Expo アプリ開発を手軽に試せるサンドボックス環境

**app** ディレクトリ内のファイルを編集して開発を始められます。このプロジェクトは[ファイルベースルーティング](https://docs.expo.dev/router/introduction)を使用しています。

## プロジェクトをリセットする

準備ができたら、以下のコマンドを実行してください。

```bash
npm run reset-project
```

このコマンドはスターターコードを **app-example** ディレクトリに移動し、空の **app** ディレクトリを作成します。そこから新たに開発を始められます。

## もっと詳しく

Expo を使った開発について詳しくは、以下のリソースをご覧ください。

- [Expo ドキュメント](https://docs.expo.dev/) — 基礎から学べるほか、[ガイド](https://docs.expo.dev/guides)で応用的なトピックも扱っています。
- [Expo チュートリアル](https://docs.expo.dev/tutorial/introduction/) — Android・iOS・Web で動作するプロジェクトをステップバイステップで作成できます。

## コミュニティに参加する

ユニバーサルアプリを開発する開発者コミュニティに参加しましょう。

- [Expo on GitHub](https://github.com/expo/expo) — オープンソースプラットフォームの閲覧・コントリビュート。
- [Discord コミュニティ](https://chat.expo.dev) — Expo ユーザーとのチャットや質問。
