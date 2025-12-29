.PHONY: dev
dev:
	npm run dev

.PHONY: build
build:
	npm run build

.PHONY: install
install:
	rm -rf node_modules package-lock.json
	npm install

.PHONY: docker-build-and-push
docker-build-and-push:
	sudo docker build -t vsrecorder/webapp:latest . && sudo docker push vsrecorder/webapp:latest

.PHONY: deploy
deploy:
	docker compose pull && docker compose down && docker compose up -d
