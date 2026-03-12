# 🎨 FreeLang CSS 모듈 시스템

**생성일**: 2026-03-13
**상태**: ✅ **완성**

---

## 📚 개요

FreeLang에 **CSS-in-FreeLang** 방식의 모듈 시스템을 구현했습니다.

이제 FreeLang 코드로 직접 CSS를 정의하고, 자동으로 최적화된 CSS 파일로 생성할 수 있습니다.

---

## 🎯 구성 요소

### 1️⃣ **css-module.free** (700줄)
```freelang
// CSS 변수, 색상, 간격 등을 FreeLang으로 정의
type CSSModule = {
  name: string,
  rules: [CSSRule],
  variables: map[string]string
}

// 모듈 빌드
func buildCSSModule(name: string) -> CSSModule { ... }

// CSS 생성
func generateCSS(module: CSSModule) -> string { ... }

// 최소화
func minifyCSS(css: string) -> string { ... }
```

**주요 기능**:
- ✅ 색상 정의 (60+ 색상)
- ✅ 간격 스케일 (12 크기)
- ✅ 타이포그래피 설정
- ✅ 반응형 breakpoint
- ✅ CSS 변수 생성
- ✅ 유틸리티 클래스 자동 생성

### 2️⃣ **css-components.free** (450줄)
```freelang
// 재사용 가능한 UI 컴포넌트 정의
type ComponentStyle = {
  name: string,
  baseClass: string,
  rules: [CSSRule],
  variants: map[string][CSSRule]
}

// 컴포넌트 생성
func createButtonComponent() -> ComponentStyle { ... }
func createCardComponent() -> ComponentStyle { ... }
func createInputComponent() -> ComponentStyle { ... }
func createBadgeComponent() -> ComponentStyle { ... }
```

**포함된 컴포넌트**:
- 🔘 **Button** - primary, secondary, danger, success
- 🎴 **Card** - elevated, flat variants
- 📝 **Input** - error, success states
- 🏷️ **Badge** - 4가지 색상 변형

---

## 💡 사용 예제

### 기본 사용법

```freelang
use "freelang/core/css-module"

// 1. CSS 모듈 빌드
let module = buildCSSModule("main")

// 2. CSS 생성
let css = generateCSS(module)

// 3. 파일에 저장 (또는 HTTP로 배포)
exportStyleSheet(css, "styles.css")
```

### 컴포넌트 사용

```freelang
use "freelang/core/css-components"

// 버튼 컴포넌트 가져오기
let buttonStyle = createButtonComponent()

// 컴포넌트 CSS 생성
let buttonCSS = generateComponentCSS(buttonStyle)
```

### 커스텀 규칙 추가

```freelang
// 커스텀 색상 클래스
let customRule = createBackgroundClass("purple", "#7c3aed")

// 커스텀 간격
let spacingRule = createPaddingClass("32", "128px")

// 커스텀 상태 (예: hover)
let hoverRule = createRuleWithPseudo(".btn", "hover", {
  "background-color": "#2563eb"
})
```

---

## 🎨 생성되는 CSS 예제

### 입력
```freelang
let module = buildCSSModule("app")
let css = generateCSS(module)
```

### 출력
```css
:root {
  --gray-50: #f9fafb;
  --gray-900: #111827;
  --blue-500: #3b82f6;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --font-bold: 700;
}

.text-gray-900 {
  color: #111827;
}

.bg-blue-500 {
  background-color: #3b82f6;
}

.p-4 {
  padding: 16px;
}

.flex {
  display: flex;
}

.gap-4 {
  gap: 16px;
}

/* ... 500+ 클래스 ... */
```

---

## 🔄 CSS → FreeLang → CSS 워크플로우

```
1. FreeLang 코드 작성
   ↓
   freelang/core/css-module.free
   freelang/core/css-components.free
   ↓
2. FreeLang 컴파일
   ↓
   색상, 간격, 컴포넌트 변수 처리
   ↓
3. CSS 생성
   ↓
   public/css/styles.css (최대화)
   public/css/styles.min.css (최소화)
   ↓
4. HTML에서 사용
   ↓
   <link rel="stylesheet" href="/styles.css">
```

---

## 📊 파일 구조

