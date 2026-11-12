# syntax=docker.io/docker/dockerfile:1

#
# ビルド用は Debian(glibc)、実行用はディストロレス(gcr.io/distroless/nodejs26-debian13)。
#
# 実行用イメージにはシェルもパッケージマネージャも busybox も入っていない。
# 侵入されても足場になるコマンドが無く、OS パッケージ由来の脆弱性もほぼ無くなる。
# 代わりに `docker exec ... sh` や wget は使えないので、コンテナの中で何かするときは
# node に直接やらせる(docker-compose.yml の healthcheck、Makefile の warmup を参照)。
#
# ビルド側を alpine(musl)にしてはいけない。sharp などのネイティブモジュールは
# npm ci を走らせた libc 向けのバイナリが入るので、実行側(glibc)で読み込めなくなる。
# Debian の版(trixie = 13)もディストロレスの debian13 と揃えている。
#
# Node の版: ディストロレスのタグはメジャー版までしか選べない(nodejs26)。タグだけで指すと、
# パッチ版も OS のライブラリも「イメージを作り直した時点の最新」になり、同じコミットから
# 違う中身ができる。ダイジェストで固定し、更新は Dependabot の PR で受ける
# (.github/dependabot.yml の docker。公開直後の版を黙って取り込まないのは npm と同じ方針)。
#
# ビルド側(base)の Node を上げるときは、下の runtime のダイジェストも
# その版以上の Node が入ったものへ上げること。ずれていると prep 段の検査でビルドが落ちる。
# いまのダイジェストの中身: Node 26.13.1(2026-11-13 に確認)。
# 最新のダイジェストは次で分かる(先頭の Digest。プラットフォーム別ではなく index のもの):
#   docker buildx imagetools inspect gcr.io/distroless/nodejs26-debian13:latest
#
FROM node:26.13.1-trixie-slim AS base

FROM gcr.io/distroless/nodejs26-debian13:latest@sha256:b7141f720ffac6df9069d40ca8bd82c51ab5cdb21f1456b119382883e2971f53 AS runtime

# Install dependencies only when needed
FROM base AS deps

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder

WORKDIR /app

ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN \
  if [ -f yarn.lock ]; then yarn run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

#
# 実行用イメージに載せるファイルを、所有者・権限込みで組み立てる段。
#
# ディストロレスにはシェルが無く RUN が使えない(mkdir も chown も npm もできない)ので、
# 必要なものはここで全部作り、runner へは COPY だけで持ち込む。
#
FROM base AS prep

#
# 実行側の Node が、ビルド側(base)より古くないことを確かめる。
#
# 実行側の版はディストロレスのダイジェストで決まるので、base のタグだけ上げても
# 本番で動く Node は変わらない。セキュリティリリースで base を上げたのに実行側が
# 古いまま、という取りこぼしをビルドの失敗で気付けるようにする。
# メジャーが違う場合も落とす(nodejs26 のタグを変え忘れている)。
# 実行側の方が新しいのは構わない(Dependabot がダイジェストだけ先に上げた場合)。
#
RUN --mount=type=bind,from=runtime,source=/nodejs/bin/node,target=/tmp/runtime-node \
  node -e 'const [b, r] = process.argv.slice(1).map((v) => v.split(".").map(Number)); \
    const older = r[0] !== b[0] || r[1] < b[1] || (r[1] === b[1] && r[2] < b[2]); \
    console.log("Node: build " + b.join(".") + " / runtime " + r.join(".")); \
    if (older) { console.error("実行側(distroless)の Node がビルド側より古い、またはメジャーが違います。runtime のダイジェストを上げてください。"); process.exit(1); }' \
  "$(node -p process.versions.node)" "$(/tmp/runtime-node -p process.versions.node)"

# pm2 は npm が無い実行用イメージでは入れられないので、ここで入れて丸ごと運ぶ。
RUN npm install -g pm2

