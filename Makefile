SHELL := /bin/bash

include .env.production
export

.PHONY: run
run:
	rm -rf .next
	npm run dev

.PHONY: build
build:
	npm run build

.PHONY: install
install:
	rm -rf node_modules .next
	npm install --force

.PHONY: image
image:
	docker build . -t vsrecorder/webapp:local \
		--build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$(PROD_NEXT_PUBLIC_FIREBASE_API_KEY)" \
		--build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$(PROD_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)" \
		--build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$(PROD_NEXT_PUBLIC_FIREBASE_PROJECT_ID)" \
		--build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$(PROD_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)" \
		--build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$(PROD_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)" \
		--build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$(PROD_NEXT_PUBLIC_FIREBASE_APP_ID)" && \
	docker push vsrecorder/webapp:local

.PHONY: deploy
deploy:
	git pull
	docker compose pull
	docker compose up -d --no-deps --wait webapp

.PHONY: restart
restart:
	docker compose down && docker compose up -d

.PHONY: up
up:
	docker compose up -d

.PHONY: down
down:
	docker compose down
