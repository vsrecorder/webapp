SHELL := /bin/bash

include .env.production
export

.PHONY: run
run:
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
	docker build . \
		--build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$(NEXT_PUBLIC_FIREBASE_API_KEY)" \
		--build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$(NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)" \
		--build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$(NEXT_PUBLIC_FIREBASE_PROJECT_ID)" \
		--build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$(NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)" \
		--build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$(NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)" \
		--build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$(NEXT_PUBLIC_FIREBASE_APP_ID)" \
		-t vsrecorder/webapp:local && \
	docker push vsrecorder/webapp:local

.PHONY: deploy
deploy:
	docker compose pull && docker compose down && docker compose up -d

.PHONY: restart
restart:
	docker compose down && docker compose up -d

.PHONY: up
up:
	docker compose up -d

.PHONY: down
down:
	docker compose down
