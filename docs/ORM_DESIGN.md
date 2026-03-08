# FreeLang ORM 설계 문서

**목표**: SQLite/MySQL 데이터베이스를 프로그래밍 방식으로 조작
**상태**: 설계 단계
**버전**: 1.0 (Phase B)

---

## 🎯 핵심 목표

Express 기반 웹 서버에서 데이터베이스를 쉽게 다루기 위해:

1. **쿼리 빌더**: 타입 안전한 쿼리 생성
2. **마이그레이션**: 스키마 버전 관리
3. **관계 관리**: 테이블 간 연관 관계 표현
4. **트랜잭션**: 원자성 보장
5. **성능**: 인덱스 및 배치 처리

---

## 📊 아키텍처

```
┌─────────────────────────────────────┐
│   Application Code                  │
│   (rest-api-server.fl)              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   ORM Layer (orm.fl)                │
│  ├── Connection Manager             │
│  ├── Query Builder                  │
│  ├── Model System                   │
│  └── Migration Engine               │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Database Drivers                  │
│  ├── SQLite Native (sqlite-native)  │
│  └── MySQL Async (fetch-based)      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Database                          │
│  ├── SQLite File (local)            │
│  └── MySQL Server (remote)          │
└─────────────────────────────────────┘
```

---

## 🔧 Core API

### 1. 데이터베이스 연결

```freelang
// SQLite 연결
let db = sqlite.open("./data.db")

// MySQL 연결
let db = mysql.connect({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "secret",
  database: "myapp"
})

// 연결 테스트
if !db.ping() {
  println("Connection failed")
}
```

### 2. 모델 정의

```freelang
// User 모델
struct User {
  id: int,
  email: string,
  name: string,
  age: int,
  createdAt: string,
  updatedAt: string
}

// Post 모델
struct Post {
  id: int,
  userId: int,        // Foreign Key → User.id
  title: string,
  content: string,
  published: bool,
  createdAt: string
}
```

### 3. 쿼리 빌더

#### SELECT

```freelang
// 모든 사용자 조회
let users = db.select("users").all()

// 특정 필드만 조회
let names = db.select("users").columns(["id", "name"]).all()

// WHERE 조건
let activeUsers = db.select("users")
  .where("age > ?", 18)
  .where("status = ?", "active")
  .all()

// 정렬 및 제한
let topUsers = db.select("users")
  .order_by("score DESC")
  .limit(10)
  .all()

// JOIN
let posts = db.select("posts")
  .join("users", "posts.userId = users.id")
  .where("users.role = ?", "admin")
  .all()

// 단일 행
let user = db.select("users").where("id = ?", 1).first()

// COUNT
let count = db.select("users").where("age > ?", 18).count()

// GROUP BY
let stats = db.select("posts")
  .group_by("userId")
  .select_count("*", "total")
  .all()
```

#### INSERT

```freelang
// 단일 삽입
let user = {
  email: "alice@example.com",
  name: "Alice",
  age: 25
}
db.insert("users", user)

// 반환값 (ID 포함)
let result = db.insert("users", user)
let userId = result.insertedId
```

#### UPDATE

```freelang
// 조건부 업데이트
db.update("users", { name: "Bob" }).where("id = ?", 1)

// 다중 업데이트
db.update("users", { status: "inactive" })
  .where("lastLogin < ?", "2026-01-01")
```

#### DELETE

```freelang
// 삭제
db.delete("users").where("id = ?", 1)

// 다중 삭제
db.delete("users").where("age < ?", 18)
```

#### 트랜잭션

```freelang
db.transaction(fn() {
  // 두 작업이 원자적으로 실행됨
  db.insert("users", { name: "Alice", email: "alice@example.com" })
  db.insert("logs", { message: "User created" })
  // 오류 발생 시 모두 롤백
})

// 또는
let tx = db.begin_transaction()
try {
  tx.insert("users", { ... })
  tx.insert("logs", { ... })
  tx.commit()
} catch err {
  tx.rollback()
}
```

### 4. 마이그레이션

```freelang
// migration/001_create_users.fl
import { createTable, addColumn } from "./orm"

export fn up(db) {
  db.create_table("users", fn(table) {
    table.id()                     // AUTO INCREMENT
    table.string("email")          // VARCHAR(255) NOT NULL UNIQUE
    table.string("name", 100)      // VARCHAR(100)
    table.integer("age")
    table.boolean("active", true)  // Default true
    table.timestamps()             // createdAt, updatedAt
  })
}

export fn down(db) {
  db.drop_table("users")
}

// 마이그레이션 실행
db.migrate("./migrations")

// 마이그레이션 상태 확인
db.migrations_status()
```

### 5. 관계 관리

```freelang
// User has many Posts
struct User {
  id: int,
  name: string,
  posts: Post[]  // 관계 필드
}

// Post belongs to User
struct Post {
  id: int,
  userId: int,
  title: string,
  user: User     // 관계 필드
}

// 쿼리에서 관계 로드
let user = db.select("users")
  .with_posts()     // JOIN posts
  .where("id = ?", 1)
  .first()

println(user.name)           // "Alice"
println(user.posts.length)   // 3

// 역 관계
let post = db.select("posts")
  .with_user()      // JOIN users
  .where("id = ?", 5)
  .first()

println(post.title)           // "My First Post"
println(post.user.name)       // "Alice"
```

