#!/bin/bash

echo "🔥 적극적 보안 패치 (sprintf 중점)"

# metrics.c에서 sprintf 패턴 확인
echo "metrics.c 분석:"
grep -n "sprintf" metrics.c | head -5

# 전역 치환: sprintf(...) 형태를 snprintf로 변환
# 주의: 이건 다소 위험하지만, 필요한 경우
for file in *.c; do
    # 패턴 1: sprintf(var, "literal", args)
    perl -i -pe 's/sprintf\(\s*(\w+)\s*,\s*"([^"]*)"/snprintf($1, sizeof($1), "$2"/g' "$file"
    
    # 패턴 2: sprintf(var, fmt_var, args)  
    perl -i -pe 's/sprintf\(\s*(\w+)\s*,\s*(\w+)/snprintf($1, sizeof($1), $2/g' "$file"
done

echo ""
echo "✅ 글로벌 패턴 교체 완료"
echo ""

# 남은 unsafe 함수 개수 세기
TOTAL_STRCPY=$(grep -r "strcpy(" *.c | wc -l)
TOTAL_STRCAT=$(grep -r "strcat(" *.c | wc -l)
TOTAL_SPRINTF=$(grep -r "sprintf(" *.c | wc -l)

echo "남은 unsafe 함수:"
echo "  strcpy: $TOTAL_STRCPY"
echo "  strcat: $TOTAL_STRCAT"
echo "  sprintf: $TOTAL_SPRINTF"
echo "  합계: $((TOTAL_STRCPY + TOTAL_STRCAT + TOTAL_SPRINTF))"

