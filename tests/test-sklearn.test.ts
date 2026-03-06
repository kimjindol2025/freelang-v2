/**
 * FreeLang v2 - scikit-learn 함수 테스트
 *
 * Phase 3: KMeans Clustering Tests
 * Phase 4: K-Nearest Neighbors Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NativeFunctionRegistry } from '../src/vm/native-function-registry';
import { registerSklearnFunctions } from '../src/stdlib-sklearn';

describe('sklearn ML Functions', () => {
  let registry: NativeFunctionRegistry;

  beforeEach(() => {
    registry = new NativeFunctionRegistry();
    registerSklearnFunctions(registry);
  });

  // ════════════════════════════════════════════════════════════════
  // Phase 3: KMeans Clustering Tests
  // ════════════════════════════════════════════════════════════════

  describe('Phase 3: KMeans Clustering', () => {
    describe('sklearn_kmeans_fit', () => {
      it('should cluster 2D points into 3 clusters', () => {
        // 테스트 데이터: 3개 군집
        const X = [
          [0, 0],
          [1, 1],
          [2, 2],
          [10, 10],
          [11, 11],
          [12, 12],
          [20, 20],
          [21, 21],
          [22, 22]
        ];

        const result = registry.call('sklearn_kmeans_fit', [X, 3, 300]) as any;

        expect(result).toHaveProperty('centers');
        expect(result).toHaveProperty('labels');
        expect(result).toHaveProperty('inertia');
        expect(result.centers).toHaveLength(3);
        expect(result.labels).toHaveLength(9);
        expect(result.inertia).toBeGreaterThan(0);
      });

      it('should have valid cluster assignments', () => {
        const X = [
          [0, 0],
          [1, 1],
          [10, 10],
          [11, 11]
        ];

        const result = registry.call('sklearn_kmeans_fit', [X, 2, 100]) as any;
        const labels = result.labels as number[];

        // 라벨이 0 또는 1이어야 함
        for (const label of labels) {
          expect(label).toBeGreaterThanOrEqual(0);
          expect(label).toBeLessThan(2);
        }
      });

      it('should raise error for invalid n_clusters', () => {
        const X = [[0, 0], [1, 1]];

        expect(() => {
          registry.call('sklearn_kmeans_fit', [X, 5, 100]);
        }).toThrow();
      });

      it('should handle single cluster', () => {
        const X = [[0, 0], [1, 1], [2, 2]];

        const result = registry.call('sklearn_kmeans_fit', [X, 1, 100]) as any;

        expect(result.centers).toHaveLength(1);
        expect(result.labels.every((l: number) => l === 0)).toBe(true);
      });
    });

    describe('sklearn_kmeans_predict', () => {
      it('should predict labels for new data', () => {
        const X_train = [[0, 0], [1, 1], [10, 10], [11, 11]];
        const model = registry.call('sklearn_kmeans_fit', [
          X_train,
          2,
          100
        ]) as any;

        const X_test = [[0.5, 0.5], [10.5, 10.5]];
        const predictions = registry.call('sklearn_kmeans_predict', [
          X_test,
          model
        ]) as number[];

        expect(predictions).toHaveLength(2);
        expect(predictions[0]).toBeGreaterThanOrEqual(0);
        expect(predictions[0]).toBeLessThan(2);
      });

      it('should assign same cluster to similar points', () => {
        const X_train = [[0, 0], [1, 1], [100, 100], [101, 101]];
        const model = registry.call('sklearn_kmeans_fit', [
          X_train,
          2,
          100
        ]) as any;

        const X_test = [[0, 0], [1, 1]];
        const predictions = registry.call('sklearn_kmeans_predict', [
          X_test,
          model
        ]) as number[];

        // 두 점이 같은 클러스터에 할당되어야 함
        expect(predictions[0]).toBe(predictions[1]);
      });
    });

    describe('sklearn_kmeans_fit_predict', () => {
      it('should fit and predict in one call', () => {
        const X = [[0, 0], [1, 1], [10, 10], [11, 11]];

        const labels = registry.call('sklearn_kmeans_fit_predict', [
          X,
          2,
          100
        ]) as number[];

        expect(labels).toHaveLength(4);
        expect(labels).toEqual(expect.arrayContaining([0, 1]));
      });

      it('should work with 3D data', () => {
        const X = [
          [0, 0, 0],
          [1, 1, 1],
          [10, 10, 10],
          [11, 11, 11]
        ];

        const labels = registry.call('sklearn_kmeans_fit_predict', [
          X,
          2,
          100
        ]) as number[];

        expect(labels).toHaveLength(4);
      });
    });

    describe('sklearn_kmeans_inertia', () => {
      it('should calculate inertia for model', () => {
        const X = [[0, 0], [1, 1], [10, 10], [11, 11]];
        const model = registry.call('sklearn_kmeans_fit', [
          X,
          2,
          100
        ]) as any;

        const inertia = registry.call('sklearn_kmeans_inertia', [
          X,
          model
        ]) as number;

        expect(inertia).toBeGreaterThanOrEqual(0);
        expect(typeof inertia).toBe('number');
      });

      it('inertia should be zero for perfect clusters', () => {
        // 각 점이 정확히 중심에 있는 경우
        const X = [[0, 0], [10, 10]];
        const model = registry.call('sklearn_kmeans_fit', [
          X,
          2,
          100
        ]) as any;

        const inertia = registry.call('sklearn_kmeans_inertia', [
          X,
          model
        ]) as number;

        expect(inertia).toBeLessThan(0.0001); // 거의 0에 가까움
      });
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Phase 4: K-Nearest Neighbors Tests
  // ════════════════════════════════════════════════════════════════

  describe('Phase 4: K-Nearest Neighbors', () => {
    describe('sklearn_knn_fit', () => {
      it('should create a model from training data', () => {
        const X_train = [[0, 0], [1, 1], [2, 2]];
        const y_train = [0, 1, 2];

        const model = registry.call('sklearn_knn_fit', [
          X_train,
          y_train
        ]) as any;

        expect(model).toHaveProperty('X_train');
        expect(model).toHaveProperty('y_train');
        expect(model.is_knn_model).toBe(true);
      });

      it('should raise error for mismatched sizes', () => {
        const X_train = [[0, 0], [1, 1]];
        const y_train = [0]; // 길이가 다름

        expect(() => {
          registry.call('sklearn_knn_fit', [X_train, y_train]);
        }).toThrow();
      });
    });

    describe('sklearn_knn_predict', () => {
      it('should predict continuous values using k=1', () => {
        const X_train = [[0, 0], [1, 1], [10, 10]];
        const y_train = [0, 1, 10];

        const model = registry.call('sklearn_knn_fit', [
          X_train,
          y_train
        ]) as any;

        const X_test = [[0.1, 0.1]];
        const predictions = registry.call('sklearn_knn_predict', [
          X_test,
          model,
          1
        ]) as number[];

        expect(predictions).toHaveLength(1);
        // 가장 가까운 점은 [0, 0]이므로 0에 가까워야 함
        expect(predictions[0]).toBeCloseTo(0, 0);
      });

      it('should average values with k>1', () => {
        const X_train = [[0, 0], [1, 1], [2, 2]];
        const y_train = [10, 20, 30];

        const model = registry.call('sklearn_knn_fit', [
          X_train,
          y_train
        ]) as any;

        const X_test = [[1, 1]];
        const predictions = registry.call('sklearn_knn_predict', [
          X_test,
          model,
          3
        ]) as number[];

        // 3개 이웃 모두가 영향을 줌
        expect(predictions[0]).toBeGreaterThan(10);
        expect(predictions[0]).toBeLessThan(30);
      });

      it('should handle k larger than training set', () => {
        const X_train = [[0, 0], [1, 1]];
        const y_train = [5, 15];

        const model = registry.call('sklearn_knn_fit', [
          X_train,
          y_train
        ]) as any;

        const X_test = [[0.5, 0.5]];
        const predictions = registry.call('sklearn_knn_predict', [
          X_test,
          model,
          10 // k보다 크다
        ]) as number[];

        expect(predictions).toHaveLength(1);
        expect(predictions[0]).toBe(10); // (5 + 15) / 2
      });
    });

    describe('sklearn_knn_classify', () => {
      it('should classify using majority vote', () => {
        const X_train = [
          [0, 0],
          [1, 1],
          [2, 2],
          [10, 10],
          [11, 11]
        ];
        const y_train = [0, 0, 0, 1, 1]; // 0이 3개, 1이 2개

        const model = registry.call('sklearn_knn_fit', [
          X_train,
          y_train
        ]) as any;

        const X_test = [[0.5, 0.5]]; // 0 근처
        const predictions = registry.call('sklearn_knn_classify', [
          X_test,
          model,
          3
        ]) as number[];

        expect(predictions).toHaveLength(1);
        expect(predictions[0]).toBe(0); // 0이 다수결
      });

      it('should handle string labels', () => {
        const X_train = [[0, 0], [1, 1], [10, 10]];
        const y_train = ['cat', 'cat', 'dog'];

        const model = registry.call('sklearn_knn_fit', [
          X_train,
          y_train
        ]) as any;

        const X_test = [[0.1, 0.1]];
        const predictions = registry.call('sklearn_knn_classify', [
          X_test,
          model,
          2
        ]) as any[];

        expect(predictions).toHaveLength(1);
        expect(['cat', 'dog']).toContain(predictions[0]);
      });

      it('should classify multiple points', () => {
        const X_train = [[0, 0], [1, 1], [10, 10], [11, 11]];
        const y_train = ['A', 'A', 'B', 'B'];

        const model = registry.call('sklearn_knn_fit', [
          X_train,
          y_train
        ]) as any;

        const X_test = [[0.5, 0.5], [10.5, 10.5]];
        const predictions = registry.call('sklearn_knn_classify', [
          X_test,
          model,
          2
        ]) as any[];

        expect(predictions).toHaveLength(2);
        expect(predictions[0]).toBe('A');
        expect(predictions[1]).toBe('B');
      });
    });

    describe('sklearn_knn_neighbors', () => {
      it('should return k nearest neighbors', () => {
        const X_train = [[0, 0], [1, 1], [2, 2], [10, 10]];
        const y_train = [0, 1, 2, 3];

        const model = registry.call('sklearn_knn_fit', [
          X_train,
          y_train
        ]) as any;

        const X_test = [[0, 0]];
        const result = registry.call('sklearn_knn_neighbors', [
          X_test,
          model,
          2
        ]) as any;

        expect(result).toHaveProperty('distances');
        expect(result).toHaveProperty('indices');
        expect(result.distances[0]).toHaveLength(2);
        expect(result.indices[0]).toHaveLength(2);
      });

      it('distances should be in ascending order', () => {
        const X_train = [[0, 0], [1, 1], [2, 2]];
        const y_train = [0, 1, 2];

        const model = registry.call('sklearn_knn_fit', [
          X_train,
          y_train
        ]) as any;

        const X_test = [[0.5, 0.5]];
        const result = registry.call('sklearn_knn_neighbors', [
          X_test,
          model,
          3
        ]) as any;

        const dists = result.distances[0] as number[];

        // 거리가 오름차순이어야 함
        for (let i = 0; i < dists.length - 1; i++) {
          expect(dists[i]).toBeLessThanOrEqual(dists[i + 1]);
        }
      });

      it('should handle k larger than training set', () => {
        const X_train = [[0, 0], [1, 1]];
        const y_train = [0, 1];

        const model = registry.call('sklearn_knn_fit', [
          X_train,
          y_train
        ]) as any;

        const X_test = [[0, 0]];
        const result = registry.call('sklearn_knn_neighbors', [
          X_test,
          model,
          10
        ]) as any;

        // k보다 크지만 사용 가능한 이웃만 반환
        expect(result.distances[0]).toHaveLength(2);
        expect(result.indices[0]).toHaveLength(2);
      });
    });
  });

  // ════════════════════════════════════════════════════════════════
  // Integration Tests
  // ════════════════════════════════════════════════════════════════

  describe('Integration Tests', () => {
    it('should work with iris-like dataset', () => {
      // Iris 데이터셋 유사
      const X_train = [
        [5.1, 3.5, 1.4, 0.2],
        [4.9, 3.0, 1.4, 0.2],
        [7.0, 3.2, 4.7, 1.4],
        [6.3, 2.9, 4.9, 1.8],
        [6.3, 3.3, 6.0, 2.5],
        [5.8, 2.7, 5.1, 1.9]
      ];

      const y_train = [0, 0, 1, 1, 2, 2];

      const model = registry.call('sklearn_knn_fit', [
        X_train,
        y_train
      ]) as any;

      const X_test = [[5.0, 3.4, 1.5, 0.2], [6.5, 3.0, 4.8, 1.5]];
      const predictions = registry.call('sklearn_knn_classify', [
        X_test,
        model,
        3
      ]) as number[];

      expect(predictions).toHaveLength(2);
      expect(predictions[0]).toBe(0); // setosa 근처
      expect(predictions[1]).toBe(1); // versicolor 근처
    });

    it('KMeans + KNN pipeline', () => {
      // 1. KMeans로 클러스터링
      const X = [[0, 0], [1, 1], [10, 10], [11, 11]];
      const kmeans_result = registry.call('sklearn_kmeans_fit', [
        X,
        2,
        100
      ]) as any;

      expect(kmeans_result.labels).toHaveLength(4);

      // 2. KNN으로 예측
      const y_train = kmeans_result.labels;
      const model = registry.call('sklearn_knn_fit', [X, y_train]) as any;

      const X_test = [[0.5, 0.5]];
      const predictions = registry.call('sklearn_knn_classify', [
        X_test,
        model,
        2
      ]) as number[];

      expect(predictions[0]).toBe(0); // 정확한 분류
    });
  });
});
