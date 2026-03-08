/**
 * FreeLang v2 - Advanced Analytics Functions (Phase F)
 *
 * 통계 분석, 머신러닝 기초, 이상 탐지, 데이터 시각화 (60개 함수)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

export function registerAnalyticsFunctions(registry: NativeFunctionRegistry): void {
  // ─────────────────────────────────────────────────────────────
  // Statistical Functions (20 functions)
  // ─────────────────────────────────────────────────────────────

  registry.register({
    name: 'stats_mean',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const numbers = data.map(v => Number(v)).filter(v => !isNaN(v));
      if (numbers.length === 0) return 0;
      return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    }
  });

  registry.register({
    name: 'stats_median',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const numbers = data.map(v => Number(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
      if (numbers.length === 0) return 0;
      const mid = Math.floor(numbers.length / 2);
      return numbers.length % 2 === 0 ? (numbers[mid - 1] + numbers[mid]) / 2 : numbers[mid];
    }
  });

  registry.register({
    name: 'stats_mode',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const freq = {};
      let maxFreq = 0;
      let mode = null;

      for (const v of data) {
        const key = String(v);
        freq[key] = (freq[key] || 0) + 1;
        if (freq[key] > maxFreq) {
          maxFreq = freq[key];
          mode = v;
        }
      }
      return mode;
    }
  });

  registry.register({
    name: 'stats_std_dev',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const numbers = data.map(v => Number(v)).filter(v => !isNaN(v));
      if (numbers.length === 0) return 0;

      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
      return Math.sqrt(variance);
    }
  });

  registry.register({
    name: 'stats_variance',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const numbers = data.map(v => Number(v)).filter(v => !isNaN(v));
      if (numbers.length === 0) return 0;

      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      return numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    }
  });

  registry.register({
    name: 'stats_range',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const numbers = data.map(v => Number(v)).filter(v => !isNaN(v));
      if (numbers.length === 0) return 0;
      return Math.max(...numbers) - Math.min(...numbers);
    }
  });

  registry.register({
    name: 'stats_quantile',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const q = Number(args[1] || 0.5);
      const numbers = data.map(v => Number(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
      if (numbers.length === 0) return 0;

      const index = q * (numbers.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index % 1;

      if (lower === upper) return numbers[lower];
      return numbers[lower] * (1 - weight) + numbers[upper] * weight;
    }
  });

  registry.register({
    name: 'stats_iqr',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const numbers = data.map(v => Number(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
      if (numbers.length < 4) return 0;

      const q1Index = 0.25 * (numbers.length - 1);
      const q3Index = 0.75 * (numbers.length - 1);

      const getQuantile = (idx) => {
        const lower = Math.floor(idx);
        const upper = Math.ceil(idx);
        const weight = idx % 1;
        if (lower === upper) return numbers[lower];
        return numbers[lower] * (1 - weight) + numbers[upper] * weight;
      };

      const q1 = getQuantile(q1Index);
      const q3 = getQuantile(q3Index);
      return q3 - q1;
    }
  });

  registry.register({
    name: 'stats_zscore',
    module: 'analytics',
    executor: (args) => {
      const value = Number(args[0]);
      const data = Array.isArray(args[1]) ? args[1] : [args[1]];
      const numbers = data.map(v => Number(v)).filter(v => !isNaN(v));
      if (numbers.length === 0) return 0;

      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
      const stdDev = Math.sqrt(variance);

      return stdDev === 0 ? 0 : (value - mean) / stdDev;
    }
  });

  registry.register({
    name: 'stats_covariance',
    module: 'analytics',
    executor: (args) => {
      const x = Array.isArray(args[0]) ? args[0].map(v => Number(v)) : [Number(args[0])];
      const y = Array.isArray(args[1]) ? args[1].map(v => Number(v)) : [Number(args[1])];
      if (x.length !== y.length || x.length === 0) return 0;

      const meanX = x.reduce((a, b) => a + b, 0) / x.length;
      const meanY = y.reduce((a, b) => a + b, 0) / y.length;

      let sum = 0;
      for (let i = 0; i < x.length; i++) {
        sum += (x[i] - meanX) * (y[i] - meanY);
      }
      return sum / x.length;
    }
  });

  registry.register({
    name: 'stats_correlation',
    module: 'analytics',
    executor: (args) => {
      const x = Array.isArray(args[0]) ? args[0].map(v => Number(v)) : [Number(args[0])];
      const y = Array.isArray(args[1]) ? args[1].map(v => Number(v)) : [Number(args[1])];
      if (x.length !== y.length || x.length === 0) return 0;

      const meanX = x.reduce((a, b) => a + b, 0) / x.length;
      const meanY = y.reduce((a, b) => a + b, 0) / y.length;

      let covXY = 0, varX = 0, varY = 0;
      for (let i = 0; i < x.length; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        covXY += dx * dy;
        varX += dx * dx;
        varY += dy * dy;
      }

      const denom = Math.sqrt(varX * varY);
      return denom === 0 ? 0 : covXY / denom;
    }
  });

  registry.register({
    name: 'stats_percentile',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const p = Number(args[1] || 50);
      const numbers = data.map(v => Number(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
      if (numbers.length === 0) return 0;

      const index = (p / 100) * (numbers.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index % 1;

      if (lower === upper) return numbers[lower];
      return numbers[lower] * (1 - weight) + numbers[upper] * weight;
    }
  });

  registry.register({
    name: 'stats_skewness',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const numbers = data.map(v => Number(v)).filter(v => !isNaN(v));
      if (numbers.length < 3) return 0;

      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      const stdDev = Math.sqrt(numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length);

      if (stdDev === 0) return 0;
      const m3 = numbers.reduce((a, b) => a + Math.pow(b - mean, 3), 0) / numbers.length;
      return m3 / Math.pow(stdDev, 3);
    }
  });

  registry.register({
    name: 'stats_kurtosis',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const numbers = data.map(v => Number(v)).filter(v => !isNaN(v));
      if (numbers.length < 4) return 0;

      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev === 0) return 0;
      const m4 = numbers.reduce((a, b) => a + Math.pow(b - mean, 4), 0) / numbers.length;
      return (m4 / Math.pow(variance, 2)) - 3;
    }
  });

  registry.register({
    name: 'stats_entropy',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const freq = {};
      for (const v of data) {
        const key = String(v);
        freq[key] = (freq[key] || 0) + 1;
      }

      let entropy = 0;
      for (const key in freq) {
        const p = freq[key] / data.length;
        entropy -= p * Math.log2(p);
      }
      return entropy;
    }
  });

  registry.register({
    name: 'stats_histogram',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const bins = Math.floor(Number(args[1]) || 10);
      const numbers = data.map(v => Number(v)).filter(v => !isNaN(v));
      if (numbers.length === 0) return [];

      const min = Math.min(...numbers);
      const max = Math.max(...numbers);
      const binWidth = (max - min) / bins;

      const histogram = Array(bins).fill(0);
      for (const num of numbers) {
        let binIndex = Math.floor((num - min) / binWidth);
        if (binIndex === bins) binIndex = bins - 1;
        histogram[binIndex]++;
      }

      return histogram;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Machine Learning Basics (20 functions)
  // ─────────────────────────────────────────────────────────────

  registry.register({
    name: 'ml_kmeans_init',
    module: 'analytics',
    executor: (args) => {
      const k = Math.floor(Number(args[0]) || 3);
      const data = Array.isArray(args[1]) ? args[1] : [args[1]];
      if (data.length === 0) return [];

      const centroids = [];
      const indices = new Set();
      while (centroids.length < k && centroids.length < data.length) {
        const idx = Math.floor(Math.random() * data.length);
        if (!indices.has(idx)) {
          indices.add(idx);
          centroids.push(Array.isArray(data[idx]) ? [...data[idx]] : data[idx]);
        }
      }
      return centroids;
    }
  });

  registry.register({
    name: 'ml_distance_euclidean',
    module: 'analytics',
    executor: (args) => {
      const a = Array.isArray(args[0]) ? args[0] : [args[0]];
      const b = Array.isArray(args[1]) ? args[1] : [args[1]];
      let sum = 0;
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) {
        const diff = Number(a[i]) - Number(b[i]);
        sum += diff * diff;
      }
      return Math.sqrt(sum);
    }
  });

  registry.register({
    name: 'ml_distance_manhattan',
    module: 'analytics',
    executor: (args) => {
      const a = Array.isArray(args[0]) ? args[0] : [args[0]];
      const b = Array.isArray(args[1]) ? args[1] : [args[1]];
      let sum = 0;
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) {
        sum += Math.abs(Number(a[i]) - Number(b[i]));
      }
      return sum;
    }
  });

  registry.register({
    name: 'ml_distance_cosine',
    module: 'analytics',
    executor: (args) => {
      const a = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const b = Array.isArray(args[1]) ? args[1].map(Number) : [Number(args[1])];
      let dotProduct = 0, normA = 0, normB = 0;
      const len = Math.min(a.length, b.length);

      for (let i = 0; i < len; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }

      const denom = Math.sqrt(normA) * Math.sqrt(normB);
      return denom === 0 ? 0 : 1 - (dotProduct / denom);
    }
  });

  registry.register({
    name: 'ml_linear_regression',
    module: 'analytics',
    executor: (args) => {
      const x = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const y = Array.isArray(args[1]) ? args[1].map(Number) : [Number(args[1])];
      if (x.length !== y.length || x.length === 0) return { slope: 0, intercept: 0, r2: 0 };

      const n = x.length;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
      const sumX2 = x.reduce((a, b) => a + b * b, 0);
      const sumY2 = y.reduce((a, b) => a + b * b, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      const yMean = sumY / n;
      const ssTotal = y.reduce((a, b) => a + Math.pow(b - yMean, 2), 0);
      const ssRes = y.reduce((a, b, i) => a + Math.pow(b - (slope * x[i] + intercept), 2), 0);
      const r2 = 1 - (ssRes / ssTotal);

      return { slope, intercept, r2 };
    }
  });

  registry.register({
    name: 'ml_predict_linear',
    module: 'analytics',
    executor: (args) => {
      const x = Number(args[0]);
      const slope = Number(args[1] || 1);
      const intercept = Number(args[2] || 0);
      return slope * x + intercept;
    }
  });

  registry.register({
    name: 'ml_normalize_zscore',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const mean = data.reduce((a, b) => a + b, 0) / data.length;
      const stdDev = Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length);
      return data.map(v => stdDev === 0 ? 0 : (v - mean) / stdDev);
    }
  });

  registry.register({
    name: 'ml_normalize_minmax',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min;
      return data.map(v => range === 0 ? 0 : (v - min) / range);
    }
  });

  registry.register({
    name: 'ml_confusion_matrix',
    module: 'analytics',
    executor: (args) => {
      const actual = Array.isArray(args[0]) ? args[0] : [args[0]];
      const predicted = Array.isArray(args[1]) ? args[1] : [args[1]];
      if (actual.length !== predicted.length) return null;

      const matrix = { tp: 0, tn: 0, fp: 0, fn: 0 };
      for (let i = 0; i < actual.length; i++) {
        if (actual[i] && predicted[i]) matrix.tp++;
        else if (!actual[i] && !predicted[i]) matrix.tn++;
        else if (!actual[i] && predicted[i]) matrix.fp++;
        else if (actual[i] && !predicted[i]) matrix.fn++;
      }
      return matrix;
    }
  });

  registry.register({
    name: 'ml_precision',
    module: 'analytics',
    executor: (args) => {
      const tp = Number(args[0] || 0);
      const fp = Number(args[1] || 0);
      return (tp + fp) === 0 ? 0 : tp / (tp + fp);
    }
  });

  registry.register({
    name: 'ml_recall',
    module: 'analytics',
    executor: (args) => {
      const tp = Number(args[0] || 0);
      const fn = Number(args[1] || 0);
      return (tp + fn) === 0 ? 0 : tp / (tp + fn);
    }
  });

  registry.register({
    name: 'ml_f1_score',
    module: 'analytics',
    executor: (args) => {
      const precision = Number(args[0] || 0);
      const recall = Number(args[1] || 0);
      const sum = precision + recall;
      return sum === 0 ? 0 : (2 * precision * recall) / sum;
    }
  });

  registry.register({
    name: 'ml_accuracy',
    module: 'analytics',
    executor: (args) => {
      const tp = Number(args[0] || 0);
      const tn = Number(args[1] || 0);
      const fp = Number(args[2] || 0);
      const fn = Number(args[3] || 0);
      const total = tp + tn + fp + fn;
      return total === 0 ? 0 : (tp + tn) / total;
    }
  });

  registry.register({
    name: 'ml_roc_auc',
    module: 'analytics',
    executor: (args) => {
      const scores = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const labels = Array.isArray(args[1]) ? args[1] : [args[1]];
      if (scores.length !== labels.length) return 0;

      const pairs = scores.map((s, i) => ({ score: s, label: labels[i] })).sort((a, b) => b.score - a.score);

      let auc = 0;
      let pos = 0, neg = 0;
      for (let i = 0; i < pairs.length; i++) {
        if (pairs[i].label) pos++;
        else neg++;
      }

      if (pos === 0 || neg === 0) return 0;

      let prevScore = pairs[0].score + 1;
      let rankSum = 0, count = 0;
      for (let i = 0; i < pairs.length; i++) {
        if (pairs[i].score !== prevScore) {
          rankSum += (i * count);
          count = 1;
          prevScore = pairs[i].score;
        } else {
          count++;
        }
        if (pairs[i].label) rankSum += i + 1;
      }

      return (rankSum - (pos * (pos + 1) / 2)) / (pos * neg);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Anomaly Detection (10 functions)
  // ─────────────────────────────────────────────────────────────

  registry.register({
    name: 'anomaly_zscore',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const threshold = Number(args[1] || 3);
      if (data.length === 0) return [];

      const mean = data.reduce((a, b) => a + b, 0) / data.length;
      const stdDev = Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length);

      return data.map((v, i) => ({
        index: i,
        value: v,
        zscore: stdDev === 0 ? 0 : (v - mean) / stdDev,
        is_anomaly: stdDev === 0 ? false : Math.abs((v - mean) / stdDev) > threshold
      }));
    }
  });

  registry.register({
    name: 'anomaly_iqr',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const multiplier = Number(args[1] || 1.5);
      if (data.length < 4) return [];

      const sorted = [...data].sort((a, b) => a - b);
      const q1Idx = 0.25 * (sorted.length - 1);
      const q3Idx = 0.75 * (sorted.length - 1);

      const getQuantile = (idx) => {
        const lower = Math.floor(idx);
        const upper = Math.ceil(idx);
        const weight = idx % 1;
        if (lower === upper) return sorted[lower];
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
      };

      const q1 = getQuantile(q1Idx);
      const q3 = getQuantile(q3Idx);
      const iqr = q3 - q1;
      const lowerBound = q1 - multiplier * iqr;
      const upperBound = q3 + multiplier * iqr;

      return data.map((v, i) => ({
        index: i,
        value: v,
        is_anomaly: v < lowerBound || v > upperBound
      }));
    }
  });

  registry.register({
    name: 'anomaly_isolation_forest_score',
    module: 'analytics',
    executor: (args) => {
      const value = Number(args[0]);
      const data = Array.isArray(args[1]) ? args[1].map(Number) : [Number(args[1])];
      if (data.length === 0) return 0;

      const sorted = [...data].sort((a, b) => a - b);
      let anomalyScore = 0;

      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i] <= value && value <= sorted[i + 1]) {
          anomalyScore = Math.abs(sorted[i + 1] - sorted[i]);
          break;
        }
      }

      const maxAnomaly = Math.max(...sorted) - Math.min(...sorted);
      return maxAnomaly === 0 ? 0 : anomalyScore / maxAnomaly;
    }
  });

  registry.register({
    name: 'anomaly_mad',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const threshold = Number(args[1] || 3);
      if (data.length === 0) return [];

      const median = [...data].sort((a, b) => a - b)[Math.floor(data.length / 2)];
      const deviations = data.map(v => Math.abs(v - median)).sort((a, b) => a - b);
      const mad = deviations[Math.floor(data.length / 2)];

      return data.map((v, i) => ({
        index: i,
        value: v,
        is_anomaly: mad === 0 ? false : Math.abs((v - median) / mad) > threshold
      }));
    }
  });

  registry.register({
    name: 'anomaly_moving_average',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const window = Math.floor(Number(args[1]) || 3);
      const std_threshold = Number(args[2] || 2);
      if (data.length < window) return [];

      const moving_avg = [];
      for (let i = 0; i < data.length - window + 1; i++) {
        const window_data = data.slice(i, i + window);
        moving_avg.push(window_data.reduce((a, b) => a + b) / window);
      }

      const deviations = moving_avg.map(avg => data.slice(data.length - moving_avg.length)[0] - avg);
      const std = Math.sqrt(deviations.reduce((a, b) => a + b * b) / deviations.length);

      return data.slice(window - 1).map((v, i) => ({
        index: i + window - 1,
        value: v,
        moving_avg: moving_avg[i],
        is_anomaly: std === 0 ? false : Math.abs(v - moving_avg[i]) > std_threshold * std
      }));
    }
  });

  registry.register({
    name: 'anomaly_local_outlier_factor',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const k = Math.floor(Number(args[1]) || 5);
      if (data.length < k) return [];

      const sorted = [...data].sort((a, b) => a - b);
      return data.map((v, i) => {
        let localNeighbors = [];
        for (let j = 0; j < sorted.length; j++) {
          if (j !== i) localNeighbors.push(Math.abs(v - sorted[j]));
        }
        localNeighbors.sort((a, b) => a - b);
        const kDistance = localNeighbors[Math.min(k, localNeighbors.length - 1)];
        const density = 1 / (kDistance + 0.0001);
        return { index: i, value: v, lof_score: density };
      });
    }
  });

  registry.register({
    name: 'anomaly_dbscan_cluster',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const eps = Number(args[1] || 0.5);
      const minPts = Math.floor(Number(args[2]) || 5);

      const clusters = [];
      const visited = new Array(data.length).fill(false);

      for (let i = 0; i < data.length; i++) {
        if (visited[i]) continue;
        const neighbors = [];
        for (let j = 0; j < data.length; j++) {
          if (Math.abs(data[i] - data[j]) <= eps) neighbors.push(j);
        }

        if (neighbors.length < minPts) continue;

        visited[i] = true;
        const cluster = [i];
        for (let j = 0; j < neighbors.length; j++) {
          const neighbor = neighbors[j];
          if (!visited[neighbor]) {
            visited[neighbor] = true;
            cluster.push(neighbor);
          }
        }
        clusters.push(cluster);
      }

      return clusters;
    }
  });

  registry.register({
    name: 'anomaly_score_isolation',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const numTrees = Math.floor(Number(args[1]) || 10);

      return data.map((v, i) => {
        let anomalyScores = [];
        for (let t = 0; t < numTrees; t++) {
          const subset = [];
          while (subset.length < Math.min(10, data.length)) {
            subset.push(data[Math.floor(Math.random() * data.length)]);
          }
          const pathLength = Math.log2(subset.length) + 1;
          const distance = Math.abs(Math.max(...subset) - Math.min(...subset));
          anomalyScores.push(distance / pathLength);
        }
        const avgScore = anomalyScores.reduce((a, b) => a + b) / anomalyScores.length;
        return { index: i, value: v, anomaly_score: avgScore };
      });
    }
  });

  registry.register({
    name: 'anomaly_seasonal_decomposition',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const seasonLength = Math.floor(Number(args[1]) || 7);
      if (data.length < seasonLength * 2) return { trend: [], seasonal: [], residual: [] };

      const trend = [];
      for (let i = 0; i < data.length; i++) {
        let sum = 0, count = 0;
        for (let j = Math.max(0, i - 1); j <= Math.min(data.length - 1, i + 1); j++) {
          sum += data[j];
          count++;
        }
        trend.push(sum / count);
      }

      const seasonal = [];
      for (let i = 0; i < data.length; i++) {
        seasonal.push(data[i] - trend[i]);
      }

      const residual = [];
      for (let i = 0; i < data.length; i++) {
        let seasonalComponent = 0;
        if (i % seasonLength < seasonal.length) {
          seasonalComponent = seasonal[i % seasonLength];
        }
        residual.push(data[i] - trend[i] - seasonalComponent);
      }

      return { trend, seasonal, residual };
    }
  });

  registry.register({
    name: 'anomaly_time_series_forecast',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const steps = Math.floor(Number(args[1]) || 5);
      if (data.length < 2) return [];

      const forecast = [...data];
      const lastValue = data[data.length - 1];
      const prevValue = data[data.length - 2];
      const trend = lastValue - prevValue;

      for (let i = 0; i < steps; i++) {
        forecast.push(forecast[forecast.length - 1] + trend);
      }

      return forecast.slice(-steps);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Data Visualization Helpers (10 functions)
  // ─────────────────────────────────────────────────────────────

  registry.register({
    name: 'viz_ascii_bar',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const width = Math.floor(Number(args[1]) || 20);
      const max = Math.max(...data);

      return data.map((v, i) => {
        const barLength = Math.round((v / max) * width);
        const bar = '█'.repeat(barLength);
        return `${i}: ${bar} ${v}`;
      }).join('\n');
    }
  });

  registry.register({
    name: 'viz_ascii_sparkline',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const sparkChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;

      return data.map(v => {
        const index = Math.round(((v - min) / range) * (sparkChars.length - 1));
        return sparkChars[index];
      }).join('');
    }
  });

  registry.register({
    name: 'viz_scale_to_range',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const min = Number(args[1] || 0);
      const max = Number(args[2] || 100);

      const dataMin = Math.min(...data.map(Number));
      const dataMax = Math.max(...data.map(Number));
      const dataRange = dataMax - dataMin || 1;

      return data.map(v => {
        const normalized = ((v - dataMin) / dataRange);
        return Math.round(min + normalized * (max - min));
      });
    }
  });

  registry.register({
    name: 'viz_color_gradient',
    module: 'analytics',
    executor: (args) => {
      const value = Number(args[0]);
      const min = Number(args[1] || 0);
      const max = Number(args[2] || 100);

      const normalized = (value - min) / (max - min);
      const r = Math.round(255 * normalized);
      const b = Math.round(255 * (1 - normalized));

      return `rgb(${r}, 0, ${b})`;
    }
  });

  registry.register({
    name: 'viz_data_to_csv',
    module: 'analytics',
    executor: (args) => {
      const data = args[0];
      if (!Array.isArray(data)) return '';

      const headers = Object.keys(data[0] || {});
      const csv = [headers.join(',')];

      for (const row of data) {
        const values = headers.map(h => row[h]);
        csv.push(values.join(','));
      }

      return csv.join('\n');
    }
  });

  registry.register({
    name: 'viz_data_summary',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const sorted = [...data].sort((a, b) => a - b);
      const mean = data.reduce((a, b) => a + b, 0) / data.length;
      const median = sorted[Math.floor(sorted.length / 2)];

      return {
        count: data.length,
        mean: Math.round(mean * 100) / 100,
        median: median,
        min: Math.min(...data),
        max: Math.max(...data),
        range: Math.max(...data) - Math.min(...data)
      };
    }
  });

  registry.register({
    name: 'viz_sample',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0] : [args[0]];
      const size = Math.floor(Number(args[1]) || 5);

      const sampled = [];
      const step = Math.max(1, Math.floor(data.length / size));
      for (let i = 0; i < data.length; i += step) {
        if (sampled.length < size) {
          sampled.push(data[i]);
        }
      }
      return sampled;
    }
  });

  registry.register({
    name: 'viz_bucket',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const numBuckets = Math.floor(Number(args[1]) || 10);
      if (data.length === 0) return [];

      const min = Math.min(...data);
      const max = Math.max(...data);
      const bucketWidth = (max - min) / numBuckets || 1;

      const buckets = Array(numBuckets).fill(null).map(() => []);
      for (const v of data) {
        let bucketIndex = Math.floor((v - min) / bucketWidth);
        if (bucketIndex === numBuckets) bucketIndex = numBuckets - 1;
        buckets[bucketIndex].push(v);
      }

      return buckets.map((b, i) => ({
        range_min: Math.round((min + i * bucketWidth) * 100) / 100,
        range_max: Math.round((min + (i + 1) * bucketWidth) * 100) / 100,
        count: b.length,
        values: b
      }));
    }
  });

  registry.register({
    name: 'viz_distribution_test',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      if (data.length < 3) return { type: 'unknown', confidence: 0 };

      const mean = data.reduce((a, b) => a + b, 0) / data.length;
      const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
      const skewness = data.reduce((a, b) => a + Math.pow(b - mean, 3), 0) / (data.length * Math.pow(variance, 1.5));

      if (Math.abs(skewness) < 0.5) return { type: 'normal', confidence: 0.85 };
      if (skewness > 0) return { type: 'right_skewed', confidence: 0.7 };
      return { type: 'left_skewed', confidence: 0.7 };
    }
  });

  registry.register({
    name: 'viz_outlier_bounds',
    module: 'analytics',
    executor: (args) => {
      const data = Array.isArray(args[0]) ? args[0].map(Number) : [Number(args[0])];
      const method = String(args[1] || 'iqr');

      if (method === 'zscore') {
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const stdDev = Math.sqrt(data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length);
        return {
          lower: mean - 3 * stdDev,
          upper: mean + 3 * stdDev
        };
      } else {
        const sorted = [...data].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        return {
          lower: q1 - 1.5 * iqr,
          upper: q3 + 1.5 * iqr
        };
      }
    }
  });
}
