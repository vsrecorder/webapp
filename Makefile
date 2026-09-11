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
# healthcheck(/health)が通っても、ホーム(/)はまだ一度も描かれていない。Next は
# 動的レンダリングのルートを最初のリクエストで組み立てるため、その1人が待たされる。
#
# pm2 が cluster で2プロセス動いており、リクエストはプロセスに振り分けられる。
# 片方だけ温めても、もう片方に当たった人が同じ目に遭うので複数回叩く。
# 失敗してもデプロイ自体は成功扱いにする(予熱は最適化であって、可否の判定ではない)。
#
.PHONY: warmup
warmup:
	for i in 1 2 3 4; do \
		docker compose exec -T webapp wget --spider -q -T 30 http://127.0.0.1:3003/ || true; \
	done

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