#
# 実行ユーザ nextjs(uid 1001)。ディストロレス既定の nonroot(uid 65532)にしないのは、
# 本番の named volume(.next/cache)の中身が uid 1001 所有で溜まっているため。
# uid を変えると書けなくなり、キャッシュが黙って一切効かなくなる。
#
# passwd にも載せる。載っていない uid で動かすと HOME が決まらず(pm2 は $HOME/.pm2 に
# ソケットとログを置く)、os.userInfo() も例外になる。
# ディストロレスの passwd / group に 1 行ずつ足したものを作って差し替える。
#
COPY --from=runtime /etc/passwd /etc/group /out/etc/
RUN echo 'nextjs:x:1001:1001:nextjs:/home/nextjs:/sbin/nologin' >> /out/etc/passwd \
  && echo 'nodejs:x:1001:' >> /out/etc/group \
  && mkdir -p /out/home/nextjs

COPY --from=builder /app/public /out/app/public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=1001:1001 /app/.next/standalone /out/app/
COPY --from=builder --chown=1001:1001 /app/.next/static /out/app/.next/static
COPY --chown=1001:1001 ecosystem.config.cjs /out/app/

#
# Next のサーバキャッシュ(.next/cache)の置き場所を、所有者付きで先に作っておく。
#
# ここには fetch の結果(revalidate 付きで取った上流の応答)と、next/image の最適化結果が入る。
# 中身はアプリが実行時に作るため、イメージにこのディレクトリが無いまま docker の
# named volume を割り当てると、docker がマウント先を root 所有で作ってしまい、
# nextjs ユーザ(uid 1001)が書けずキャッシュが一切効かなくなる。
# イメージ側に正しい所有者で存在させておくと、volume の初期化時にその所有者が引き継がれる。
#
# 永続化する理由は docker-compose.yml の volumes を参照。
#
RUN mkdir -p /out/app/.next/cache && chown -R 1001:1001 /out/app/.next/cache

# Production image, copy all the files and run next
FROM runtime AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

#
# node を PATH に通す。ディストロレスの node は /nodejs/bin にあり、既定の PATH には無い。
# healthcheck・`make warmup`・`make warm-images` が `node` の名前で呼ぶほか、
# pm2 も子プロセスの起動に PATH 上の node を探す。
#
ENV PATH=/nodejs/bin:$PATH

#
# pm2 が使う pidusage は、起動時に `getconf CLK_TCK` / `getconf PAGESIZE` をシェル経由で呼ぶ。
# シェルが無いので必ず失敗し、既定値(100 / 4096)に落ちる。x86_64・arm64(4K ページ)の
# Linux では実際の値と同じなので、max_memory_restart の判定は狂わない(起動して確認済み)。
# 失敗のたびにスタックトレースがログへ出るので、それだけ止める。
#
ENV PIDUSAGE_SILENT=1

#
# もう一つ、pm2 はプロセスを止めるとき `ps` で子孫をたどって一緒に止める。ps も無いので、
# 最初の停止時に「[TreeKill] ps unavailable ... children may be orphaned」と 1 回だけ出て、
# 対象の pid だけを止める動きになる(pm2 が想定している縮退動作)。
# next-server は子プロセスを作らないので取り残しは出ない(/proc で全プロセスの親が
# pm2 = pid 1 であることを確認済み。メモリ上限での入れ替え・docker stop とも正常)。
# 子プロセスを作る処理を足すときは、ここを思い出すこと。
#

# ステージをまたぐ COPY は元の所有者をそのまま引き継ぐ(prep で付けた uid 1001 が残る)。
COPY --from=prep /out/etc/passwd /out/etc/group /etc/
COPY --from=prep --chown=1001:1001 /out/home/nextjs /home/nextjs
COPY --from=prep /usr/local/lib/node_modules/pm2 /opt/pm2
COPY --from=prep /out/app /app

USER nextjs

EXPOSE 3003

ENV PORT=3003

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/config/next-config-js/output
ENV HOSTNAME="0.0.0.0"

# ENTRYPOINT はディストロレス既定の /nodejs/bin/node。シェルが無いので
# pm2-runtime の shebang(#!/usr/bin/env node)は解決できず、node の引数として渡す。
CMD ["/opt/pm2/bin/pm2-runtime", "start", "ecosystem.config.cjs"]
