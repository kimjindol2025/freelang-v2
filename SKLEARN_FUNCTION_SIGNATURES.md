# FreeLang scikit-learn Function Signatures & Examples

## Phase 1: Preprocessing

### 1. StandardScaler - fit

**목적**: 표준화를 위한 통계값 (평균, 표준편차) 계산

**함수 서명**:
```typescript
function sklearn_scaler_fit(X: number[][]): {
  mean: number[]
  std: number[]
}
```

**매개변수**:
- `X`: 입력 데이터 (n_samples × n_features 2D 배열)

**반환값**:
- `mean`: 각 특성의 평균값 배열
- `std`: 각 특성의 표준편차 배열

**공식**:
```
mean[j] = Σ(X[i][j]) / n_samples
std[j] = sqrt(Σ(X[i][j] - mean[j])²) / n_samples)
```

**예제**:
```typescript
const X = [[1, 10], [2, 20], [3, 30]];
const scaler = sklearn_scaler_fit(X);
console.log(scaler);
// {mean: [2, 20], std: [0.816, 8.16]}
```

---

### 2. StandardScaler - transform

**목적**: 계산된 통계값을 사용하여 데이터 표준화 적용

**함수 서명**:
```typescript
function sklearn_scaler_transform(
  X: number[][],
  params: {mean: number[], std: number[]}
): number[][]
```

**매개변수**:
- `X`: 표준화할 데이터
- `params`: fit의 결과 {mean, std}

**반환값**:
- 표준화된 데이터 (2D 배열)

**공식**:
```
X_scaled[i][j] = (X[i][j] - mean[j]) / std[j]
```

**예제**:
```typescript
const X = [[1, 10], [2, 20], [3, 30]];
const scaler = sklearn_scaler_fit(X);
const X_scaled = sklearn_scaler_transform([[2, 20]], scaler);
console.log(X_scaled);  // [[0, 0]]
```

---

### 3. StandardScaler - fit_transform

**목적**: fit과 transform을 한 번에 수행

**함수 서명**:
```typescript
function sklearn_scaler_fit_transform(X: number[][]): {
  X_scaled: number[][]
  scaler: {mean: number[], std: number[]}
}
```

**매개변수**:
- `X`: 입력 데이터

**반환값**:
- `X_scaled`: 표준화된 데이터
- `scaler`: 재사용 가능한 스케일러 정보

**예제**:
```typescript
const X = [[1, 10], [2, 20], [3, 30]];
const {X_scaled, scaler} = sklearn_scaler_fit_transform(X);
console.log(X_scaled);
// [[-1.22, -1.22], [0, 0], [1.22, 1.22]]
```

---

### 4. MinMaxScaler - fit

**목적**: 정규화를 위한 최솟값, 최댓값 계산

**함수 서명**:
```typescript
function sklearn_minmax_fit(X: number[][]): {
  min: number[]
  max: number[]
}
```

**반환값**:
- `min`: 각 특성의 최솟값
- `max`: 각 특성의 최댓값

**예제**:
```typescript
const X = [[1, 10], [5, 20], [9, 30]];
const scaler = sklearn_minmax_fit(X);
console.log(scaler);
// {min: [1, 10], max: [9, 30]}
```

---

### 5. MinMaxScaler - transform

**목적**: 데이터를 [0, 1] 범위로 정규화

**함수 서명**:
```typescript
function sklearn_minmax_transform(
  X: number[][],
  params: {min: number[], max: number[]}
): number[][]
```

**공식**:
```
X_norm[i][j] = (X[i][j] - min[j]) / (max[j] - min[j])
```

**예제**:
```typescript
const X = [[1, 10], [5, 20], [9, 30]];
const scaler = sklearn_minmax_fit(X);
const X_norm = sklearn_minmax_transform([[5, 20]], scaler);
console.log(X_norm);  // [[0.5, 0.5]]
```

---

### 6. train_test_split

**목적**: 데이터를 학습/테스트 세트로 분할

**함수 서명**:
```typescript
function sklearn_train_test_split(
  X: number[][],
  y: number[],
  test_size?: number,    // Default: 0.2
  random_seed?: number   // Optional
): {
  X_train: number[][]
  X_test: number[][]
  y_train: number[]
  y_test: number[]
}
```

**매개변수**:
- `X`: 특성 데이터
- `y`: 레이블
- `test_size`: 테스트 비율 (0~1, 기본 0.2)
- `random_seed`: 무작위 시드 (재현성, 선택)

**알고리즘**: Knuth shuffle (Fisher-Yates)

**예제**:
```typescript
const X = [[1,2], [3,4], [5,6], [7,8], [9,10]];
const y = [0, 1, 0, 1, 0];

const split = sklearn_train_test_split(X, y, 0.2, 42);
console.log(split);
// {
//   X_train: [[3,4], [7,8], [1,2], [9,10]],
//   X_test: [[5,6]],
//   y_train: [1, 1, 0, 0],
//   y_test: [0]
// }
```

---

## Phase 2: Linear Models

### 7. Linear Regression - fit

**목적**: 선형 회귀 모델 학습

**함수 서명**:
```typescript
function sklearn_linear_fit(
  X: number[][],
  y: number[]
): {
  coef: number[]
  intercept: number
}
```

**알고리즘**: 정규 방정식
```
θ = (X^T X)^-1 X^T y
```

**반환값**:
- `coef`: 각 특성의 계수 [w1, w2, ...]
- `intercept`: 절편 (bias)

**모델**: y = coef @ X + intercept

**예제**:
```typescript
const X = [[1], [2], [3], [4], [5]];
const y = [2, 4, 6, 8, 10];  // y = 2*x

const model = sklearn_linear_fit(X, y);
console.log(model);
// {coef: [2], intercept: 0}
```

