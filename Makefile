.PHONY: build test clean help install run

help:
	@echo "FreeLang v2 - AI-First Programming Language"
	@echo ""
	@echo "Available targets:"
	@echo "  make install    - Install dependencies"
	@echo "  make build      - Build TypeScript"
	@echo "  make test       - Run tests"
	@echo "  make test-watch - Run tests in watch mode"
	@echo "  make lint       - Run ESLint"
	@echo "  make clean      - Remove build artifacts"
	@echo "  make dev        - Run in development mode"
	@echo "  make help       - Show this message"

install:
	npm install

build: clean
	npm run build
	@echo "✅ Build complete"

test:
	npm test

test-watch:
	npm run test:watch

lint:
	npm run lint

clean:
	npm run clean
	@echo "✅ Clean complete"

dev:
	npm run dev

all: install build test
	@echo "✅ All complete"
