#!/usr/bin/env python3
import re
import os
import glob

def safe_replace_strcpy(content):
    """strcpy 안전한 대체"""
    # strcpy(dst, src) → strncpy(dst, src, MAX_SIZE) + null 종료
    patterns = [
        # strcpy with char array
        (r'strcpy\((\w+), "([^"]*)"\)', 
         r'strncpy(\1, "\2", sizeof(\1)-1); \1[sizeof(\1)-1] = \'\\0\''),
        # strcpy with malloc'd string (변수)
        (r'strcpy\((\w+), (\w+)\)',
         r'if(snprintf(\1, sizeof(\1), "%s", \2) < 0) return -1;'),
    ]
    
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)
    return content

def safe_replace_sprintf(content):
    """sprintf → snprintf"""
    # sprintf(buf, fmt, ...) → snprintf(buf, sizeof(buf), fmt, ...)
    content = re.sub(
        r'sprintf\((\w+), ([^)]+)\)',
        r'snprintf(\1, sizeof(\1), \2)',
        content
    )
    return content

def safe_replace_strcat(content):
    """strcat → strncat"""
    # strcat(dst, src) → strncat(dst, src, remaining_space)
    # 이건 복잡하므로 일단 표시만
    content = re.sub(
        r'strcat\((\w+), "([^"]*)"\)',
        r'strncat(\1, "\2", sizeof(\1)-strlen(\1)-1)',
        content
    )
    return content

# 모든 .c 파일 처리
files_fixed = 0
total_unsafe = 0

for filepath in sorted(glob.glob("*.c")):
    with open(filepath, 'r') as f:
        original = f.read()
    
    # 변환 전 unsafe 함수 개수
    unsafe_before = (
        original.count('strcpy(') + 
        original.count('strcat(') + 
        original.count('sprintf(')
    )
    
    if unsafe_before == 0:
        continue
    
    modified = original
    modified = safe_replace_strcpy(modified)
    modified = safe_replace_sprintf(modified)
    modified = safe_replace_strcat(modified)
    
    # 변환 후 unsafe 함수 개수
    unsafe_after = (
        modified.count('strcpy(') + 
        modified.count('strcat(') + 
        modified.count('sprintf(')
    )
    
    if modified != original:
        with open(filepath, 'w') as f:
            f.write(modified)
        
        fixed = unsafe_before - unsafe_after
        files_fixed += 1
        total_unsafe += fixed
        
        print(f"✓ {filepath:20} → {fixed:3} 개 교체 ({unsafe_after} 개 남음)")

print(f"\n✅ 총 {files_fixed}개 파일 수정, {total_unsafe}개 unsafe 함수 제거")

