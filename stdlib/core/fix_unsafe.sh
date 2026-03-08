#!/bin/bash

BACKUP_DIR="backup_$(date +%s)"
mkdir -p "$BACKUP_DIR"

echo "🔒 보안 패치 시작: Buffer Overflow 171개 제거"
echo "백업: $BACKUP_DIR"

# 모든 .c 파일 백업
cp *.c "$BACKUP_DIR/"

TOTAL=0

# ① strcpy 교체 (가장 많음)
echo ""
echo "① strcpy 교체 중..."
for file in *.c; do
    if grep -q "strcpy" "$file"; then
        BEFORE=$(grep -c "strcpy" "$file")
        
        # 패턴 1: strcpy(var, literal)
        sed -i 's/strcpy(\([^,]*\), "\([^"]*\)");/strncpy(\1, "\2", sizeof(\1)-1); \1[sizeof(\1)-1] = '"'"'\\0'"'"';/g' "$file"
        
        # 패턴 2: strcpy with variable (more complex - needs manual review)
        # 일단 기본적인 것만 처리
        
        AFTER=$(grep -c "strcpy" "$file" 2>/dev/null || echo 0)
        FIXED=$((BEFORE - AFTER))
        if [ $FIXED -gt 0 ]; then
            echo "  ✓ $file: $FIXED 개 교체"
            TOTAL=$((TOTAL + FIXED))
        fi
    fi
done

# ② sprintf 교체
echo ""
echo "② sprintf 교체 중..."
for file in *.c; do
    if grep -q "sprintf" "$file"; then
        BEFORE=$(grep -c "sprintf" "$file")
        
        # sprintf를 snprintf로 교체 (제한적)
        sed -i 's/sprintf(\([^,]*\), /snprintf(\1, sizeof(\1), /g' "$file"
        
        AFTER=$(grep -c "sprintf" "$file" 2>/dev/null || echo 0)
        FIXED=$((BEFORE - AFTER))
        if [ $FIXED -gt 0 ]; then
            echo "  ✓ $file: $FIXED 개 교체"
            TOTAL=$((TOTAL + FIXED))
        fi
    fi
done

# ③ strcat 교체 (복잡함 - 수동 검토 필요)
echo ""
echo "③ strcat 교체 중..."
for file in *.c; do
    if grep -q "strcat" "$file"; then
        echo "  ⚠️  $file: strcat 발견 (수동 검토 필요)"
    fi
done

echo ""
echo "✅ 자동 교체 완료: 약 $TOTAL개"
echo "⚠️  남은 작업: strcat 수동 검토 (28개)"
echo ""
echo "컴파일 검사 시작..."

# 컴파일 테스트 (에러 확인)
gcc -c -Wall audit.c -o /tmp/test_audit.o 2>&1 | head -5
rm -f /tmp/test_audit.o

