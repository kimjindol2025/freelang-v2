/**
 * scikit-learn 호환 라이브러리 - Phase 5-6 완전 테스트
 * 모든 ML 함수의 통합 검증
 */

import { NativeFunctionRegistry } from '../src/vm/native-function-registry';
import { registerSklearnFunctions } from '../src/stdlib-sklearn';

describe('sklearn-all-functions (Phase 5-6)', () => {
  let registry: NativeFunctionRegistry;

  beforeEach(() => {
    registry = new NativeFunctionRegistry();
    registerSklearnFunctions(registry);
  });

  // ════════════════════════════════════════════════════════════════
  // Preprocessing Tests
  // ════════════════════════════════════════════════════════════════
  describe('Preprocessing', () => {
    it('scaler_fit: 특성의 평균과 표준편차 계산', () => {
      const X = [[1, 100], [2, 200], [3, 300]];
      
      const scaler = registry.call('sklearn_standard_scaler_fit', [X]);
      
      expect(scaler.means).toBeDefined();
      expect(scaler.stds).toBeDefined();
      expect(scaler.means.length).toBe(2);
      expect(scaler.stds.length).toBe(2);
    });

    it('scaler_transform: 정규화된 데이터 변환', () => {
      const X = [[1, 2], [2, 3], [3, 4]];
      const scaler = registry.call('sklearn_standard_scaler_fit', [X]);
      
      const X_scaled = registry.call('sklearn_standard_scaler_transform', [X, scaler]);
      
      expect(X_scaled.length).toBe(3);
      expect(X_scaled[0].length).toBe(2);
    });

    it('train_test_split: 데이터 분할', () => {
      const X = [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6]];
      const y = [10, 20, 30, 40, 50];
      
      const split = registry.call('sklearn_train_test_split', [X, y, 0.4]);
      
      expect(split.X_train.length + split.X_test.length).toBe(5);
      expect(split.y_train.length + split.y_test.length).toBe(5);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Linear Models Tests
  // ════════════════════════════════════════════════════════════════
  describe('Linear Models', () => {
    it('linear_fit & predict: 선형 회귀', () => {
      const X = [[1], [2], [3], [4]];
      const y = [2, 4, 6, 8];
      
      const model = registry.call('sklearn_linear_fit', [X, y, 0.01, 100]);
      expect(model.weights).toBeDefined();
      expect(model.bias).toBeDefined();
      expect(model.loss_history.length).toBe(100);
      
      const predictions = registry.call('sklearn_linear_predict', [X, model]);
      expect(predictions.length).toBe(4);
    });

    it('logistic_fit & predict: 로지스틱 회귀', () => {
      const X = [[1, 2], [2, 3], [3, 4], [4, 5]];
      const y = [0, 0, 1, 1];
      
      const model = registry.call('sklearn_logistic_fit', [X, y, 0.01, 100]);
      expect(model.weights).toBeDefined();
      expect(model.bias).toBeDefined();
      
      const predictions = registry.call('sklearn_logistic_predict', [X, model]);
      expect(predictions.length).toBe(4);
      expect(predictions[0]).toBeGreaterThanOrEqual(0);
      expect(predictions[0]).toBeLessThanOrEqual(1);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Clustering Tests
  // ════════════════════════════════════════════════════════════════
  describe('Clustering', () => {
    it('kmeans_fit & predict: K-Means 클러스터링', () => {
      const X = [[1, 1], [1, 2], [8, 8], [8, 9]];
      
      const model = registry.call('sklearn_kmeans_fit', [X, 2, 100, 42]);
      expect(model.centers).toBeDefined();
      expect(model.labels).toBeDefined();
      expect(model.centers.length).toBe(2);
      expect(model.labels.length).toBe(4);
      
      const predictions = registry.call('sklearn_kmeans_predict', [X, model]);
      expect(predictions.length).toBe(4);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Neighbors Tests
  // ════════════════════════════════════════════════════════════════
  describe('Neighbors', () => {
    it('knn_fit & predict: K-Nearest Neighbors', () => {
      const X_train = [[1, 1], [1, 2], [8, 8], [8, 9]];
      const y_train = [0, 0, 1, 1];
      
      const model = registry.call('sklearn_knn_fit', [X_train, y_train]);
      expect(model.X).toBeDefined();
      expect(model.y).toBeDefined();
      
      const X_test = [[1, 1.5], [8, 8.5]];
      const predictions = registry.call('sklearn_knn_predict', [X_test, model, 2]);
      expect(predictions.length).toBe(2);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Real-world Integration Test
  // ════════════════════════════════════════════════════════════════
  it('통합 테스트: 완전한 ML 파이프라인', () => {
    // 1. 데이터 생성
    const X = [
      [1, 2], [1.5, 1.8], [1.2, 2.1],
      [8, 9], [8.5, 8.8], [8.2, 9.1]
    ];
    const y = [0, 0, 0, 1, 1, 1];

    // 2. 데이터 정규화
    const scaler = registry.call('sklearn_standard_scaler_fit', [X]);
    const X_scaled = registry.call('sklearn_standard_scaler_transform', [X, scaler]);

    // 3. 데이터 분할
    const split = registry.call('sklearn_train_test_split', [X_scaled, y, 0.33]);

    // 4. 로지스틱 회귀 학습
    const model = registry.call('sklearn_logistic_fit', 
      [split.X_train, split.y_train, 0.01, 100]);

    // 5. 예측
    const y_pred = registry.call('sklearn_logistic_predict', 
      [split.X_test, model]);

    // 확률을 클래스로 변환
    const y_pred_binary = y_pred.map((p: number) => p > 0.5 ? 1 : 0);

    // 6. 평가
    const accuracy = registry.call('sklearn_accuracy_score', 
      [split.y_test, y_pred_binary]);

    expect(accuracy).toBeGreaterThanOrEqual(0);
    expect(accuracy).toBeLessThanOrEqual(1);
  });

  // ════════════════════════════════════════════════════════════════
  // Error Handling Tests
  // ════════════════════════════════════════════════════════════════
  describe('Error Handling', () => {
    it('유효하지 않은 입력 처리', () => {
      expect(() => {
        registry.call('sklearn_accuracy_score', [null, [1, 2, 3]]);
      }).toThrow();
    });

    it('길이 불일치 감지', () => {
      expect(() => {
        registry.call('sklearn_accuracy_score', [[1, 2, 3], [1, 2]]);
      }).toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Performance Tests
  // ════════════════════════════════════════════════════════════════
  it('성능 테스트: 대규모 데이터셋 처리', () => {
    const start = Date.now();

    // 1000개 샘플 생성
    const X = Array(1000).fill(0).map(() => 
      [Math.random() * 10, Math.random() * 10]
    );
    const y = X.map(([x, y]) => x + y > 10 ? 1 : 0);

    registry.call('sklearn_train_test_split', [X, y, 0.2]);

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1000);  // 1초 이내
  });
});
