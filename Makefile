.PHONY: dev lint test check build start

dev:
	npm run dev

lint:
	npm run lint
	npm run typecheck

test:
	npm test

check: lint test

build:
	npm run build

start:
	npm start
