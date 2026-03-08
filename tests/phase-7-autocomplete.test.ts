/**
 * Phase 7: Auto-completion Database Tests
 *
 * 자동완성 제안, 학습, 순위 알고리즘 검증
 */

import { AutocompleteDB, autocompleteDB } from '../src/engine/autocomplete-db';

describe('Phase 7: Auto-completion Database', () => {
  // ============================================================================
  // 1️⃣ 기본 패턴 초기화
  // ============================================================================
  describe('기본 패턴', () => {
    test('30개 기본 패턴 로드', () => {
      const db = new AutocompleteDB();
      const items = db.getAll();
      expect(items.length).toBe(30);
    });

    test('각 패턴에 필수 필드 있음', () => {
      const db = new AutocompleteDB();
      const items = db.getAll();
      items.forEach(item => {
        expect(item.id).toBeDefined();
        expect(item.type).toBeDefined();
        expect(item.category).toBeDefined();
        expect(item.pattern).toBeDefined();
        expect(item.signature).toBeDefined();
        expect(item.confidence).toBeGreaterThan(0.5);
      });
    });

    test('카테고리 분류 정확함', () => {
      const db = new AutocompleteDB();
      const categories = new Set(db.getAll().map(i => i.category));
      expect(categories.size).toBe(4); // aggregation, filtering, transformation, advanced
      expect(categories.has('aggregation')).toBe(true);
      expect(categories.has('filtering')).toBe(true);
      expect(categories.has('transformation')).toBe(true);
      expect(categories.has('advanced')).toBe(true);
    });
  });

  // ============================================================================
  // 2️⃣ 검색 기능
  // ============================================================================
  describe('검색 (Search)', () => {
    let db: AutocompleteDB;
    beforeEach(() => {
      db = new AutocompleteDB();
    });

    test('정확한 프리픽스 매칭', () => {
      const result = db.search({ prefix: 'sum' });
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0].id).toBe('sum');
    });

    test('부분 매칭', () => {
      const result = db.search({ prefix: 'so' });
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.some(i => i.id === 'sort')).toBe(true);
    });

    test('설명으로 검색', () => {
      const result = db.search({ prefix: '배' });
      expect(result.items.length).toBeGreaterThan(0);
      // 배열 관련 함수들이 검색되어야 함
    });

    test('예제로 검색', () => {
      const result = db.search({ prefix: 'total' });
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.some(i => i.id === 'sum')).toBe(true);
    });

    test('카테고리 필터링', () => {
      const result = db.search({ prefix: '', context: 'aggregation' });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach(item => {
        expect(item.category).toBe('aggregation');
      });
    });

    test('결과 제한 (limit)', () => {
      const result = db.search({ prefix: '', limit: 5 });
      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    test('검색 성능 < 1ms', () => {
      const result = db.search({ prefix: 'sum' });
      expect(result.execution_time_ms).toBeLessThan(1);
    });
  });

  // ============================================================================
  // 3️⃣ 순위 알고리즘
  // ============================================================================
  describe('순위 알고리즘 (Ranking)', () => {
    let db: AutocompleteDB;
    beforeEach(() => {
      db = new AutocompleteDB();
    });

    test('신뢰도 높은 것부터 표시', () => {
      const result = db.search({ prefix: '', limit: 30 });
      for (let i = 0; i < result.items.length - 1; i++) {
        expect(result.items[i].confidence).toBeGreaterThanOrEqual(
          result.items[i + 1].confidence
        );
      }
    });

    test('사용 횟수 반영됨', () => {
      // sum 사용 10회 기록
      for (let i = 0; i < 10; i++) {
        db.recordUsage('sum', true);
      }

      // avg 사용 1회 기록
      db.recordUsage('average', true);

      const result = db.search({ prefix: '' });
      const sumIdx = result.items.findIndex(i => i.id === 'sum');
      const avgIdx = result.items.findIndex(i => i.id === 'average');

      // sum이 average보다 앞에 올 가능성 높음
      expect(sumIdx).toBeLessThan(avgIdx);
    });

    test('최근 사용 우선', () => {
      db.recordUsage('max', true);
      db.recordUsage('max', true);
      db.recordUsage('max', true);

      const result = db.search({ prefix: '' });
      const maxIdx = result.items.findIndex(i => i.id === 'max');

      // max가 상위에 올 가능성 높음
      expect(maxIdx).toBeLessThan(10);
    });
  });

  // ============================================================================
  // 4️⃣ 학습 (Feedback)
  // ============================================================================
  describe('학습 (Learning)', () => {
    let db: AutocompleteDB;
    beforeEach(() => {
      db = new AutocompleteDB();
    });

    test('승인으로 신뢰도 증가', () => {
      const before = db.getAll().find(i => i.id === 'sum')!.confidence;
      db.recordUsage('sum', true);
      const after = db.getAll().find(i => i.id === 'sum')!.confidence;
      expect(after).toBeGreaterThan(before);
    });

    test('거부로 신뢰도 감소', () => {
      const before = db.getAll().find(i => i.id === 'sum')!.confidence;
      db.recordUsage('sum', false);
      const after = db.getAll().find(i => i.id === 'sum')!.confidence;
      expect(after).toBeLessThan(before);
    });

    test('신뢰도 범위 유지 (0.5 ~ 0.98)', () => {
      const item = db.getAll().find(i => i.id === 'sum')!;

      // 거부 10회
      for (let i = 0; i < 10; i++) {
        db.recordUsage('sum', false);
      }

      let updated = db.getAll().find(i => i.id === 'sum')!;
      expect(updated.confidence).toBeGreaterThanOrEqual(0.5);

      // 승인 100회
      for (let i = 0; i < 100; i++) {
        db.recordUsage('sum', true);
      }

      updated = db.getAll().find(i => i.id === 'sum')!;
      expect(updated.confidence).toBeLessThanOrEqual(0.98);
    });

    test('승인율 추적', () => {
      db.recordUsage('sum', true);
      db.recordUsage('sum', true);
      db.recordUsage('sum', false);

      const item = db.getAll().find(i => i.id === 'sum')!;
      expect(item.approval_rate).toBeCloseTo(2/3, 1);
    });

    test('사용 횟수 증가', () => {
      const before = db.getAll().find(i => i.id === 'sum')!.usage_count;
      db.recordUsage('sum', true);
      const after = db.getAll().find(i => i.id === 'sum')!.usage_count;
      expect(after).toBe(before + 1);
    });

    test('마지막 사용 시간 업데이트', () => {
      const before = db.getAll().find(i => i.id === 'sum')!.last_used;
      db.recordUsage('sum', true);
      const after = db.getAll().find(i => i.id === 'sum')!.last_used;

      expect(before).toBeNull();
      expect(after).not.toBeNull();
      expect(after!.getTime()).toBeGreaterThan(before?.getTime() ?? 0);
    });
  });

  // ============================================================================
  // 5️⃣ 카테고리 조회
  // ============================================================================
  describe('카테고리 조회', () => {
    let db: AutocompleteDB;
    beforeEach(() => {
      db = new AutocompleteDB();
    });

    test('aggregation 카테고리', () => {
      const items = db.getByCategory('aggregation');
      expect(items.length).toBe(8);
    });

    test('filtering 카테고리', () => {
      const items = db.getByCategory('filtering');
      expect(items.length).toBe(10);
    });

    test('transformation 카테고리', () => {
      const items = db.getByCategory('transformation');
      expect(items.length).toBe(7);
    });

    test('advanced 카테고리', () => {
      const items = db.getByCategory('advanced');
      expect(items.length).toBe(5);
    });
  });

  // ============================================================================
  // 6️⃣ 상위 N개 조회
  // ============================================================================
  describe('상위 N개 (TopN)', () => {
    let db: AutocompleteDB;
    beforeEach(() => {
      db = new AutocompleteDB();
    });

    test('상위 10개 신뢰도 순서', () => {
      const items = db.getTopN(10);
      expect(items.length).toBe(10);
      for (let i = 0; i < items.length - 1; i++) {
        expect(items[i].confidence).toBeGreaterThanOrEqual(items[i + 1].confidence);
      }
    });

    test('상위 5개', () => {
      const items = db.getTopN(5);
      expect(items.length).toBe(5);
    });

    test('전체보다 많은 개수 요청', () => {
      const items = db.getTopN(100);
      expect(items.length).toBe(30);
    });
  });

  // ============================================================================
  // 7️⃣ 통계
  // ============================================================================
  describe('통계 (Stats)', () => {
    let db: AutocompleteDB;
    beforeEach(() => {
      db = new AutocompleteDB();
    });

    test('초기 통계', () => {
      const stats = db.getStats();
      expect(stats.total_patterns).toBe(30);
      expect(stats.total_usage).toBe(0);
      expect(stats.avg_confidence).toBeGreaterThan(0.7);
      expect(stats.categories.length).toBe(4);
    });

    test('사용 후 통계 변화', () => {
      db.recordUsage('sum', true);
      db.recordUsage('sum', true);
      db.recordUsage('filter', true);

      const stats = db.getStats();
      expect(stats.total_usage).toBe(3);
      expect(stats.avg_confidence).toBeGreaterThan(0.7);
    });
  });

  // ============================================================================
  // 8️⃣ 싱글톤 검증
  // ============================================================================
  describe('싱글톤 (Singleton)', () => {
    test('전역 인스턴스 사용 가능', () => {
      const result = autocompleteDB.search({ prefix: 'sum' });
      expect(result.items.length).toBeGreaterThan(0);
    });

    test('상태 유지', () => {
      const before = autocompleteDB.getAll().find(i => i.id === 'sum')!.usage_count;
      autocompleteDB.recordUsage('sum', true);
      const after = autocompleteDB.getAll().find(i => i.id === 'sum')!.usage_count;
      expect(after).toBe(before + 1);
    });
  });
});
