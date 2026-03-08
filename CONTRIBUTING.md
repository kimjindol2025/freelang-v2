# FreeLang에 기여하기

FreeLang 커뮤니티에 참여해주셔서 감사합니다! 🙏

## 🚀 시작하기

### 환경 설정

```bash
# 저장소 포크
git clone https://github.com/YOUR-USERNAME/freelang-compiler.git
cd freelang-compiler

# 의존성 설치
npm install

# 개발 브랜치 생성
git checkout -b feature/your-feature-name
```

### 빌드 및 테스트

```bash
# TypeScript 컴파일
npm run build

# 전체 테스트 실행
npm test

# 특정 테스트만 실행
npm test -- --grep "Native-Linter"
```

---

## 📝 기여 가이드

### 1. Issue 확인

기여하기 전에:
- 비슷한 이슈가 있는지 확인
- `good-first-issue` 라벨로 시작하기 좋음

### 2. PR 작성

```markdown
## 설명
이 PR이 무엇을 해결하는가?

## 변경 내용
- [ ] 버그 수정
- [ ] 새 기능
- [ ] 문서 개선
- [ ] 리팩토링

## 테스트 결과
```bash
npm test
# ✅ All tests passed
```

## 체크리스트
- [ ] 코드가 컴파일됨
- [ ] 테스트 통과 (176/176)
- [ ] 문서 업데이트됨
- [ ] 린트 통과 (`npm run lint`)
```

### 3. 커밋 메시지

```
feat: 새 기능 추가 (Native-Expect 확장)
fix: 버그 수정 (Parser 메모리 누수)
docs: 문서 업데이트
refactor: 코드 정리
test: 테스트 추가
chore: 빌드/배포 설정
```

---

## 🎯 기여 대상

### 높은 우선순위
- [ ] 성능 최적화 (IR 생성 속도)
- [ ] 새 빌트인 함수 (1,340+ → 2,000+)
- [ ] 문서 번역 (한국어 → 영어/중국어)
- [ ] 예제 코드 확충

### 낮은 우선순위
- [ ] 마이너 버그 수정
- [ ] 포매팅/스타일
- [ ] 오타 수정

---

## 📚 코드 컨벤션

### TypeScript
```typescript
// ✅ Good
interface LintConfig {
  no_unused: 'error' | 'warn' | 'off';
  strict_pointers: boolean;
}

// ❌ Bad
interface LintConfig {
  noUnused: string;
}
```

### FreeLang
```free
// ✅ Good: 명확한 타입 선언
fn calculate(x: i64, y: i64) -> i64 {
  return x + y
}

// ❌ Bad: 타입 생략
fn calculate(x, y) {
  return x + y
}
```

---

## 🤝 행동 강령

- 존중하는 커뮤니티 유지
- 차별·폭력 용어 금지
- 건설적인 피드백만
- 다양성 환영

위반 시: [conduct@freelang.io](mailto:conduct@freelang.io)

---

## 📞 질문?

- **Discord**: https://discord.gg/freelang
- **Discussions**: https://github.com/freelang-io/freelang-compiler/discussions
- **이메일**: hello@freelang.io

---

**Happy Coding!** 🎉