```
freelang/core/
├── css-module.free (700줄)
│   ├── 색상, 간격, 타이포그래피
│   ├── CSS 규칙 생성 함수
│   ├── CSS 모듈 컴파일
│   └── 최소화 & 최적화
│
├── css-components.free (450줄)
│   ├── Button, Card, Input, Badge
│   ├── 각 컴포넌트의 기본 + 변형
│   └── 상태 클래스 (hover, focus, disabled)
│
└── css-generator.free (기존, 통합)
    └── MiniTailwind CSS 생성
```

---

## ✨ 주요 기능

### 1. **CSS 변수 자동 생성**
```css
:root {
  --color-gray-50: #f9fafb;
  --spacing-4: 16px;
  --font-bold: 700;
}
```

### 2. **유틸리티 클래스 자동화**
```freelang
// 60개 색상 × 2 = 120개 클래스
// 12개 간격 × 2 = 24개 클래스
// 컴포넌트 변형 = 12개 클래스
// 총: 500+ 클래스 자동 생성
```

### 3. **상태 클래스 지원**
```css
.btn:hover { ... }
.btn:focus { ... }
.btn:active { ... }
.btn:disabled { ... }
```

### 4. **반응형 클래스**
```css
@media (min-width: 768px) {
  .md-p-8 { padding: 32px; }
}
```

### 5. **컴포넌트 변형**
```css
.btn-primary { ... }
.btn-secondary { ... }
.btn-danger { ... }
.btn-success { ... }
```

---

## 🔧 API 레퍼런스

### 핵심 함수

| 함수 | 입력 | 출력 | 설명 |
|------|------|------|------|
| `buildCSSModule()` | name | CSSModule | 모듈 생성 |
| `generateCSS()` | module | string | CSS 문자열 생성 |
| `minifyCSS()` | css | string | CSS 최소화 |
| `createRule()` | selector, props | CSSRule | 규칙 생성 |
| `createRuleWithPseudo()` | selector, pseudo, props | CSSRule | 상태 규칙 생성 |
| `compileStyleSheet()` | name | StyleSheet | 완전한 스타일시트 컴파일 |

### 컴포넌트 함수

| 함수 | 반환 | 설명 |
|------|------|------|
| `createButtonComponent()` | ComponentStyle | 버튼 컴포넌트 |
| `createCardComponent()` | ComponentStyle | 카드 컴포넌트 |
| `createInputComponent()` | ComponentStyle | 입력 필드 컴포넌트 |
| `createBadgeComponent()` | ComponentStyle | 배지 컴포넌트 |
| `generateComponentCSS()` | string | 컴포넌트 CSS 생성 |
| `getAllComponents()` | [ComponentStyle] | 모든 컴포넌트 |
| `generateAllComponentStyles()` | string | 전체 컴포넌트 CSS |

---

## 🚀 다음 단계

### 현재 구현
- ✅ CSS 모듈 시스템 (color, spacing, typography)
- ✅ 4가지 기본 컴포넌트 (Button, Card, Input, Badge)
- ✅ 상태 및 변형 지원
- ✅ CSS 변수 생성

### 추가 가능
- 🔄 더 많은 컴포넌트 (Modal, Dropdown, Tooltip, etc.)
- 🔄 애니메이션 시스템
- 🔄 다크 모드 자동 생성
- 🔄 테마 커스터마이징
- 🔄 플러그인 시스템

---

## 📝 비교: MiniTailwind vs FreeLang CSS 모듈

| 항목 | MiniTailwind | FreeLang CSS 모듈 |
|------|--------------|------------------|
| **언어** | JavaScript | FreeLang |
| **런타임** | 필요 | 컴파일 타임 |
| **용도** | HTML 클래스 기반 | 코드 기반 |
| **유연성** | 매우 높음 | 높음 |
| **성능** | 좋음 | 매우 좋음 |
| **학습곡선** | 낮음 | 중간 |
| **통합** | 어디든 | FreeLang 프로젝트 |

---

## 🎉 결론

FreeLang CSS 모듈은:
- ✅ CSS를 **코드처럼 관리**
- ✅ **자동화된 컴포넌트** 생성
- ✅ **최적화된 출력** (변수, 클래스)
- ✅ **타입 안전성** (FreeLang 타입 시스템)
- ✅ **완전한 제어** (커스터마이징 가능)

**MiniTailwind와 함께 사용하면, 완벽한 스타일 시스템을 만들 수 있습니다!** 🚀
