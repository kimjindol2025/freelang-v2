#!/bin/bash

# ============================================================================
# FreeLang HTTP 블로그 API 시뮬레이션
# ============================================================================

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     FreeLang HTTP Server 블로그 API 시뮬레이션          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

DB_FILE="data/db.json"

# 함수: JSON에서 특정 값 추출 (간단한 파싱)
get_blogs_published() {
    cat "$DB_FILE" | grep -A 20 '"status": "PUBLISHED"' | grep '"title"' | head -n 2
}

get_blog_count() {
    grep -c '"id":' "$DB_FILE" | head -n 1
}

# 1. GET /api/blogs - 발행된 블로그 조회
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "GET /api/blogs (발행된 블로그만)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "응답:"
cat data/db.json | sed -n '/"blogs":/,/\]/p' | head -n 50
echo ""
echo ""

# 2. 블로그 통계
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 블로그 통계"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

published_count=$(grep -c '"status": "PUBLISHED"' data/db.json)
draft_count=$(grep -c '"status": "DRAFT"' data/db.json)
total_views=$(grep '"viewCount"' data/db.json | grep -o '[0-9]*' | awk '{sum+=$1} END {print sum}')

echo "총 블로그: 3개"
echo "  📰 발행됨 (PUBLISHED): $published_count개"
echo "  ✏️  초안 (DRAFT): $draft_count개"
echo ""
echo "총 조회수: $total_views"
echo ""
echo ""

# 3. 샘플 블로그 목록
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 블로그 목록"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1️⃣  FreeLang HTTP Server 완성"
echo "   작성자: FreeLang Team"
echo "   카테고리: Technology"
echo "   상태: 📰 발행됨"
echo "   요약: Node.js 없이 FreeLang만으로 완벽한 HTTP 서버를 구현"
echo ""

echo "2️⃣  FreeLang의 메모리 관리 시스템"
echo "   작성자: FreeLang Team"
echo "   카테고리: Performance"
echo "   상태: 📰 발행됨"
echo "   요약: FreeLang 메모리 관리 내부 구조 완전 분석"
echo ""

echo "3️⃣  Type Safety와 패턴 매칭"
echo "   작성자: FreeLang Team"
echo "   카테고리: Programming"
echo "   상태: ✏️  초안"
echo "   요약: FreeLang의 타입 시스템 심화 가이드"
echo ""
echo ""

# 4. API 테스트 커맨드
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 실제 테스트 커맨드 (FreeLang 서버 실행 후)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "# 발행된 블로그 조회"
echo "curl http://localhost:5020/api/blogs"
echo ""

echo "# 모든 블로그 조회 (초안 포함)"
echo "curl http://localhost:5020/api/blogs/all"
echo ""

echo "# 특정 블로그 조회"
echo "curl http://localhost:5020/api/blogs/1"
echo ""

echo "# 블로그 발행 (초안 → 발행)"
echo "curl -X POST http://localhost:5020/api/blogs/3/publish"
echo ""

echo "# 웹 UI"
echo "open http://localhost:5020/blog.html"
echo ""

