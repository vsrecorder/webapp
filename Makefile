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

.PHONY: docker-build-and-push
docker-build-and-push:
	docker build -t vsrecorder/webapp:latest . && docker push vsrecorder/webapp:latest

.PHONY: deploy
deploy:
	docker compose pull && docker compose down && docker compose up -d
