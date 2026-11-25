SHELL := /bin/bash

include .env.production
export

# .next を消すときは tsconfig.tsbuildinfo も一緒に消す。
# tsbuildinfo が .next/types/** を参照したまま残ると、次のビルドが
# 「File '.next/types/...' not found」で失敗する。
.PHONY: run
run:
	rm -rf .next tsconfig.tsbuildinfo
	npm run dev

.PHONY: build
build:
	npm run build

.PHONY: install
install:
	rm -rf node_modules .next tsconfig.tsbuildinfo
	npm install --force

.PHONY: clean
clean:
	rm -rf .next tsconfig.tsbuildinfo

.PHONY: image
image:
	docker build . -t vsrecorder/webapp:local \
		--build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$(PROD_NEXT_PUBLIC_FIREBASE_API_KEY)" \
		--build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$(PROD_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)" \
		--build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$(PROD_NEXT_PUBLIC_FIREBASE_PROJECT_ID)" \
		--build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$(PROD_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)" \
		--build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$(PROD_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)" \
		--build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$(PROD_NEXT_PUBLIC_FIREBASE_APP_ID)" \
		--build-arg NEXT_PUBLIC_VAPID_PUBLIC_KEY="$(PROD_NEXT_PUBLIC_VAPID_PUBLIC_KEY)"
	docker push vsrecorder/webapp:local

.PHONY: deploy
deploy:
	git pull --ff-only
	git fetch --prune
	docker compose pull
	docker compose up -d --no-deps --wait webapp
	$(MAKE) warmup

#
# 起動直後の最初の閲覧者に初回レンダリングを負わせないための予熱。
#
# healthcheck(/health/web)が通っても、ホーム(/)はまだ一度も描かれていない。Next は
# 動的レンダリングのルートを最初のリクエストで組み立てるため、その1人が待たされる。
#
# pm2 が cluster で2プロセス動いており、リクエストはプロセスに振り分けられる。
# 片方だけ温めても、もう片方に当たった人が同じ目に遭うので複数回叩く。
# 失敗してもデプロイ自体は成功扱いにする(予熱は最適化であって、可否の判定ではない)。
# 実行用イメージはディストロレスで wget が無いので、コンテナの node に fetch させる。
#
# 画像の最適化 API(/_next/image)も同じように温める。Next はプロセスごとに、最初の画像リクエストで
# ディスク上の画像キャッシュ(volume の .next/cache/images)を全件読み込んでから応答する
# (容量上限の管理のため。next/dist/server/image-optimizer.js の initCacheEntries)。
# キャッシュは volume でデプロイをまたいで残るので、溜まった分だけ待たされる。
# 2026-11-25 の本番(6,446件・382MB)では、起動後の最初の1件がキャッシュ済みの画像でも 5〜16 秒かかっていた。
# 読み込みはプロセスごとなので、こちらも複数回叩く。URL は実在する画像でなければならない
# (400/404 になるリクエストでは読み込みが済まない)。ヘッダーのアイコンを使う。
# pm2 がメモリ上限でプロセスを立ち上げ直したときの分までは温められない。
#
WARMUP_IMAGE_URL = http://127.0.0.1:3003/_next/image?url=https%3A%2F%2Fxx8nnpgt.user.webaccel.jp%2Fimages%2Ficons%2Ficon.png&w=48&q=75

.PHONY: warmup
warmup:
	for i in 1 2 3 4; do \
		docker compose exec -T webapp node -e "fetch('http://127.0.0.1:3003/',{signal:AbortSignal.timeout(30000)}).then(r=>r.arrayBuffer()).catch(()=>{})" || true; \
	done
	for i in 1 2 3 4; do \
		docker compose exec -T webapp node -e "fetch('$(WARMUP_IMAGE_URL)',{signal:AbortSignal.timeout(60000)}).then(r=>r.arrayBuffer()).catch(()=>{})" || true; \
	done

#
# カード画像のキャッシュを温める。
#
# 今環境の入賞デッキに入っているカードの印刷（バトラボ /api/cards/prints、約 1,900 枚）を、
# サムネイル用（w=256）とモーダル用（w=828）の 2 サイズで最適化 API に通しておく。
# 最適化の初回は 1 枚 300〜540ms かかって直リンクより遅いので、利用者に引かせない。
# 温めた画像は next.config の minimumCacheTTL（30 日）のあいだ残る。
# ホストに node は無いので、コンテナの node に stdin でスクリプトを渡して走らせる。
# 毎日 05:17 JST に cron で回す（crontab は本番ホストの ubuntu ユーザー）。デプロイ直後にも手で流せる。
#
.PHONY: warm-images
warm-images:
	docker compose exec -T webapp node --input-type=module - < scripts/warm-card-images.mjs

.PHONY: restart
restart:
	docker compose down
	docker compose up -d

.PHONY: up
up:
	docker compose up -d

.PHONY: down
down:
	docker compose down
