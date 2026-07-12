# VSRecorder Webapp

ポケモンカードの対戦記録を作成・管理できる Web サービス **VSRecorder** のフロントエンドアプリケーションです。

## 概要

VSRecorder は、ポケモンカードゲームの対戦記録を残すための Web サービスです。

本リポジトリ（`webapp`）はそのフロントエンド（および BFF 相当の API ルート）を担当し、コア機能は別リポジトリの `core-apiserver` が提供します。

### 主な機能

- **デッキ登録**: 公式サイトで発行したデッキコードを使ってデッキを登録
- **対戦記録の作成**: ジムバトル・トレーナーズリーグ・シティリーグなどの公式イベントに紐づく対戦記録を作成
- **勝敗の記録**: 使用デッキ・対戦相手のデッキ情報・勝敗を記録
- **シティリーグ結果 / デッキ環境（メタ）の閲覧**
- **統計・グラフ表示**: 戦績を可視化

## 技術スタック

| 分類           | 使用技術                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| フレームワーク | [Next.js 15](https://nextjs.org)（App Router / standalone 出力）                          |
| 言語           | TypeScript / React 19                                                                     |
| UI             | HeroUI, Tailwind CSS 4, Framer Motion, Swiper                                             |
| 認証           | NextAuth (Auth.js) v5 + Firebase Authentication（Credentials プロバイダ, IDトークン検証） |
| データ取得     | SWR                                                                                       |
| グラフ         | Chart.js / react-chartjs-2, Recharts                                                      |
| ストレージ     | さくらのクラウド オブジェクトストレージ（S3 互換, AWS SDK）                               |
| インフラ       | Docker / Docker Compose, PM2                                                              |

## ディレクトリ構成

```
src/
├── app/
│   ├── api/            # API ルート（core-apiserver へのプロキシ / BFF）
│   ├── components/     # UI コンポーネント（Atomic Design: atoms/molecules/organisms/templates）
│   ├── contexts/       # React Context
│   ├── hooks/          # カスタムフック
│   ├── handlers/       # イベント/データハンドラ
│   ├── types/          # 型定義
│   ├── utils/          # ユーティリティ
│   ├── auth.ts         # NextAuth 設定
│   ├── records/        # 対戦記録ページ
│   ├── decks/          # デッキページ
│   ├── deck_meta/      # デッキ環境（メタ）ページ
│   ├── cityleague_results/  # シティリーグ結果ページ
│   ├── users/          # ユーザーページ
│   └── ...             # terms / privacy / policy / credits など
└── firebase/           # Firebase 初期化
```

## セットアップ

### 必要環境

- Node.js 24 系（Dockerfile では `node:24.18.0-alpine`）
- npm

### 環境変数

`.env.sample` をもとに環境変数を設定します。主な変数は以下のとおりです。

| 変数                                                                     | 説明                                               |
| ------------------------------------------------------------------------ | -------------------------------------------------- |
| `VSRECORDER_DOMAIN` / `VSRECORDER_JWT_SECRET`                            | バックエンド（core-apiserver）連携用               |
| `AUTH_URL` / `AUTH_SECRET` / `AUTH_TRUST_HOST`                           | NextAuth (Auth.js) 設定                            |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK（サービスアカウント）           |
| `NEXT_PUBLIC_FIREBASE_*`                                                 | クライアント用 Firebase 設定                       |
| `SAKURA_OBJECTSTORAGE_*`                                                 | さくらのクラウド オブジェクトストレージ（S3 互換） |

> **注意**: Firebase Admin SDK には、`verifyIdToken` / `updateUser` / `deleteUser` に必要な最小権限（例: `roles/firebaseauth.admin`）のみを持つ専用サービスアカウントを使用してください。App Engine default service account（Editor ロール）は使用しないこと。

### インストール

```bash
npm install --force
# または
make install
```

## 開発

```bash
npm run dev
# または（.next を削除してから起動）
make run
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くとアプリが表示されます。

## ビルド

```bash
npm run build   # make build
```

## スクリプト

| コマンド        | 説明             |
| --------------- | ---------------- |
| `npm run dev`   | 開発サーバの起動 |
| `npm run build` | 本番ビルド       |
| `npm run start` | 本番サーバの起動 |
| `npm run lint`  | Lint 実行        |

## Docker / デプロイ

Docker イメージのビルドと Docker Compose によるデプロイに対応しています。

```bash
make image     # Docker イメージのビルド & push
make deploy    # git pull → イメージ pull → compose up
make up        # docker compose up -d
make down      # docker compose down
make restart   # 再起動
```

## 関連リポジトリ

| ディレクトリ     | 役割                                           |
| ---------------- | ---------------------------------------------- |
| `core-apiserver` | コア機能を提供する API サーバ                  |
| `webapp`         | フロントエンドアプリケーション（本リポジトリ） |
