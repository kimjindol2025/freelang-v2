/**
 * FreeLang Production System - Phase 2: Database Layer
 * File-based CRUD operations with real persistence
 * Status: 완전한 블로그 데이터 관리 시스템
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// 데이터베이스 설정
// ============================================================================

const DB_DIR = path.join(__dirname, '../../db');
const BLOGS_FILE = path.join(DB_DIR, 'blogs.json');

// DB 디렉토리 초기화
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log('📁 데이터베이스 디렉토리 생성');
}

// ============================================================================
// 데이터 타입
// ============================================================================

/**
 * BlogRecord 타입
 * @typedef {Object} BlogRecord
 * @property {string} id - 블로그 고유 ID (UUID)
 * @property {string} title - 제목
 * @property {string} content - 내용
 * @property {string} author - 작성자
 * @property {string} createdAt - 생성 시간 (ISO 8601)
 * @property {string} updatedAt - 수정 시간 (ISO 8601)
 * @property {number} views - 조회수
 */

/**
 * DatabaseConnection 타입
 * @typedef {Object} DatabaseConnection
 * @property {string} status - 연결 상태 ('connected' | 'disconnected')
 * @property {string} path - 데이터베이스 파일 경로
 * @property {number} totalRecords - 총 레코드 수
 */

// ============================================================================
// 데이터베이스 연결
// ============================================================================

class Database {
  constructor() {
    this.blogs = [];
    this.connected = false;
    this.stats = {
      totalInserts: 0,
      totalUpdates: 0,
      totalDeletes: 0,
      totalQueries: 0,
    };
  }

  // 1️⃣ 데이터베이스 연결 (파일에서 데이터 로드)
  connect() {
    console.log('🔌 데이터베이스 연결 중...');

    try {
      if (fs.existsSync(BLOGS_FILE)) {
        const data = fs.readFileSync(BLOGS_FILE, 'utf-8');
        this.blogs = JSON.parse(data);
        console.log(`✅ 데이터베이스 연결됨 (${this.blogs.length}개 블로그)`);
      } else {
        this.blogs = [];
        this.saveToFile();
        console.log('✅ 새 데이터베이스 생성됨');
      }
      this.connected = true;
      return true;
    } catch (err) {
      console.error(`❌ 데이터베이스 연결 실패: ${err.message}`);
      return false;
    }
  }

  // 2️⃣ 블로그 생성 (INSERT)
  insertBlog(title, content, author) {
    if (!this.connected) {
      console.error('❌ 데이터베이스가 연결되지 않음');
      return null;
    }

    const id = this.generateId();
    const now = new Date().toISOString();

    const blog = {
      id,
      title,
      content,
      author,
      createdAt: now,
      updatedAt: now,
      views: 0
    };

    this.blogs.push(blog);
    this.stats.totalInserts++;
    this.saveToFile();

    console.log(`✅ 블로그 생성됨: ${id} (${title})`);
    return blog;
  }

  // 3️⃣ 블로그 조회 (SELECT by ID)
  getBlog(id) {
    if (!this.connected) return null;

    this.stats.totalQueries++;
    const blog = this.blogs.find(b => b.id === id);

    if (blog) {
      blog.views++;
      this.saveToFile();
      console.log(`✅ 블로그 조회: ${id} (조회수: ${blog.views})`);
    } else {
      console.log(`⚠️  블로그 없음: ${id}`);
    }

    return blog || null;
  }

  // 4️⃣ 모든 블로그 조회 (SELECT all)
  getAllBlogs() {
    if (!this.connected) return [];

    this.stats.totalQueries++;
    console.log(`✅ 모든 블로그 조회 (${this.blogs.length}개)`);

    return this.blogs.map(blog => ({
      ...blog,
      summary: blog.content.substring(0, 100) + '...'
    }));
  }

  // 5️⃣ 블로그 수정 (UPDATE)
  updateBlog(id, updates) {
    if (!this.connected) return null;

    const blog = this.blogs.find(b => b.id === id);

    if (!blog) {
      console.log(`⚠️  블로그 없음: ${id}`);
      return null;
    }

    const originalTitle = blog.title;
    blog.title = updates.title || blog.title;
    blog.content = updates.content || blog.content;
    blog.author = updates.author || blog.author;
    blog.updatedAt = new Date().toISOString();

    this.stats.totalUpdates++;
    this.saveToFile();

    console.log(`✅ 블로그 수정됨: ${id} (${originalTitle} → ${blog.title})`);
    return blog;
  }

  // 6️⃣ 블로그 삭제 (DELETE)
  deleteBlog(id) {
    if (!this.connected) return false;

    const index = this.blogs.findIndex(b => b.id === id);

    if (index === -1) {
      console.log(`⚠️  블로그 없음: ${id}`);
      return false;
    }

    const blog = this.blogs[index];
    this.blogs.splice(index, 1);
    this.stats.totalDeletes++;
    this.saveToFile();

    console.log(`✅ 블로그 삭제됨: ${id} (${blog.title})`);
    return true;
  }

  // 블로그 검색
  searchBlogs(query) {
    if (!this.connected) return [];

    return this.blogs.filter(blog =>
      blog.title.includes(query) ||
      blog.content.includes(query) ||
      blog.author.includes(query)
    );
  }

  // 연결 상태 조회
  getStatus() {
    return {
      status: this.connected ? 'connected' : 'disconnected',
      path: BLOGS_FILE,
      totalRecords: this.blogs.length,
      stats: this.stats
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private 메서드
  // ──────────────────────────────────────────────────────────────────────────

  saveToFile() {
    try {
      fs.writeFileSync(BLOGS_FILE, JSON.stringify(this.blogs, null, 2), 'utf-8');
    } catch (err) {
      console.error(`❌ 파일 저장 실패: ${err.message}`);
    }
  }

  generateId() {
    return crypto.randomBytes(8).toString('hex');
  }
}

// ============================================================================
// 싱글톤 인스턴스
// ============================================================================

const db = new Database();

// ============================================================================
// 공개 API
// ============================================================================

module.exports = {
  // 연결
  connect: () => db.connect(),

  // CRUD
  insertBlog: (title, content, author) => db.insertBlog(title, content, author),
  getBlog: (id) => db.getBlog(id),
  getAllBlogs: () => db.getAllBlogs(),
  updateBlog: (id, updates) => db.updateBlog(id, updates),
  deleteBlog: (id) => db.deleteBlog(id),

  // 검색 & 상태
  searchBlogs: (query) => db.searchBlogs(query),
  getStatus: () => db.getStatus(),

  // 초기 데이터 생성 (테스트용)
  seedData: () => {
    db.insertBlog(
      'Phase 1: HTTP 서버',
      'TCP 소켓을 이용한 실제 작동하는 HTTP 서버 구현',
      'FreeLang Team'
    );
    db.insertBlog(
      'Phase 2: 데이터베이스',
      'File-based CRUD 데이터베이스 시스템',
      'FreeLang Team'
    );
    db.insertBlog(
      'Phase 3: JWT 인증',
      'HMAC-SHA256 기반 토큰 인증',
      'FreeLang Team'
    );
    console.log('✅ 초기 데이터 생성됨');
  }
};
