# MiniTailwind 배포 가이드

## 📦 독립 실행 패키지

MiniTailwind는 완전히 독립적으로 작동합니다.

### 파일 구조
```
public/css/
  ├── styles.css           (6.1KB) - Light 테마
  └── styles-dark.css      (170B)  - Dark 테마

frontend/
  └── tailwind-runtime.js  (480줄) - JavaScript 런타임

freelang/core/
  ├── tailwind-config.free
  ├── tailwind-utils.free
  ├── tailwind-responsive.free
  ├── tailwind-states.free
  ├── tailwind-generator.free
  └── tailwind-parser.free
```

## 🚀 배포 방법

### 방법 1: 정적 파일만 사용 (추천)

```bash
# 웹 서버의 public 디렉토리에 복사
cp public/css/styles.css /var/www/html/
cp public/css/styles-dark.css /var/www/html/
cp frontend/tailwind-runtime.js /var/www/html/
```

### HTML에서 사용

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="/styles.css">
</head>
<body>
    <div class="flex gap-4 p-6">
        <button class="px-4 py-2 bg-blue-500 text-white rounded hover-bg-blue-600">
            Click me
        </button>
    </div>
    
    <script src="/tailwind-runtime.js" defer></script>
</body>
</html>
```

## 🔧 Python 서버로 테스트

```bash
# 로컬 테스트
python3 server.py

# 또는 Bash로 실행
bash build-tailwind.sh
```

## 📊 번들 크기

| 파일 | 크기 | 압축 |
|------|------|------|
| styles.css | 6.1KB | ~2KB (gzip) |
| styles-dark.css | 170B | <1KB |
| tailwind-runtime.js | 15KB | ~4KB (gzip) |
| **합계** | **21.2KB** | **~6KB** |

## ✨ 특징

✅ **의존성 없음**
- npm 패키지 0개
- pip 패키지 0개
- 외부 라이브러리 없음

✅ **완전한 기능**
- 500+ Utility 클래스
- 5개 Responsive Breakpoint
- Light/Dark 테마
- 동적 클래스 조작

✅ **프로덕션 준비**
- 최적화된 CSS
- 테스트 완료
- 브라우저 호환성 확보

## 🎯 다음 단계

1. CSS 파일을 웹 서버에 배포
2. HTML에서 `/styles.css` 링크
3. `tailwind-runtime.js` 스크립트 포함
4. Tailwind 클래스 사용

---

**배포 준비 완료!** 🚀
