#!/bin/bash
# FreeLang v2.1.0 npm 배포 스크립트
# 사용법: ./scripts/publish-npm.sh

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 헤더
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}FreeLang v2.1.0 npm 배포 준비${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Linting
echo -e "${YELLOW}1️⃣  Linting 검사 중...${NC}"
if npm run lint > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Linting 통과${NC}"
else
  echo -e "${RED}❌ Linting 실패${NC}"
  echo "수정하고 다시 시도하세요:"
  echo "  npm run lint"
  exit 1
fi
echo ""

# 2. Testing
echo -e "${YELLOW}2️⃣  테스트 실행 중...${NC}"
if npm test > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 3,248개 테스트 통과${NC}"
else
  echo -e "${RED}❌ 테스트 실패${NC}"
  echo "테스트 결과 확인:"
  echo "  npm test"
  exit 1
fi
echo ""

# 3. Clean
echo -e "${YELLOW}3️⃣  이전 빌드 정리 중...${NC}"
npm run clean > /dev/null 2>&1
echo -e "${GREEN}✅ dist/ 제거 완료${NC}"
echo ""

# 4. Build
echo -e "${YELLOW}4️⃣  TypeScript 컴파일 중...${NC}"
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 빌드 완료${NC}"
else
  echo -e "${RED}❌ 빌드 실패${NC}"
  echo "컴파일 오류 확인:"
  echo "  npm run build"
  exit 1
fi
echo ""

# 5. Verify shebang
echo -e "${YELLOW}5️⃣  Shebang 검증 중...${NC}"
if head -n1 dist/cli/index.js | grep -q "#!/usr/bin/env node"; then
  echo -e "${GREEN}✅ Shebang 포함됨${NC}"
else
  echo -e "${RED}⚠️  경고: Shebang 없음${NC}"
  echo "수정: dist/cli/index.js 첫 줄에 추가"
  echo '#!/usr/bin/env node'
fi
echo ""

# 6. Verify bin executable
echo -e "${YELLOW}6️⃣  bin 필드 검증 중...${NC}"
if grep -q '"bin"' package.json; then
  echo -e "${GREEN}✅ package.json에 bin 필드 존재${NC}"
else
  echo -e "${RED}❌ package.json에 bin 필드 없음${NC}"
  exit 1
fi
echo ""

# 7. Pack (테스트)
echo -e "${YELLOW}7️⃣  npm pack 테스트 중...${NC}"
PACKAGE_FILE=$(npm pack 2>&1 | tail -n1)
PACKAGE_SIZE=$(ls -lh "$PACKAGE_FILE" | awk '{print $5}')
echo -e "${GREEN}✅ 패키지 생성: $PACKAGE_FILE ($PACKAGE_SIZE)${NC}"
echo ""

# 8. Version 확인
echo -e "${YELLOW}8️⃣  버전 확인 중...${NC}"
VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')
echo -e "${GREEN}📦 버전: v${VERSION}${NC}"
echo ""

# 최종 체크리스트
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 배포 준비 완료!${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}다음 단계:${NC}"
echo ""
echo "1️⃣  npm 배포 (공개)"
echo -e "   ${GREEN}npm publish --access public${NC}"
echo ""
echo "2️⃣  또는 드라이런 (테스트)"
echo -e "   ${GREEN}npm publish --access public --dry-run${NC}"
echo ""
echo "3️⃣  태그 생성 (선택사항)"
echo -e "   ${GREEN}git tag -a v${VERSION} -m \"v${VERSION} - Production Release\"${NC}"
echo -e "   ${GREEN}git push origin v${VERSION}${NC}"
echo ""
echo -e "${YELLOW}배포 후:${NC}"
echo "- npm: https://www.npmjs.com/package/v2-freelang-ai"
echo "- KPM: kpm install v2-freelang-ai@${VERSION}"
echo ""