---

### 8. Linear Regression - predict

**목적**: 학습된 회귀 모델로 예측

**함수 서명**:
```typescript
function sklearn_linear_predict(
  X: number[][],
  model: {coef: number[], intercept: number}
): number[]
```

**공식**:
```
y_pred = X @ coef + intercept
```

**예제**:
```typescript
const model = {coef: [2], intercept: 0};
const y_pred = sklearn_linear_predict([[6], [7]], model);
console.log(y_pred);  // [12, 14]
```

---

### 9. Logistic Regression - fit

**목적**: 로지스틱 회귀 모델 학습 (이진 분류)

**함수 서명**:
```typescript
function sklearn_logistic_fit(
  X: number[][],
  y: number[],         // 0 또는 1
  learning_rate?: number,  // Default: 0.01
  epochs?: number          // Default: 100
): {
  coef: number[]
  intercept: number
  loss_history: number[]
}
```

**알고리즘**: 경사하강법 (Gradient Descent)

```
Sigmoid: σ(z) = 1 / (1 + e^-z)
Loss: -y*log(σ(z)) - (1-y)*log(1-σ(z))
Update: θ -= learning_rate * gradient / n_samples
```

**반환값**:
- `coef`: 특성 가중치
- `intercept`: 절편
- `loss_history`: 각 에포크의 손실값

**매개변수**:
- `learning_rate`: 경사하강법 스텝 크기 (기본 0.01)
- `epochs`: 반복 횟수 (기본 100)

**예제**:
```typescript
const X = [[1,1], [2,2], [3,3], [4,4], [5,5], [6,6]];
const y = [0, 0, 0, 1, 1, 1];

const model = sklearn_logistic_fit(X, y, 0.1, 1000);
console.log(model.loss_history[0]);  // 초기 손실
console.log(model.loss_history[999]);  // 최종 손실
console.log(model.coef);  // [w1, w2]
console.log(model.intercept);  // b
```

---

### 10. Logistic Regression - predict

**목적**: 이진 분류 (0 또는 1)

**함수 서명**:
```typescript
function sklearn_logistic_predict(
  X: number[][],
  model: {coef: number[], intercept: number}
): number[]  // 0 또는 1
```

**알고리즘**:
```
z = X @ coef + intercept
p = sigmoid(z)
pred = 1 if p >= 0.5 else 0
```

**예제**:
```typescript
const model = {coef: [1, 1], intercept: -3};
const pred = sklearn_logistic_predict([[2, 2]], model);
console.log(pred);  // [1]
// z = 2*1 + 2*1 - 3 = 1
// σ(1) = 0.73 >= 0.5 → 1
```

---

### 11. Logistic Regression - predict_proba

**목적**: 클래스 확률 예측

**함수 서명**:
```typescript
function sklearn_logistic_predict_proba(
  X: number[][],
  model: {coef: number[], intercept: number}
): number[]  // 0~1 범위
```

**반환값**: P(y=1 | X) 확률

**공식**:
```
z = X @ coef + intercept
probability = sigmoid(z) = 1 / (1 + e^-z)
```

**예제**:
```typescript
const model = {coef: [1, 1], intercept: -3};
const proba = sklearn_logistic_predict_proba([[2, 2]], model);
console.log(proba);  // [0.731]
// P(y=1) = 0.731, P(y=0) = 1 - 0.731 = 0.269
```

---

## Phase 3-4: Clustering & KNN (기존)

[이미 구현됨, 생략]

- sklearn_kmeans_fit, predict, fit_predict, inertia
- sklearn_knn_fit, predict, classify, neighbors

---

## 🎯 Complete Pipeline Example

```typescript
// 1. 데이터 준비
const X = [
  [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
  [6, 7], [7, 8], [8, 9], [9, 10], [10, 11]
];
const y = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];

// 2. 분할
const split = sklearn_train_test_split(X, y, 0.3, 42);
const {X_train, X_test, y_train, y_test} = split;

// 3. 전처리
const scaler = sklearn_scaler_fit(X_train);
const X_train_scaled = sklearn_scaler_transform(X_train, scaler);
const X_test_scaled = sklearn_scaler_transform(X_test, scaler);

// 4. 학습
const model = sklearn_logistic_fit(
  X_train_scaled,
  y_train,
  0.01,
  1000
);

// 5. 예측
const y_pred = sklearn_logistic_predict(X_test_scaled, model);
const y_proba = sklearn_logistic_predict_proba(X_test_scaled, model);

// 6. 평가
const accuracy = y_test.filter((y, i) => y === y_pred[i]).length / y_test.length;
console.log('Accuracy:', accuracy);
console.log('Predictions:', y_pred);
console.log('Probabilities:', y_proba);
```

---

## 📋 Parameter Defaults

| Function | Parameter | Default | Range |
|----------|-----------|---------|-------|
| train_test_split | test_size | 0.2 | (0, 1) |
| train_test_split | random_seed | undefined | any int |
| logistic_fit | learning_rate | 0.01 | (0, ∞) |
| logistic_fit | epochs | 100 | [1, ∞) |
| logistic_predict | threshold | 0.5 | (0, 1) |

---

## 🔍 Type Annotations

```typescript
// Preprocessors
type StandardScaler = {mean: number[], std: number[]}
type MinMaxScaler = {min: number[], max: number[]}

// Models
type RegressionModel = {coef: number[], intercept: number}
type ClassifierModel = {
  coef: number[],
  intercept: number,
  loss_history?: number[]
}

// Data
type Features = number[][]      // (n_samples, n_features)
type Labels = number[]          // (n_samples,)
type Predictions = number[]     // (n_samples,)
```

---

**Updated**: 2026-03-06
**Total Functions**: 19
**Phase 1-2 Completeness**: 100%
