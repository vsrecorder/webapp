# オブジェクトストレージ上の画像の Content-Type / Cache-Control

## ステータス

採用 (Accepted) — 2026-08-11 / 既存 114,453 件への適用と両サービスの修正が完了

## Context

CDN(さくらのウェブアクセラレータ `xx8nnpgt.user.webaccel.jp`)経由で配信している画像が、**すべて `Content-Type: application/octet-stream`** で、かつ **`Cache-Control` に `max-age` を持たない**状態だった。

### 原因

CDN は単なる通り道で、壊れていたのはオリジン(さくらのオブジェクトストレージ `vsrecorder` バケット)のオブジェクトメタデータだった。アップロード時に `ContentType` / `CacheControl` を指定していなかったため。

```
S3 オリジン直 : Content-Type: application/octet-stream
                Cache-Control: (なし)
CDN 経由      : Content-Type: application/octet-stream   ← そのまま透過
                Cache-Control: s-maxage=604800           ← CDN が付与
```

`s-maxage` は**共有キャッシュ(CDN)専用**の指定で、ブラウザには効かない。

### 何が起きていたか

Chrome は `Cache-Control` ヘッダーが存在すると(`s-maxage` だけでも)「`max-age` が無い = freshness 0」とみなし、`Last-Modified` によるヒューリスティックキャッシュを使わない。結果、**再訪問のたびに 304 の再検証往復が発生していた**。

同一内容の画像で新旧ヘッダーを比較した実測(Chromium、CDN キャッシュ温め済み):

| | 再訪問時 |
| --- | --- |
| 未修正 (Cache-Control なし) | **47ms** (304 の往復) |
| 修正済 (max-age あり) | **6ms** (キャッシュから即時) |

304 は本文を転送しないので**帯域は変わらない。消えるのは待ち時間**。デッキ一覧のように画像が数十枚並ぶ画面ではまとまった差になる。

> **注記:** WebKit(Safari)では別途の計測で再訪問 4ms・8枚中7枚キャッシュヒットとなり、**ヒューリスティックキャッシュが効いている可能性がある**。Safari での効果は Chrome より小さいかもしれないが、確認できていない。

### 発端

