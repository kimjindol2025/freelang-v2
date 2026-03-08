/**
 * scikit-learn 호환 라이브러리 - Phase 5: Metrics 테스트
 * 평가 지표 함수들의 정확성 검증
 */

import { NativeFunctionRegistry } from '../src/vm/native-function-registry';
import { registerSklearnFunctions } from '../src/stdlib-sklearn';

describe('sklearn-metrics (Phase 5)', () => {
  let registry: NativeFunctionRegistry;

  beforeEach(() => {
    registry = new NativeFunctionRegistry();
    registerSklearnFunctions(registry);
  });

  // ════════════════════════════════════════════════════════════════
  // Test 1: Accuracy Score
  // ════════════════════════════════════════════════════════════════
  it('accuracy_score: 완벽한 예측 (100%)', () => {
    const y_true = [0, 1, 1, 0, 1];
    const y_pred = [0, 1, 1, 0, 1];
    
    const result = registry.call('sklearn_accuracy_score', [y_true, y_pred]);
    expect(result).toBe(1.0);
  });

  it('accuracy_score: 부분 정확 (60%)', () => {
    const y_true = [0, 1, 1, 0, 1];
    const y_pred = [0, 1, 0, 0, 1];  // 3개 맞음 / 5개 = 60%
    
    const result = registry.call('sklearn_accuracy_score', [y_true, y_pred]);
    expect(result).toBe(0.6);
  });

  // ════════════════════════════════════════════════════════════════
  // Test 2: MSE (Mean Squared Error)
  // ════════════════════════════════════════════════════════════════
  it('mse: 회귀 오류 계산', () => {
    const y_true = [3.0, -0.5, 2.0, 7.0];
    const y_pred = [2.5, 0.0, 2.0, 8.0];
    // 오차: [-0.5, 0.5, 0, 1]
    // 제곱 오차: [0.25, 0.25, 0, 1]
    // MSE: (0.25 + 0.25 + 0 + 1) / 4 = 0.375
    
    const result = registry.call('sklearn_mse', [y_true, y_pred]);
    expect(Math.abs(result - 0.375)).toBeLessThan(0.001);
  });

  // ════════════════════════════════════════════════════════════════
  // Test 3: MAE (Mean Absolute Error)
  // ════════════════════════════════════════════════════════════════
  it('mae: 절대 오차 계산', () => {
    const y_true = [3.0, -0.5, 2.0, 7.0];
    const y_pred = [2.5, 0.0, 2.0, 8.0];
    // 절대 오차: [0.5, 0.5, 0, 1]
    // MAE: (0.5 + 0.5 + 0 + 1) / 4 = 0.5
    
    const result = registry.call('sklearn_mae', [y_true, y_pred]);
    expect(Math.abs(result - 0.5)).toBeLessThan(0.001);
  });

  // ════════════════════════════════════════════════════════════════
  // Test 4: R² Score (Coefficient of Determination)
  // ════════════════════════════════════════════════════════════════
  it('r2_score: 완벽한 예측 (R²=1)', () => {
    const y_true = [3, -0.5, 2, 7];
    const y_pred = [3, -0.5, 2, 7];
    
    const result = registry.call('sklearn_r2_score', [y_true, y_pred]);
    expect(result).toBe(1.0);
  });

  it('r2_score: 부분 예측', () => {
    const y_true = [3, -0.5, 2, 7];
    const y_pred = [2.5, 0.0, 2, 8];
    
    const result = registry.call('sklearn_r2_score', [y_true, y_pred]);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  // ════════════════════════════════════════════════════════════════
  // Test 5: Confusion Matrix
  // ════════════════════════════════════════════════════════════════
  it('confusion_matrix: 이진 분류', () => {
    const y_true = [0, 0, 1, 1];
    const y_pred = [0, 1, 0, 1];
    // TN=1, FP=1, FN=1, TP=1
    
    const result = registry.call('sklearn_confusion_matrix', [y_true, y_pred]);
    expect(result).toEqual([[1, 1], [1, 1]]);
  });

  // ════════════════════════════════════════════════════════════════
  // Test 6: Precision (정밀도)
  // ════════════════════════════════════════════════════════════════
  it('precision: 양성 예측의 정확도', () => {
    const y_true = [0, 0, 1, 1, 1];
    const y_pred = [0, 1, 1, 1, 0];
    // TP=2, FP=1
    // Precision = 2 / (2 + 1) = 0.667
    
    const result = registry.call('sklearn_precision', [y_true, y_pred]);
    expect(Math.abs(result - 2/3)).toBeLessThan(0.001);
  });

  // ════════════════════════════════════════════════════════════════
  // Test 7: Recall (재현율)
  // ════════════════════════════════════════════════════════════════
  it('recall: 양성 케이스 감지율', () => {
    const y_true = [0, 0, 1, 1, 1];
    const y_pred = [0, 1, 1, 1, 0];
    // TP=2, FN=1
    // Recall = 2 / (2 + 1) = 0.667
    
    const result = registry.call('sklearn_recall', [y_true, y_pred]);
    expect(Math.abs(result - 2/3)).toBeLessThan(0.001);
  });

  // ════════════════════════════════════════════════════════════════
  // Test 8: F1 Score
  // ════════════════════════════════════════════════════════════════
  it('f1_score: Precision과 Recall의 조화 평균', () => {
    const y_true = [0, 0, 1, 1, 1];
    const y_pred = [0, 1, 1, 1, 0];
    // Precision = 2/3, Recall = 2/3
    // F1 = 2 * (2/3 * 2/3) / (2/3 + 2/3) = 2/3
    
    const result = registry.call('sklearn_f1_score', [y_true, y_pred]);
    expect(Math.abs(result - 2/3)).toBeLessThan(0.001);
  });

  // ════════════════════════════════════════════════════════════════
  // Integration Tests
  // ════════════════════════════════════════════════════════════════
  it('메트릭 통합 테스트: 완벽한 예측', () => {
    const y_true = [0, 1, 1, 0];
    const y_pred = [0, 1, 1, 0];

    const accuracy = registry.call('sklearn_accuracy_score', [y_true, y_pred]);
    const precision = registry.call('sklearn_precision', [y_true, y_pred]);
    const recall = registry.call('sklearn_recall', [y_true, y_pred]);
    const f1 = registry.call('sklearn_f1_score', [y_true, y_pred]);

    expect(accuracy).toBe(1.0);
    expect(precision).toBe(1.0);
    expect(recall).toBe(1.0);
    expect(f1).toBe(1.0);
  });

  it('메트릭 통합 테스트: 불완전한 예측', () => {
    const y_true = [0, 1, 1, 0, 1];
    const y_pred = [0, 1, 0, 0, 1];

    const accuracy = registry.call('sklearn_accuracy_score', [y_true, y_pred]);
    expect(accuracy).toBe(0.8);  // 4/5 맞음

    const cm = registry.call('sklearn_confusion_matrix', [y_true, y_pred]);
    expect(cm).toEqual([[2, 0], [1, 2]]);
  });
});
