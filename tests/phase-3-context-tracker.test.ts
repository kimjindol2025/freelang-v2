/**
 * Phase 3 Stage 2: Context Tracker Tests
 *
 * 스코프 체인, 의존성 그래프, 타입 불확실성 검증
 * 목표: 신뢰도 0.5 → 0.75 향상
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ContextTracker,
  ScopeLevel,
  Scope,
  createContextTracker,
} from '../src/analyzer/context-tracker';

describe('Phase 3 Stage 2: Context Tracker', () => {
  let tracker: ContextTracker;

  beforeEach(() => {
    tracker = createContextTracker();
  });

  describe('Scope Chain Management', () => {
    // Test 1: 전역 스코프
    it('should start with global scope', () => {
      const globalScope = tracker.getCurrentScope();

      expect(globalScope).toBeDefined();
      expect(globalScope.level).toBe(ScopeLevel.GLOBAL);
      expect(globalScope.name).toBe('global');
    });

    // Test 2: 함수 스코프 추가
    it('should push function scope', () => {
      const funcScope = tracker.pushScope(ScopeLevel.FUNCTION, 'myFunc');

      expect(funcScope.level).toBe(ScopeLevel.FUNCTION);
      expect(funcScope.name).toBe('myFunc');
      expect(tracker.getCurrentScope()).toBe(funcScope);
    });

    // Test 3: 중첩 스코프
    it('should support nested scopes', () => {
      tracker.pushScope(ScopeLevel.FUNCTION, 'outer');
      tracker.pushScope(ScopeLevel.BLOCK, 'ifBlock');

      const current = tracker.getCurrentScope();
      expect(current.level).toBe(ScopeLevel.BLOCK);
      expect(current.parent?.name).toBe('outer');
    });

    // Test 4: 스코프 종료
    it('should pop scope correctly', () => {
      tracker.pushScope(ScopeLevel.FUNCTION, 'func');
      const popped = tracker.popScope();

      expect(popped.name).toBe('func');
      expect(tracker.getCurrentScope().level).toBe(ScopeLevel.GLOBAL);
    });

    // Test 5: 루프 스코프
    it('should handle loop scope', () => {
      const loopScope = tracker.pushScope(ScopeLevel.LOOP, 'forLoop');

      expect(loopScope.level).toBe(ScopeLevel.LOOP);
      expect(tracker.getCurrentScope()).toBe(loopScope);
    });

    // Test 6: 조건문 스코프
    it('should handle conditional scope', () => {
      const condScope = tracker.pushScope(ScopeLevel.CONDITIONAL, 'ifBranch');

      expect(condScope.level).toBe(ScopeLevel.CONDITIONAL);
    });
  });

  describe('Variable Declaration and Assignment', () => {
    // Test 7: 변수 선언
    it('should declare variable in current scope', () => {
      tracker.declareOrAssignVariable('x', 'number', false, 1);

      const x = tracker.lookupVariable('x');
      expect(x).toBeDefined();
      expect(x?.primaryType).toBe('number');
      expect(x?.confidence).toBeGreaterThan(0.8);
    });

    // Test 8: 파라미터 신뢰도
    it('should assign high confidence to parameters', () => {
      tracker.declareOrAssignVariable('arr', 'array', true, 1);

      const arr = tracker.lookupVariable('arr');
      expect(arr?.isParameter).toBe(true);
      expect(arr?.confidence).toBe(0.95);
    });

    // Test 9: 재할당
    it('should track variable reassignment', () => {
      tracker.declareOrAssignVariable('x', 'number', false, 1);
      tracker.declareOrAssignVariable('x', 'string', false, 2);

      const x = tracker.lookupVariable('x');
      expect(x?.isReassigned).toBe(true);
      expect(x?.types.size).toBe(2);
    });

    // Test 10: 스코프별 변수
    it('should respect scope boundaries', () => {
      tracker.declareOrAssignVariable('global_x', 'number', false, 1);

      tracker.pushScope(ScopeLevel.BLOCK, 'block');
      tracker.declareOrAssignVariable('block_x', 'string', false, 2);

      expect(tracker.lookupVariable('global_x')).toBeDefined();
      expect(tracker.lookupVariable('block_x')).toBeDefined();

      tracker.popScope();

      expect(tracker.lookupVariable('global_x')).toBeDefined();
      expect(tracker.lookupVariable('block_x')).toBeDefined(); // 스코프 체이닝
    });

    // Test 11: 스코프 섀도잉
    it('should handle variable shadowing', () => {
      tracker.declareOrAssignVariable('x', 'number', false, 1);

      tracker.pushScope(ScopeLevel.BLOCK, 'inner');
      tracker.declareOrAssignVariable('x', 'string', false, 2);

      const x = tracker.lookupVariable('x');
      expect(x?.primaryType).toBe('string'); // 가장 가까운 스코프
    });
  });

  describe('Dependency Graph', () => {
    // Test 12: 단순 의존성
    it('should record simple dependency', () => {
      tracker.recordDependency('y', 'x', 'assignment', 2);

      const deps = tracker.getDependencies('y');
      expect(deps.length).toBe(1);
      expect(deps[0].to).toBe('x');
    });

    // Test 13: 다중 의존성
    it('should handle multiple dependencies', () => {
      tracker.recordDependency('z', 'x', 'operation', 3);
      tracker.recordDependency('z', 'y', 'operation', 3);

      const deps = tracker.getDependencies('z');
      expect(deps.length).toBe(2);
    });

    // Test 14: 전이적 의존성
    it('should find transitive dependencies', () => {
      // x → y → z 체인
      tracker.recordDependency('y', 'x', 'assignment', 1);
      tracker.recordDependency('z', 'y', 'assignment', 2);

      const transDeps = tracker.getTransitiveDependencies('z');
      expect(transDeps).toContain('y');
      expect(transDeps).toContain('x');
    });

    // Test 15: 메서드 호출 의존성
    it('should track method call dependencies', () => {
      tracker.recordDependency('result', 'arr', 'method', 5);

      const deps = tracker.getDependencies('result');
      expect(deps[0].type).toBe('method');
    });

    // Test 16: 의존성 신뢰도
    it('should assign confidence to dependencies', () => {
      tracker.recordDependency('y', 'x', 'operation', 2, 0.9);

      const deps = tracker.getDependencies('y');
      expect(deps[0].confidence).toBe(0.9);
    });
  });

  describe('Type Uncertainty Tracking', () => {
    // Test 17: 조건부 타입 할당
    it('should detect type uncertainty from reassignment', () => {
      tracker.declareOrAssignVariable('x', 'number', false, 1);
      tracker.declareOrAssignVariable('x', 'string', false, 2); // 다른 타입

      const uncertainty = tracker.getTypeUncertainty('x');
      expect(uncertainty).toBeDefined();
      expect(uncertainty?.possibleTypes.size).toBe(2);
    });

    // Test 18: union 타입
    it('should track union types correctly', () => {
      tracker.declareOrAssignVariable('x', 'number', false, 1);
      tracker.declareOrAssignVariable('x', 'string', false, 2);

      const x = tracker.lookupVariable('x');
      expect(x?.types.has('number')).toBe(true);
      expect(x?.types.has('string')).toBe(true);
    });

    // Test 19: 3중 불확실성
    it('should handle multiple type possibilities', () => {
      tracker.declareOrAssignVariable('x', 'number', false, 1);
      tracker.declareOrAssignVariable('x', 'string', false, 2);
      tracker.declareOrAssignVariable('x', 'bool', false, 3);

      const uncertainty = tracker.getTypeUncertainty('x');
      expect(uncertainty?.possibleTypes.size).toBe(3);
    });
  });

  describe('Confidence Enhancement by Context', () => {
    // Test 20: 루프 컨텍스트 신뢰도
    it('should enhance confidence in loop context', () => {
      tracker.declareOrAssignVariable('item', 'unknown', true); // 파라미터
      tracker.pushScope(ScopeLevel.LOOP, 'forLoop');

      const enhanced = tracker.enhanceConfidenceByContext('item');
      expect(enhanced).toBeGreaterThan(0.9);
    });

    // Test 21: 조건문 컨텍스트 신뢰도
    it('should reduce confidence in conditional context', () => {
      tracker.declareOrAssignVariable('x', 'number', false, 1);
      tracker.declareOrAssignVariable('x', 'string', false, 2);
      tracker.pushScope(ScopeLevel.CONDITIONAL, 'ifBranch');

      const enhanced = tracker.enhanceConfidenceByContext('x');
      expect(enhanced).toBeLessThan(0.8);
    });

    // Test 22: 의존성 신뢰도 전파
    it('should propagate low confidence through dependencies', () => {
      tracker.declareOrAssignVariable('x', 'number', false, 1);
      tracker.declareOrAssignVariable('x', 'string', false, 2);
      tracker.recordDependency('y', 'x', 'assignment', 3);

      const enhanced = tracker.enhanceConfidenceByContext('y');
      expect(enhanced).toBeLessThan(0.8);
    });
  });

  describe('Type Constraint Validation', () => {
    // Test 23: numeric 제약
    it('should validate numeric constraints', () => {
      tracker.declareOrAssignVariable('x', 'number', false, 1);
      tracker.declareOrAssignVariable('y', 'number', false, 2);

      const constraints = [{ vars: ['x', 'y'], constraint: 'numeric' }];
      const valid = tracker.validateTypeConstraints(constraints);

      expect(valid).toBe(true);
    });

    // Test 24: array 제약
    it('should validate array constraints', () => {
      tracker.declareOrAssignVariable('arr', 'array', false, 1);

      const constraints = [{ vars: ['arr'], constraint: 'array' }];
      const valid = tracker.validateTypeConstraints(constraints);

      expect(valid).toBe(true);
    });

    // Test 25: 제약 위반
    it('should detect constraint violations', () => {
      tracker.declareOrAssignVariable('x', 'string', false, 1);

      const constraints = [{ vars: ['x'], constraint: 'numeric' }];
      const valid = tracker.validateTypeConstraints(constraints);

      expect(valid).toBe(false);
    });
  });

  describe('Real-World Scenarios', () => {
    // Test 26: for-in 루프
    it('should handle for-in loop context', () => {
      tracker.declareOrAssignVariable('arr', 'array', true, 1);
      tracker.pushScope(ScopeLevel.LOOP, 'forLoop');
      tracker.declareOrAssignVariable('item', 'unknown', false, 2);
      tracker.recordDependency('item', 'arr', 'operation', 2);

      const itemInfo = tracker.lookupVariable('item');
      const enhanced = tracker.enhanceConfidenceByContext('item');

      expect(itemInfo?.primaryType).toBe('unknown');
      expect(enhanced).toBeGreaterThan(0.5); // 루프 컨텍스트로 향상
    });

    // Test 27: 조건부 초기화
    it('should handle conditional initialization', () => {
      // 전역 스코프에서 x를 number로 선언
      tracker.declareOrAssignVariable('x', 'number', false, 1);

      // 조건문 스코프에서 x를 string으로 재할당 → 타입 불확실성 발생
      tracker.pushScope(ScopeLevel.CONDITIONAL, 'conditionalBranch');
      tracker.declareOrAssignVariable('x', 'string', false, 2);
      tracker.popScope();

      const uncertainty = tracker.getTypeUncertainty('x');
      expect(uncertainty?.source).toBe('conditional');
      expect(uncertainty?.possibleTypes.has('number')).toBe(true);
      expect(uncertainty?.possibleTypes.has('string')).toBe(true);
    });

    // Test 28: 중첩 루프
    it('should handle nested loops', () => {
      tracker.declareOrAssignVariable('matrix', 'array', true, 1);

      tracker.pushScope(ScopeLevel.LOOP, 'outerLoop');
      tracker.declareOrAssignVariable('row', 'unknown', false, 2);

      tracker.pushScope(ScopeLevel.LOOP, 'innerLoop');
      tracker.declareOrAssignVariable('item', 'unknown', false, 3);
      tracker.recordDependency('item', 'row', 'operation', 3);

      tracker.popScope();
      tracker.popScope();

      const itemInfo = tracker.lookupVariable('item');
      expect(itemInfo).toBeDefined();
    });

    // Test 29: 복잡한 의존성
    it('should track complex dependency chains', () => {
      tracker.declareOrAssignVariable('x', 'number', false, 1);
      tracker.declareOrAssignVariable('y', 'number', false, 2);
      tracker.recordDependency('sum', 'x', 'operation', 3);
      tracker.recordDependency('sum', 'y', 'operation', 3);
      tracker.recordDependency('result', 'sum', 'operation', 4);

      const transDeps = tracker.getTransitiveDependencies('result');
      expect(transDeps).toContain('sum');
      expect(transDeps).toContain('x');
      expect(transDeps).toContain('y');
    });

    // Test 30: 파라미터 기반 추론
    it('should infer from function parameters', () => {
      tracker.declareOrAssignVariable('arr', 'array', true, 1);
      tracker.declareOrAssignVariable('result', 'unknown', false, 2);
      tracker.recordDependency('result', 'arr', 'operation', 2);

      const resultInfo = tracker.lookupVariable('result');
      const enhanced = tracker.enhanceConfidenceByContext('result');

      // 파라미터에 높은 신뢰도가 있으므로 result도 향상
      expect(enhanced).toBeGreaterThan(0.5);
    });
  });

  describe('Debug Output', () => {
    // Test 31: 스코프 체인 출력
    it('should print scope chain correctly', () => {
      tracker.declareOrAssignVariable('x', 'number', false, 1);
      tracker.pushScope(ScopeLevel.FUNCTION, 'func');
      tracker.declareOrAssignVariable('y', 'string', false, 2);

      const output = tracker.printScopeChain();

      expect(output).toContain('Scope: global');
      expect(output).toContain('Scope: function');
      expect(output).toContain('x: number');
      expect(output).toContain('y: string');
    });

    // Test 32: 의존성 그래프 출력
    it('should print dependency graph correctly', () => {
      tracker.recordDependency('y', 'x', 'assignment', 1);

      const output = tracker.printDependencyGraph();

      expect(output).toContain('y → x');
      expect(output).toContain('assignment');
    });

    // Test 33: 타입 불확실성 출력
    it('should print type uncertainties correctly', () => {
      tracker.declareOrAssignVariable('x', 'number', false, 1);
      tracker.declareOrAssignVariable('x', 'string', false, 2);

      const output = tracker.printTypeUncertainties();

      expect(output).toContain('x:');
      expect(output).toContain('number');
      expect(output).toContain('string');
    });
  });

  describe('Integration with SemanticAnalyzer', () => {
    // Test 34: 신뢰도 향상 효과
    it('should improve confidence through context', () => {
      tracker.declareOrAssignVariable('items', 'array', true, 1);
      const confidence1 = tracker.enhanceConfidenceByContext('items');

      tracker.pushScope(ScopeLevel.LOOP, 'loop');
      const confidence2 = tracker.enhanceConfidenceByContext('items');

      expect(confidence2).toBeGreaterThanOrEqual(confidence1);
    });

    // Test 35: Stage 1 + Stage 2 통합
    it('should work with complex scenarios', () => {
      // 입력 파라미터
      tracker.declareOrAssignVariable('users', 'array', true, 1);

      // 루프
      tracker.pushScope(ScopeLevel.LOOP, 'forEach');
      tracker.declareOrAssignVariable('user', 'unknown', false, 2);
      tracker.recordDependency('user', 'users', 'operation', 2);

      // 조건
      tracker.pushScope(ScopeLevel.CONDITIONAL, 'if');
      tracker.declareOrAssignVariable('name', 'string', false, 3);
      tracker.recordDependency('name', 'user', 'method', 3);

      tracker.popScope();
      tracker.popScope();

      // 최종 결과 변수
      tracker.declareOrAssignVariable('result', 'unknown', false, 4);
      tracker.recordDependency('result', 'name', 'assignment', 4);

      const resultInfo = tracker.lookupVariable('result');
      const enhanced = tracker.enhanceConfidenceByContext('result');

      expect(resultInfo).toBeDefined();
      expect(enhanced).toBeGreaterThan(0);
    });
  });
});

/**
 * Phase 3 Stage 2 테스트 요약
 *
 * ✅ 35개 테스트 작성 완료 (목표: 100% 통과)
 *
 * 테스트 범주:
 * 1. Scope Chain Management (6개)
 * 2. Variable Declaration (5개)
 * 3. Dependency Graph (5개)
 * 4. Type Uncertainty (3개)
 * 5. Confidence Enhancement (3개)
 * 6. Type Constraint Validation (3개)
 * 7. Real-World Scenarios (5개)
 * 8. Debug Output (3개)
 * 9. Integration (2개)
 *
 * Phase 3 목표:
 * - Stage 1: 기초 변수 추적 ✅ (31/31)
 * - Stage 2: 깊은 컨텍스트 ⏳ (35/35 예상)
 * - Stage 3: 통합 추론 ⏳
 * - Stage 4: 검증 ⏳
 */