Next.js の dev モードが出す LCP 警告(`Please add the loading="eager" property`)の調査中に発見した。**警告自体はエラーではなく、対処も不要だった**([経緯](#付録-発端となったlcp警告について))。

## Decision

### D1. 配信元は CDN のまま、オリジンのメタデータを直す

CDN はオリジンのヘッダーを透過し、`s-maxage` を追記する形で返す。検証済み:

```
S3 に設定  : public, max-age=31536000, immutable
CDN が返す : public, max-age=31536000, immutable, s-maxage=604800
             content-type: image/png
```

ブラウザは `max-age` を、CDN は `s-maxage` を見るので両立する。**オリジンを直すだけで CDN 経由の配信も直る。**

自前配信への移行も検討したが却下した。速度は自前サーバの方が速かった(TTFB 50〜73ms vs CDN 71〜274ms)ものの、`public/` に置くと `Cache-Control: public, max-age=0` になりむしろ悪化する。また sprites は 1,384 枚、decks は 111,000 枚超あり、decks はユーザー生成で増え続けるため現実的でない。**問題はヘッダーであって配信元ではない。**

### D2. キャッシュ方針は prefix ごとに分ける

| prefix | Cache-Control | 根拠 |
| --- | --- | --- |
| `images/decks/` | `public, max-age=31536000, immutable` | デッキコード単位。アップロード済みならスキップするので上書きされない |
| `images/users/` | 同上 | ファイル名に日時が入る |
| `images/ogp/` | 同上 | ファイル名に `OG_IMAGE_VERSION` が入る |
| `images/icons/` | `public, max-age=86400, stale-while-revalidate=604800` | 同じURLのまま差し替える運用があり得る |
| `images/pokemon-sprites/` | 同上 | 同上 |

`immutable` は「同じ URL の中身が絶対に変わらない」場合にのみ使う。差し替える可能性があるものに付けると、変更が反映されなくなる。

### D3. アップロード時に必ずメタデータを指定する

| サービス | 箇所 | 対象 |
| --- | --- | --- |
| webapp | [route.ts](src/app/api/users/%5Bid%5D/images/route.ts) | プロフィール画像 |
| webapp | [ogStorage.ts](src/app/utils/ogStorage.ts) | OGP画像 |
| core-apiserver | `internal/infrastructure/deck_asset.go` | デッキ画像 / デッキ結果HTML |

core-apiserver の `putObject` は**デッキ画像(JPEG)とデッキ結果HTMLの2用途で共用**されているため、固定値ではなく引数で受ける。定数 `deckImageContentType` / `deckImageCacheControl` / `deckResultHTMLContentType` / `deckResultHTMLCacheControl` を用意している。

### D4. 既存オブジェクトは CopyObject でメタデータのみ差し替える

[scripts/fix-s3-object-metadata.mjs](scripts/fix-s3-object-metadata.mjs) を使う。手順は下記。

## 適用手順

### 前提

- Node の `--env-file` で `.env` から認証情報を読む(dotenv 不要)。`.env` は本番バケット `vsrecorder` を指している
- **本番サーバーで実行する必要はない。** オブジェクトストレージの API を叩くだけなので、ローカルから実行できる

### 1. まず件数を確認する(dry-run)

`--apply` を付けない限り一切書き換えない。

```fish
node --env-file=.env scripts/fix-s3-object-metadata.mjs --prefix images/decks/
```

### 2. 適用する

```fish
node --env-file=.env scripts/fix-s3-object-metadata.mjs --prefix images/decks/ --apply --no-head
```

冪等。中断しても失敗が出ても、同じコマンドの再実行で取りこぼしだけが処理される。長時間になる場合は tmux の下で流す。

### 3. 一括適用のあとに増えた分だけを拾う

`--since` で更新日時を絞る。`ListObjectsV2` は全件走査するが、`HeadObject`/`CopyObject` を絞れるので圧倒的に速い(decks で 38分 → 22秒)。

```fish
node --env-file=.env scripts/fix-s3-object-metadata.mjs --prefix images/decks/ --since 2026-08-11T00:00:00Z --apply
```

一括適用で更新日時も書き換わっているため、`--since` には**一括適用が終わった時刻以降**を指定する。それ以前を指定しても HeadObject で正しいと判定されるだけで害はない。

### 4. 確認する

数件を抜き取るのが早い(全件確認は decks で 38 分かかる)。

```fish
curl -sI "https://xx8nnpgt.user.webaccel.jp/images/decks/<デッキコード>.jpg" | grep -iE '^(content-type|cache-control)'
```

### CDN のパージは不要

`CopyObject` で `Last-Modified` が更新されるため、CDN が再取得して自動的に新ヘッダーへ入れ替わる。実際、一括適用後に確認したところ**パージなしで新ヘッダーが返っていた**。

## 注意点

### ACL を絶対に外さない

`CopyObject` は **ACL を引き継がない**。スクリプトは `ACL: "public-read"` を明示しているが、これを外すとオブジェクトが非公開になり**本番の画像配信が止まる**。適用後は必ず匿名アクセスで 200 が返ることを確認する。

### `--no-head` の使い分け

| 状況 | `--no-head` | 理由 |
| --- | --- | --- |
| 初回の一括適用 | **付ける** | ほぼ全件が対象なので確認の往復が無駄 |
| 差分の取りこぼし拾い | **付けない** | 付けると全件を無条件に再書き換えしてしまう |

### レート制限

さくらのオブジェクトストレージは **1バケットあたり毎秒100アクセス**(標準プラン)。このバケットは本番サービスも使っている(CDN のキャッシュミス時のオリジンアクセス、デッキ画像アップロード、プロフィール画像アップロード)ため、使い切ると**本番の配信・アップロードが失敗しうる**。

スクリプトは既定で 30 req/s に制限し(`--rps`)、SDK を `retryMode: "adaptive"` にしてスロットリング時に自動減速する。`--concurrency` を上げても `--rps` が上限として効く。**100 に近づけないこと。**

`ListObjectsV2` / `HeadObject` / `CopyObject` すべてが 1 アクセスとして数えられる。

### 課金

リクエスト数は 10万ごとに 55円(基本料金 月額495円に10万リクエスト分を含む)。今回の一括適用(約11.4万リクエスト)で 60円程度。

## 適用実績 (2026-08-11)

| prefix | 件数 | 実測 |
| --- | ---: | --- |
| `images/icons/` | 34 | — |
| `images/users/` | 71 | — |
| `images/pokemon-sprites/` | 1,384 | 39.7秒 |
| `images/ogp/` | 1,898 | — |
| `images/decks/` | 111,066 | 57.8分 / 実効 32 req/s |
| **合計** | **114,453** | **失敗 0** |

### 検証結果

全 prefix をキー空間に分散サンプリング(計70件)して確認:

- Content-Type / Cache-Control: 全件期待どおり
- **ACL: 全件 HTTP 200(公開読み取り維持)**
- CDN 配信: 全件正常

実ブラウザ(Chromium、永続プロファイル)でデッキ画像8枚:

```
初回  : 184.8, 198.9, 200.9, 208.6, 226.6, 250.8, 252.9, 271.6 ms
再訪問:   3.0,   3.2,   3.4,   3.7,   4.0,   4.1,   5.3,   5.5 ms
```

中央値 227ms → 4ms。再訪問時のネットワーク往復が消えた。LP の CDN 画像 8 枚も描画失敗 0、4xx/5xx 0 件。

## 付録: 発端となったLCP警告について

```
Image with src ".../great-ball.png" was detected as the Largest Contentful Paint (LCP).
Please add the `loading="eager"` property if this image is above the fold.
```

これは Next.js が **dev モードで出す汎用的な助言**で、エラーではない。本番ビルドでは出ない。

[DesignationPanel.tsx](src/app/components/organisms/Designation/DesignationPanel.tsx) のランク画像(80×80)が、周囲がスケルトンのため消去法で「最大要素」になっていただけ。この画像は称号 API の応答後にマウントされるので初期HTMLに存在せず、`priority` を付けても Next.js は preload タグを出せない。**実測でも効果はなかったため、対処は不要と結論した。**

`react-dom` の `preload()` でランク画像6枚を先読みする案も実装して計測したが、**初回訪問で75KBが無駄になり(6枚中1枚しか使わない)、Chrome が "preloaded but not used" 警告を5件出す**一方、LCP は API 応答が律速のため改善しなかった。revert 済み。

表示を速くするなら、称号データをサーバー側で取得して初期HTMLに含めるのが本筋。そうすれば Next.js が自動で正しく1枚だけ preload する。

### 計測上の落とし穴

調査中、**Playwright の `context.route()` を張るとそのコンテキストのリクエストがブラウザキャッシュを迂回する**ことに気づかず、「preload が再利用されない」「next/image が原因」といった誤った結論を繰り返した。API をモックするために route を張っていたことが原因。

**キャッシュ挙動を計測するときは route を使わないこと。** 起点ページを差し替えたい場合も、route ではなく実在するページを使う。
