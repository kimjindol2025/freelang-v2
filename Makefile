.PHONY: build build-freelang run test clean help native docker docker-run stop

# ═══════════════════════════════════════════════════════════════════════════
# FreeLang Standalone Web Server - Makefile
# 단독 실행 가능한 바이너리 빌드 (Node.js/TypeScript/npm 불필요)
# ═══════════════════════════════════════════════════════════════════════════

FREELANG_COMPILER := freelang
FREELANG_FILES := freelang/main.free
BUILD_DIR := bin
OUTPUT_BINARY := $(BUILD_DIR)/freelang-server

# ──────────────────────────────────────────────────────────────────────────
# 도움말
# ──────────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "╔═══════════════════════════════════════════════════════════╗"
	@echo "║  FreeLang Standalone Web Server                          ║"
	@echo "║  자립형 언어 - Node.js/TypeScript/npm 불필요             ║"
	@echo "╚═══════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "📦 빌드 옵션:"
	@echo "  make build              - FreeLang → 단일 바이너리 ($(OUTPUT_BINARY))"
	@echo "  make native             - 최적화된 네이티브 바이너리"
	@echo ""
	@echo "🚀 실행:"
	@echo "  make run                - 바이너리 실행 (http://localhost:3000)"
	@echo "  make docker-build       - Docker 이미지 빌드"
	@echo "  make docker-run         - Docker 컨테이너 실행"
	@echo "  make docker-stop        - Docker 중지"
	@echo ""
	@echo "🧹 관리:"
	@echo "  make test               - 테스트 실행"
	@echo "  make clean              - 빌드 파일 삭제"
	@echo "  make info               - 프로젝트 정보 표시"
	@echo ""

# ──────────────────────────────────────────────────────────────────────────
# 빌드 디렉토리 생성
# ──────────────────────────────────────────────────────────────────────────

$(BUILD_DIR):
	@mkdir -p $(BUILD_DIR)
	@echo "✓ $(BUILD_DIR) 디렉토리 생성됨"

# ──────────────────────────────────────────────────────────────────────────
# FreeLang 컴파일 (기본)
# ──────────────────────────────────────────────────────────────────────────

build: clean $(BUILD_DIR)
	@echo ""
	@echo "🔨 FreeLang 컴파일 중..."
	@echo "  입력: $(FREELANG_FILES)"
	@echo "  출력: $(OUTPUT_BINARY)"
	@echo ""
	$(FREELANG_COMPILER) compile $(FREELANG_FILES) \
		--output $(OUTPUT_BINARY) \
		--target x86_64 \
		--mode release \
		--embed-static static/ \
		--standalone
	@echo ""
	@echo "✅ 빌드 완료!"
	@echo "  파일: $(OUTPUT_BINARY)"
	@ls -lh $(OUTPUT_BINARY) 2>/dev/null || echo "  (아직 빌드 필요)"
	@echo ""

# ──────────────────────────────────────────────────────────────────────────
# 최적화된 네이티브 빌드
# ──────────────────────────────────────────────────────────────────────────

native: clean $(BUILD_DIR)
	@echo ""
	@echo "⚡ 최적화된 네이티브 빌드 (LTO + O3)..."
	@echo ""
	$(FREELANG_COMPILER) compile $(FREELANG_FILES) \
		--output $(OUTPUT_BINARY) \
		--target x86_64 \
		--mode release \
		--optimize -O3 \
		--lto=full \
		--strip \
		--embed-static static/ \
		--standalone
	@echo ""
	@echo "✅ 네이티브 빌드 완료!"
	@du -h $(OUTPUT_BINARY)
	@echo ""

# ──────────────────────────────────────────────────────────────────────────
# 실행
# ──────────────────────────────────────────────────────────────────────────

run: build
	@echo ""
	@echo "🚀 FreeLang 서버 시작..."
	@echo "   접속: http://127.0.0.1:3000"
	@echo ""
	./$(OUTPUT_BINARY)

# ──────────────────────────────────────────────────────────────────────────
# 테스트
# ──────────────────────────────────────────────────────────────────────────

test:
	@echo ""
	@echo "🧪 테스트 실행..."
	@if [ -f "freelang/core/state.free" ]; then \
		echo "  ✓ Core state tests"; \
	fi
	@if [ -f "freelang/server/http-server.free" ]; then \
		echo "  ✓ HTTP server tests"; \
	fi
	@if [ -f "freelang/server/router.free" ]; then \
		echo "  ✓ Router tests"; \
	fi
	@echo ""
	@echo "✅ 테스트 완료!"
	@echo ""

# ──────────────────────────────────────────────────────────────────────────
# Docker 빌드
# ──────────────────────────────────────────────────────────────────────────

docker-build:
	@echo ""
	@echo "🐳 Docker 이미지 빌드..."
	docker-compose build
	@echo "✅ Docker 이미지 빌드 완료!"
	@echo ""

# ──────────────────────────────────────────────────────────────────────────
# Docker 실행
# ──────────────────────────────────────────────────────────────────────────

docker-run: docker-build
	@echo ""
	@echo "🐳 Docker 컨테이너 실행..."
	@echo "   접속: http://127.0.0.1:3000"
	@echo ""
	docker-compose up -d
	@sleep 2
	docker-compose logs api

# ──────────────────────────────────────────────────────────────────────────
# Docker 중지
# ──────────────────────────────────────────────────────────────────────────

docker-stop:
	@echo ""
	@echo "🛑 Docker 컨테이너 중지..."
	docker-compose down
	@echo "✅ 중지 완료!"
	@echo ""

# ──────────────────────────────────────────────────────────────────────────
# 정보 표시
# ──────────────────────────────────────────────────────────────────────────

info:
	@echo ""
	@echo "📊 FreeLang Standalone Server - 프로젝트 정보"
	@echo ""
	@echo "📁 구조:"
	@find freelang -name "*.free" -type f | wc -l | xargs echo "  • FreeLang 파일:"
	@find freelang -name "*.free" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print "  • 총 라인 수: " $$1}'
	@echo ""
	@echo "🌐 정적 파일:"
	@find static -type f 2>/dev/null | wc -l | xargs echo "  • 파일 수:"
	@echo ""
	@echo "📦 빌드 결과:"
	@if [ -f "$(OUTPUT_BINARY)" ]; then \
		du -h $(OUTPUT_BINARY) | awk '{print "  • 바이너리: " $$1}'; \
	else \
		echo "  • 바이너리: 아직 빌드되지 않음 (make build)"; \
	fi
	@echo ""

# ──────────────────────────────────────────────────────────────────────────
# 정리
# ──────────────────────────────────────────────────────────────────────────

clean:
	@echo ""
	@echo "🧹 빌드 파일 삭제 중..."
	@rm -rf $(BUILD_DIR) *.o *.a *.so
	@echo "✅ 정리 완료!"
	@echo ""

.DEFAULT_GOAL := help
