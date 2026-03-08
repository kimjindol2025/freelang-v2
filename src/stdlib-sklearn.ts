/**
 * FreeLang v2 - scikit-learn 호환 라이브러리
 *
 * Phase 5-6: ML 라이브러리 전체 구현
 * - Preprocessing (StandardScaler, train_test_split)
 * - Linear Models (Linear Regression, Logistic Regression)
 * - Clustering (K-Means)
 * - Neighbors (KNN)
 * - Metrics (Accuracy, MSE, MAE, R², Confusion Matrix, Precision, Recall, F1)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

/**
 * scikit-learn 호환 함수 등록
 */
export function registerSklearnFunctions(registry: NativeFunctionRegistry): void {
  // ════════════════════════════════════════════════════════════════
  // Phase 5: Metrics Functions (평가 지표) - 8개
  // ════════════════════════════════════════════════════════════════

  /**
   * sklearn_accuracy_score(y_true, y_pred) → number
   * 정확도 계산: (정확히 맞은 개수) / (전체)
   */
  registry.register({
    name: 'sklearn_accuracy_score',
    module: 'sklearn',
    executor: (args) => {
      const [y_true, y_pred] = args;

      if (!Array.isArray(y_true) || !Array.isArray(y_pred)) {
        throw new Error('y_true and y_pred must be arrays');
      }
      if (y_true.length !== y_pred.length) {
        throw new Error('y_true and y_pred must have the same length');
      }

      let correct = 0;
      for (let i = 0; i < y_true.length; i++) {
        if (y_true[i] === y_pred[i]) correct++;
      }

      return correct / y_true.length;
    }
  });

  /**
   * sklearn_mse(y_true, y_pred) → number
   * 평균 제곱 오차 (Mean Squared Error)
   * MSE = Σ(y_true[i] - y_pred[i])^2 / n
   */
  registry.register({
    name: 'sklearn_mse',
    module: 'sklearn',
    executor: (args) => {
      const [y_true, y_pred] = args;

      if (!Array.isArray(y_true) || !Array.isArray(y_pred)) {
        throw new Error('y_true and y_pred must be arrays');
      }
      if (y_true.length !== y_pred.length) {
        throw new Error('y_true and y_pred must have the same length');
      }

      let sum = 0;
      for (let i = 0; i < y_true.length; i++) {
        const diff = y_true[i] - y_pred[i];
        sum += diff * diff;
      }

      return sum / y_true.length;
    }
  });

  /**
   * sklearn_mae(y_true, y_pred) → number
   * 평균 절대 오차 (Mean Absolute Error)
   * MAE = Σ|y_true[i] - y_pred[i]| / n
   */
  registry.register({
    name: 'sklearn_mae',
    module: 'sklearn',
    executor: (args) => {
      const [y_true, y_pred] = args;

      if (!Array.isArray(y_true) || !Array.isArray(y_pred)) {
        throw new Error('y_true and y_pred must be arrays');
      }
      if (y_true.length !== y_pred.length) {
        throw new Error('y_true and y_pred must have the same length');
      }

      let sum = 0;
      for (let i = 0; i < y_true.length; i++) {
        sum += Math.abs(y_true[i] - y_pred[i]);
      }

      return sum / y_true.length;
    }
  });

  /**
   * sklearn_r2_score(y_true, y_pred) → number
   * R² 결정 계수
   * R² = 1 - (SS_res / SS_tot)
   * SS_res = Σ(y_true[i] - y_pred[i])^2
   * SS_tot = Σ(y_true[i] - mean(y_true))^2
   */
  registry.register({
    name: 'sklearn_r2_score',
    module: 'sklearn',
    executor: (args) => {
      const [y_true, y_pred] = args;

      if (!Array.isArray(y_true) || !Array.isArray(y_pred)) {
        throw new Error('y_true and y_pred must be arrays');
      }
      if (y_true.length !== y_pred.length) {
        throw new Error('y_true and y_pred must have the same length');
      }

      // 평균 계산
      const mean = y_true.reduce((a: number, b: number) => a + b, 0) / y_true.length;

      // SS_res 계산
      let ss_res = 0;
      for (let i = 0; i < y_true.length; i++) {
        const diff = y_true[i] - y_pred[i];
        ss_res += diff * diff;
      }

      // SS_tot 계산
      let ss_tot = 0;
      for (let i = 0; i < y_true.length; i++) {
        const diff = y_true[i] - mean;
        ss_tot += diff * diff;
      }

      if (ss_tot === 0) {
        return ss_res === 0 ? 1.0 : 0.0;
      }

      return 1 - (ss_res / ss_tot);
    }
  });

  /**
   * sklearn_confusion_matrix(y_true, y_pred) → array
   * 혼동 행렬 (2D 배열)
   * [[TN, FP], [FN, TP]]
   * 이진 분류(0, 1)에 대해서만 동작
   */
  registry.register({
    name: 'sklearn_confusion_matrix',
    module: 'sklearn',
    executor: (args) => {
      const [y_true, y_pred] = args;

      if (!Array.isArray(y_true) || !Array.isArray(y_pred)) {
        throw new Error('y_true and y_pred must be arrays');
      }
      if (y_true.length !== y_pred.length) {
        throw new Error('y_true and y_pred must have the same length');
      }

      // 이진 분류만 지원
      let tn = 0, fp = 0, fn = 0, tp = 0;

      for (let i = 0; i < y_true.length; i++) {
        const true_val = y_true[i];
        const pred_val = y_pred[i];

        if (true_val === 0 && pred_val === 0) tn++;
        else if (true_val === 0 && pred_val === 1) fp++;
        else if (true_val === 1 && pred_val === 0) fn++;
        else if (true_val === 1 && pred_val === 1) tp++;
      }

      return [[tn, fp], [fn, tp]];
    }
  });

  /**
   * sklearn_precision(y_true, y_pred) → number
   * 정밀도 (Precision)
   * Precision = TP / (TP + FP)
   */
  registry.register({
    name: 'sklearn_precision',
    module: 'sklearn',
    executor: (args) => {
      const [y_true, y_pred] = args;

      if (!Array.isArray(y_true) || !Array.isArray(y_pred)) {
        throw new Error('y_true and y_pred must be arrays');
      }
      if (y_true.length !== y_pred.length) {
        throw new Error('y_true and y_pred must have the same length');
      }

      let tp = 0, fp = 0;

      for (let i = 0; i < y_true.length; i++) {
        if (y_true[i] === 1 && y_pred[i] === 1) tp++;
        else if (y_true[i] === 0 && y_pred[i] === 1) fp++;
      }

      const denominator = tp + fp;
      if (denominator === 0) return 0;

      return tp / denominator;
    }
  });

  /**
   * sklearn_recall(y_true, y_pred) → number
   * 재현율 (Recall)
   * Recall = TP / (TP + FN)
   */
  registry.register({
    name: 'sklearn_recall',
    module: 'sklearn',
    executor: (args) => {
      const [y_true, y_pred] = args;

      if (!Array.isArray(y_true) || !Array.isArray(y_pred)) {
        throw new Error('y_true and y_pred must be arrays');
      }
      if (y_true.length !== y_pred.length) {
        throw new Error('y_true and y_pred must have the same length');
      }

      let tp = 0, fn = 0;

      for (let i = 0; i < y_true.length; i++) {
        if (y_true[i] === 1 && y_pred[i] === 1) tp++;
        else if (y_true[i] === 1 && y_pred[i] === 0) fn++;
      }

      const denominator = tp + fn;
      if (denominator === 0) return 0;

      return tp / denominator;
    }
  });

  /**
   * sklearn_f1_score(y_true, y_pred) → number
   * F1 점수
   * F1 = 2 * (Precision * Recall) / (Precision + Recall)
   */
  registry.register({
    name: 'sklearn_f1_score',
    module: 'sklearn',
    executor: (args) => {
      const [y_true, y_pred] = args;

      if (!Array.isArray(y_true) || !Array.isArray(y_pred)) {
        throw new Error('y_true and y_pred must be arrays');
      }
      if (y_true.length !== y_pred.length) {
        throw new Error('y_true and y_pred must have the same length');
      }

      let tp = 0, fp = 0, fn = 0;

      for (let i = 0; i < y_true.length; i++) {
        if (y_true[i] === 1 && y_pred[i] === 1) tp++;
        else if (y_true[i] === 0 && y_pred[i] === 1) fp++;
        else if (y_true[i] === 1 && y_pred[i] === 0) fn++;
      }

      const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
      const recall = tp + fn === 0 ? 0 : tp / (tp + fn);

      if (precision + recall === 0) return 0;

      return 2 * (precision * recall) / (precision + recall);
    }
  });

  // ════════════════════════════════════════════════════════════════
  // Phase 5-A: Preprocessing Functions (데이터 전처리) - 4개
  // ════════════════════════════════════════════════════════════════

  /**
   * sklearn_standard_scaler_fit(X) → object
   * StandardScaler 학습
   * 각 특성의 평균과 표준편차를 계산하여 반환
   * X는 2D 배열: [[x11, x12, ...], [x21, x22, ...], ...]
   */
  registry.register({
    name: 'sklearn_standard_scaler_fit',
    module: 'sklearn',
    executor: (args) => {
      const [X] = args;

      if (!Array.isArray(X) || X.length === 0) {
        throw new Error('X must be a non-empty 2D array');
      }

      const n_features = (X[0] as any[]).length;
      const means: number[] = [];
      const stds: number[] = [];

      // 각 특성별 평균 계산
      for (let j = 0; j < n_features; j++) {
        let sum = 0;
        for (let i = 0; i < X.length; i++) {
          sum += (X[i] as any)[j];
        }
        means.push(sum / X.length);
      }

      // 각 특성별 표준편차 계산
      for (let j = 0; j < n_features; j++) {
        let sum_sq = 0;
        for (let i = 0; i < X.length; i++) {
          const diff = (X[i] as any)[j] - means[j];
          sum_sq += diff * diff;
        }
        const variance = sum_sq / X.length;
        stds.push(Math.sqrt(variance));
      }

      return { means, stds, n_features };
    }
  });

  /**
   * sklearn_standard_scaler_transform(X, params) → array
   * 학습된 Scaler로 변환
   * params: { means, stds, n_features }
   */
  registry.register({
    name: 'sklearn_standard_scaler_transform',
    module: 'sklearn',
    executor: (args) => {
      const [X, params] = args;

      if (!Array.isArray(X)) {
        throw new Error('X must be a 2D array');
      }

      const { means, stds } = params as any;
      const X_scaled: any[] = [];

      for (let i = 0; i < X.length; i++) {
        const row: number[] = [];
        for (let j = 0; j < (X[i] as any[]).length; j++) {
          const val = (X[i] as any)[j];
          const scaled = stds[j] === 0 ? 0 : (val - means[j]) / stds[j];
          row.push(scaled);
        }
        X_scaled.push(row);
      }

      return X_scaled;
    }
  });

  /**
   * sklearn_standard_scaler_fit_transform(X) → array
   * 학습과 변환을 동시에 수행
   */
  registry.register({
    name: 'sklearn_standard_scaler_fit_transform',
    module: 'sklearn',
    executor: (args) => {
      const [X] = args;

      // 먼저 fit 수행
      const fitResult = (registry as any).callNative('sklearn_standard_scaler_fit', [X]);
      // 그 다음 transform 수행
      return (registry as any).callNative('sklearn_standard_scaler_transform', [X, fitResult]);
    }
  });

  /**
   * sklearn_train_test_split(X, y, test_size) → object
   * 데이터를 학습/테스트 세트로 분할
   * test_size: 0.0 ~ 1.0 (예: 0.2 = 20% 테스트)
   * 반환: { X_train, X_test, y_train, y_test }
   */
  registry.register({
    name: 'sklearn_train_test_split',
    module: 'sklearn',
    executor: (args) => {
      const [X, y, test_size] = args;

      if (!Array.isArray(X) || !Array.isArray(y)) {
        throw new Error('X and y must be arrays');
      }
      if (X.length !== y.length) {
        throw new Error('X and y must have the same length');
      }

      const test_size_val = (test_size as number) || 0.2;
      const n_test = Math.floor(X.length * test_size_val);
      const n_train = X.length - n_test;

      // 인덱스 섞기 (Fisher-Yates)
      const indices: number[] = [];
      for (let i = 0; i < X.length; i++) {
        indices.push(i);
      }
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      const X_train = [];
      const X_test = [];
      const y_train = [];
      const y_test = [];

      for (let i = 0; i < n_train; i++) {
        X_train.push(X[indices[i]]);
        y_train.push(y[indices[i]]);
      }
      for (let i = n_train; i < X.length; i++) {
        X_test.push(X[indices[i]]);
        y_test.push(y[indices[i]]);
      }

      return { X_train, X_test, y_train, y_test };
    }
  });

  // ════════════════════════════════════════════════════════════════
  // Phase 6-A: Linear Models (선형 모델) - 4개
  // ════════════════════════════════════════════════════════════════

  /**
   * sklearn_linear_fit(X, y, learning_rate, epochs) → object
   * 선형 회귀 학습 (경사 하강법)
   * 반환: { weights, bias, loss_history }
   */
  registry.register({
    name: 'sklearn_linear_fit',
    module: 'sklearn',
    executor: (args) => {
      const [X, y, learning_rate = 0.01, epochs = 100] = args;

      if (!Array.isArray(X) || !Array.isArray(y)) {
        throw new Error('X and y must be arrays');
      }

      const n_samples = X.length;
      const n_features = (X[0] as any[]).length;

      let weights = new Array(n_features).fill(0);
      let bias = 0;
      const loss_history: number[] = [];

      for (let epoch = 0; epoch < epochs; epoch++) {
        let total_loss = 0;
        const dw = new Array(n_features).fill(0);
        let db = 0;

        // 각 샘플에 대해 경사 계산
        for (let i = 0; i < n_samples; i++) {
          const x_i = X[i] as number[];

          // 예측값 계산
          let y_pred = bias;
          for (let j = 0; j < n_features; j++) {
            y_pred += weights[j] * x_i[j];
          }

          // 손실 계산
          const error = y_pred - y[i];
          total_loss += error * error;

          // 경사 업데이트
          for (let j = 0; j < n_features; j++) {
            dw[j] += 2 * error * x_i[j];
          }
          db += 2 * error;
        }

        // 평균 손실
        const avg_loss = total_loss / n_samples;
        loss_history.push(avg_loss);

        // 가중치 업데이트
        for (let j = 0; j < n_features; j++) {
          weights[j] -= (learning_rate * dw[j]) / n_samples;
        }
        bias -= (learning_rate * db) / n_samples;
      }

      return { weights, bias, loss_history };
    }
  });

  /**
   * sklearn_linear_predict(X, model) → array
   * 선형 회귀 예측
   * model: { weights, bias }
   */
  registry.register({
    name: 'sklearn_linear_predict',
    module: 'sklearn',
    executor: (args) => {
      const [X, model] = args;

      if (!Array.isArray(X)) {
        throw new Error('X must be an array');
      }

      const { weights, bias } = model as any;
      const predictions: number[] = [];

      for (let i = 0; i < X.length; i++) {
        const x_i = X[i] as number[];
        let y_pred = bias;
        for (let j = 0; j < weights.length; j++) {
          y_pred += weights[j] * x_i[j];
        }
        predictions.push(y_pred);
      }

      return predictions;
    }
  });

  /**
   * sklearn_logistic_fit(X, y, learning_rate, epochs) → object
   * 로지스틱 회귀 학습 (경사 하강법)
   * 이진 분류용 (y: 0 또는 1)
   */
  registry.register({
    name: 'sklearn_logistic_fit',
    module: 'sklearn',
    executor: (args) => {
      const [X, y, learning_rate = 0.01, epochs = 100] = args;

      if (!Array.isArray(X) || !Array.isArray(y)) {
        throw new Error('X and y must be arrays');
      }

      const n_samples = X.length;
      const n_features = (X[0] as any[]).length;

      let weights = new Array(n_features).fill(0);
      let bias = 0;
      const loss_history: number[] = [];

      for (let epoch = 0; epoch < epochs; epoch++) {
        let total_loss = 0;
        const dw = new Array(n_features).fill(0);
        let db = 0;

        for (let i = 0; i < n_samples; i++) {
          const x_i = X[i] as number[];

          // 로짓 계산
          let z = bias;
          for (let j = 0; j < n_features; j++) {
            z += weights[j] * x_i[j];
          }

          // 시그모이드 함수
          const y_pred = 1 / (1 + Math.exp(-z));

          // 이진 크로스엔트로피 손실
          const epsilon = 1e-15;
          const y_clipped = Math.max(epsilon, Math.min(1 - epsilon, y_pred));
          const loss = -(y[i] * Math.log(y_clipped) + (1 - y[i]) * Math.log(1 - y_clipped));
          total_loss += loss;

          // 경사 계산
          const error = y_pred - y[i];
          for (let j = 0; j < n_features; j++) {
            dw[j] += error * x_i[j];
          }
          db += error;
        }

        // 평균 손실
        const avg_loss = total_loss / n_samples;
        loss_history.push(avg_loss);

        // 가중치 업데이트
        for (let j = 0; j < n_features; j++) {
          weights[j] -= (learning_rate * dw[j]) / n_samples;
        }
        bias -= (learning_rate * db) / n_samples;
      }

      return { weights, bias, loss_history };
    }
  });

  /**
   * sklearn_logistic_predict(X, model) → array
   * 로지스틱 회귀 예측 (확률)
   * 반환: 확률값 배열 (0.0 ~ 1.0)
   */
  registry.register({
    name: 'sklearn_logistic_predict',
    module: 'sklearn',
    executor: (args) => {
      const [X, model] = args;

      if (!Array.isArray(X)) {
        throw new Error('X must be an array');
      }

      const { weights, bias } = model as any;
      const predictions: number[] = [];

      for (let i = 0; i < X.length; i++) {
        const x_i = X[i] as number[];

        let z = bias;
        for (let j = 0; j < weights.length; j++) {
          z += weights[j] * x_i[j];
        }

        // 시그모이드
        const y_pred = 1 / (1 + Math.exp(-z));
        predictions.push(y_pred);
      }

      return predictions;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // Phase 6-B: Clustering (군집화) - 2개
  // ════════════════════════════════════════════════════════════════

  /**
   * sklearn_kmeans_fit(X, k, max_iter, random_state) → object
   * K-Means 클러스터링
   * 반환: { centers, labels, inertia }
   */
  registry.register({
    name: 'sklearn_kmeans_fit',
    module: 'sklearn',
    executor: (args) => {
      const [X, k = 3, max_iter = 100, random_state = 42] = args;

      if (!Array.isArray(X) || X.length === 0) {
        throw new Error('X must be a non-empty array');
      }

      const n_samples = X.length;
      const n_features = (X[0] as any[]).length;

      // 초기 중심점 무작위 선택
      const centers: any[] = [];
      const indices = new Set<number>();
      while (centers.length < k) {
        const idx = Math.floor(Math.random() * n_samples);
        if (!indices.has(idx)) {
          centers.push([...(X[idx] as any[])]);
          indices.add(idx);
        }
      }

      let labels = new Array(n_samples).fill(0);
      let inertia = Infinity;

      for (let iter = 0; iter < max_iter; iter++) {
        // 각 샘플을 가장 가까운 중심점에 할당
        let new_inertia = 0;
        const new_labels = new Array(n_samples);

        for (let i = 0; i < n_samples; i++) {
          const x_i = X[i] as number[];
          let min_dist = Infinity;
          let best_center = 0;

          for (let j = 0; j < k; j++) {
            let dist = 0;
            for (let d = 0; d < n_features; d++) {
              const diff = x_i[d] - centers[j][d];
              dist += diff * diff;
            }
            dist = Math.sqrt(dist);

            if (dist < min_dist) {
              min_dist = dist;
              best_center = j;
            }
          }

          new_labels[i] = best_center;
          new_inertia += min_dist * min_dist;
        }

        // 새로운 중심점 계산
        const new_centers: any[] = [];
        for (let j = 0; j < k; j++) {
          const count_members: number[] = [];
          const sum_members = new Array(n_features).fill(0);

          for (let i = 0; i < n_samples; i++) {
            if (new_labels[i] === j) {
              const x_i = X[i] as number[];
              for (let d = 0; d < n_features; d++) {
                sum_members[d] += x_i[d];
              }
              count_members.push(1);
            }
          }

          const n_members = count_members.length || 1;
          const center = sum_members.map((s) => s / n_members);
          new_centers.push(center);
        }

        centers.length = 0;
        centers.push(...new_centers);
        labels = new_labels;

        // 수렴 확인
        if (Math.abs(inertia - new_inertia) < 1e-6) {
          inertia = new_inertia;
          break;
        }
        inertia = new_inertia;
      }

      return { centers, labels, inertia };
    }
  });

  /**
   * sklearn_kmeans_predict(X, model) → array
   * 학습된 K-Means 모델로 예측
   * model: { centers }
   */
  registry.register({
    name: 'sklearn_kmeans_predict',
    module: 'sklearn',
    executor: (args) => {
      const [X, model] = args;

      if (!Array.isArray(X)) {
        throw new Error('X must be an array');
      }

      const { centers } = model as any;
      const n_features = (X[0] as any[]).length;
      const labels: number[] = [];

      for (let i = 0; i < X.length; i++) {
        const x_i = X[i] as number[];
        let min_dist = Infinity;
        let best_center = 0;

        for (let j = 0; j < centers.length; j++) {
          let dist = 0;
          for (let d = 0; d < n_features; d++) {
            const diff = x_i[d] - centers[j][d];
            dist += diff * diff;
          }
          dist = Math.sqrt(dist);

          if (dist < min_dist) {
            min_dist = dist;
            best_center = j;
          }
        }

        labels.push(best_center);
      }

      return labels;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // Phase 6-C: Neighbors (최근접 이웃) - 2개
  // ════════════════════════════════════════════════════════════════

  /**
   * sklearn_knn_fit(X, y) → object
   * KNN 모델 학습 (메모리 저장)
   * 반환: { X, y }
   */
  registry.register({
    name: 'sklearn_knn_fit',
    module: 'sklearn',
    executor: (args) => {
      const [X, y] = args;

      if (!Array.isArray(X) || !Array.isArray(y)) {
        throw new Error('X and y must be arrays');
      }

      // KNN은 게으른 학습: 단순히 데이터 저장
      return { X, y };
    }
  });

  /**
   * sklearn_knn_predict(X, model, k) → array
   * KNN 예측
   * model: { X, y }
   * k: 이웃 개수 (기본값: 3)
   */
  registry.register({
    name: 'sklearn_knn_predict',
    module: 'sklearn',
    executor: (args) => {
      const [X, model, k = 3] = args;

      if (!Array.isArray(X)) {
        throw new Error('X must be an array');
      }

      const { X: X_train, y: y_train } = model as any;
      const n_features = (X[0] as any[]).length;
      const predictions: any[] = [];

      for (let i = 0; i < X.length; i++) {
        const x_i = X[i] as number[];

        // 모든 훈련 샘플까지의 거리 계산
        const distances: { dist: number; label: any }[] = [];
        for (let j = 0; j < X_train.length; j++) {
          const x_j = X_train[j] as number[];
          let dist = 0;
          for (let d = 0; d < n_features; d++) {
            const diff = x_i[d] - x_j[d];
            dist += diff * diff;
          }
          distances.push({ dist: Math.sqrt(dist), label: y_train[j] });
        }

        // 거리로 정렬
        distances.sort((a, b) => a.dist - b.dist);

        // 가장 가까운 k개의 레이블 선택
        const k_neighbors = distances.slice(0, k).map((d) => d.label);

        // 다중 클래스 분류: 다수표 원칙
        // (숫자인 경우 평균, 카테고리인 경우 최빈값)
        const is_numeric = typeof k_neighbors[0] === 'number';

        if (is_numeric) {
          const sum = k_neighbors.reduce((a, b) => a + b, 0);
          predictions.push(sum / k);
        } else {
          // 최빈값 계산
          const counts: any = {};
          for (const label of k_neighbors) {
            counts[label] = (counts[label] || 0) + 1;
          }
          const most_common = Object.keys(counts).reduce((a, b) =>
            counts[a] > counts[b] ? a : b
          );
          predictions.push(most_common);
        }
      }

      return predictions;
    }
  });
}