---

## 📋 구현 계획

### 1단계: 기본 쿼리 빌더 (1주)
```
✓ SELECT / INSERT / UPDATE / DELETE
✓ WHERE 조건 + 파라미터 바인딩
✓ JOIN 기본 지원
✓ 결과 매핑
```

### 2단계: SQLite 드라이버 (3일)
```
✓ sqlite-native.ts 활용
✓ 동기 쿼리 실행
✓ 트랜잭션
✓ 마이그레이션 저장소
```

### 3단계: MySQL 드라이버 (3일)
```
✓ TCP 기반 MySQL 프로토콜 (fetch 래핑)
✓ 연결 풀
✓ 비동기 쿼리
```

### 4단계: 마이그레이션 엔진 (3일)
```
✓ 스키마 버전 관리
✓ UP / DOWN 함수 지원
✓ 상태 추적
```

### 5단계: 관계 관리 (3일)
```
✓ hasMany / belongsTo
✓ with_related() 로드
✓ 관계 쿼리
```

---

## 🗂️ 파일 구조

```
src/stdlib/
├── orm.fl                    # 메인 ORM 인터페이스
├── orm/
│   ├── query-builder.fl      # SELECT/INSERT/UPDATE/DELETE
│   ├── connection.fl         # 데이터베이스 연결 추상화
│   ├── transaction.fl        # 트랜잭션 관리
│   └── migration.fl          # 마이그레이션 엔진
├── drivers/
│   ├── sqlite-driver.fl      # SQLite 특화 구현
│   └── mysql-driver.fl       # MySQL 특화 구현
└── relationships/
    ├── has-many.fl
    └── belongs-to.fl

examples/
├── orm-basic.fl              # 기본 CRUD 예제
├── orm-relationships.fl       # 관계 예제
└── orm-transactions.fl        # 트랜잭션 예제

tests/
├── test-orm-builder.fl        # 쿼리 빌더 테스트
├── test-orm-sqlite.fl         # SQLite 테스트
└── test-orm-relationships.fl   # 관계 테스트

migrations/
├── 001_create_users.fl
└── 002_create_posts.fl
```

---

## 💡 설계 결정 사항

### 1. 쿼리 빌더 vs ORM
**선택**: 하이브리드 접근
- 기본은 쿼리 빌더 (성능, 유연성)
- 관계 부분은 ORM 스타일 (편의성)

### 2. 스키마 마이그레이션
**선택**: Fluent 마이그레이션 스타일
```freelang
table.string("email")  # instead of raw SQL
table.timestamps()     # convenience
```

### 3. 비동기 처리
**선택**: 동기 우선 (FreeLang은 비동기가 미성숙)
- SQLite: 동기 (파일 기반)
- MySQL: fetch로 래핑된 의사-비동기

### 4. 파라미터 바인딩
**선택**: `?` placeholder 사용
```freelang
db.select("users").where("id = ?", 1)  # SQL Injection 방지
```

---

## 📝 예제 (최종 형태)

```freelang
import { open } from "./stdlib/orm"

// 데이터베이스 연결
let db = open("./app.db")

// 마이그레이션 실행
db.migrate("./migrations")

// 모델 정의
struct User {
  id: int,
  email: string,
  name: string,
  posts: Post[]
}

struct Post {
  id: int,
  userId: int,
  title: string,
  user: User
}

// 쿼리 실행
fn main() {
  // 사용자 생성
  let userId = db.insert("users", {
    email: "alice@example.com",
    name: "Alice"
  }).insertedId

  // 게시물 추가
  db.insert("posts", {
    userId: userId,
    title: "My First Post"
  })

  // 조회 (관계 로드)
  let user = db.select("users")
    .with("posts")
    .where("id = ?", userId)
    .first()

  println(user.name)      // "Alice"
  println(user.posts.length)  // 1

  // 복잡한 쿼리
  let activePosts = db.select("posts")
    .join("users", "posts.userId = users.id")
    .where("users.active = ?", true)
    .order_by("posts.createdAt DESC")
    .limit(10)
    .all()

  // 트랜잭션
  db.transaction(fn() {
    db.update("users", { lastLogin: now() })
      .where("id = ?", userId)
    db.insert("logs", { message: "User logged in" })
  })
}

main()
```

---

## ✅ 성공 기준

- [x] 설계 문서 작성
- [ ] 기본 쿼리 빌더 구현
- [ ] SQLite 드라이버
- [ ] MySQL 드라이버
- [ ] 마이그레이션 엔진
- [ ] 관계 시스템
- [ ] 10개 이상 예제 및 테스트

---

**목표 완료일**: 2026-03-13 (1주)
**현재 상태**: 설계 완료 → 구현 시작
