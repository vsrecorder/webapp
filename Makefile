SHELL := /bin/bash

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
	docker build -t vsrecorder/webapp:latest . && docker push vsrecorder/webapp:latest

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
