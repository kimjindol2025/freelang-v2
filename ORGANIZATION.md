# freelang-io 조직 구조

## 📦 저장소 구성

### 1. **freelang-compiler** (메인)
```
현 위치: v2-freelang-ai
→ 이름 변경: freelang-compiler

내용:
- 컴파일러 코어
- VM/런타임
- 표준 라이브러리 (1,340+ 함수)
- CLI 도구
```

### 2. **freelang-docs** (신규)
```
구조:
docs/
├── guide/          # 학습 가이드
├── reference/      # API 레퍼런스
├── examples/       # 코드 예제
├── contributing/   # 기여 가이드
└── community/      # 커뮤니티 규칙
```

### 3. **freelang-playground** (신규)
```
온라인 에디터 (Web)
- Monaco Editor (VS Code 기반)
- 웹어셈블리 컴파일러
- 실시간 결과 표시
- 공유 가능한 스니펫

기술스택: React + TypeScript + WebAssembly
```

### 4. **freelang-examples** (신규)
```
공식 예제 모음:
examples/
├── beginner/       # 초보자 (Hello World, 변수, 함수)
├── intermediate/   # 중급 (비동기, DB, 네트워크)
├── advanced/       # 고급 (컴파일러 확장, 최적화)
└── real-world/     # 실무 (웹서버, API, 게임)
```

### 5. **freelang-community** (신규)
```
커뮤니티 중앙
- Discussion 아카이브
- 블로그 (Weekly Updates)
- 이벤트 캘린더
- 스폰서/기여자 목록
```

---

## 🎯 마일스톤 (2026)

### Q1 (지금)
- [x] GitHub 조직 구성
- [x] 거버넌스/행동강령 작성
- [ ] 공식 웹사이트 (freelang.io)
- [ ] npm 배포 준비

### Q2
- [ ] v3.0.0 RC 릴리즈
- [ ] 온라인 플레이그라운드 런칭
- [ ] 공식 튜토리얼 출시
- [ ] 기업 후원 시작

### Q3
- [ ] v3.0.0 정식 릴리즈
- [ ] VS Code 익스텐션
- [ ] 1,000+ GitHub Stars 달성
- [ ] 언어 번역 (7개국)

### Q4
- [ ] 기업 후원 프로그램
- [ ] 주요 기술 컨퍼런스 발표
- [ ] 재단 설립 검토
- [ ] v3.1.0 계획

---

## 👥 팀 구성안

| 역할 | 담당자 | 책임 |
|------|--------|------|
| **Founder/CEO** | kim | 전략, 커뮤니티 |
| **Tech Lead** | kim | 컴파일러, 아키텍처 |
| **Docs Lead** | TBD | 문서화, 튜토리얼 |
| **Community Lead** | TBD | 커뮤니티, 이벤트 |

---

## 🔗 커뮤니티 채널

```
공식 사이트: freelang.io
GitHub: github.com/freelang-io
Discord: discord.gg/freelang
Twitter: @freelang_io
YouTube: FreeLang Official
Reddit: r/freelang
```

---

## 📊 성공 지표

```
2026년 목표:
- GitHub Stars: 5,000+
- npm 주간 다운로드: 10,000+
- Discord 멤버: 1,000+
- 기여자: 50+
- 커뮤니티 프로젝트: 100+
```

---

**최종 업데이트**: 2026-03-08
