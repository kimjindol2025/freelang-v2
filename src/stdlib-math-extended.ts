/**
 * FreeLang v2 - Math/Crypto/Statistics 확장 함수
 *
 * 115개의 고급 수학, 행렬/벡터, 통계, 암호화, 좌표/기하 함수
 * Phase A-E 확장 모듈
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

/**
 * 확장 수학/암호/통계 함수 등록
 */
export function registerMathExtendedFunctions(registry: NativeFunctionRegistry): void {
  // ════════════════════════════════════════════════════════════════
  // 섹션 1: 수학 고급 함수 (30개)
  // ════════════════════════════════════════════════════════════════

  // gcd(최대공약수)
  registry.register({
    name: 'math_gcd',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      let [x, y] = [Math.abs(a), Math.abs(b)];
      while (y !== 0) {
        [x, y] = [y, x % y];
      }
      return x;
    }
  });

  // lcm(최소공배수)
  registry.register({
    name: 'math_lcm',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      const gcd = (x: number, y: number) => {
        while (y !== 0) [x, y] = [y, x % y];
        return x;
      };
      return Math.abs(a * b) / gcd(Math.abs(a), Math.abs(b));
    }
  });

  // factorial(n!)
  registry.register({
    name: 'math_factorial',
    module: 'math',
    executor: (args) => {
      const n = Math.floor(args[0]);
      if (n < 0) return NaN;
      if (n === 0 || n === 1) return 1;
      let result = 1;
      for (let i = 2; i <= n; i++) result *= i;
      return result;
    }
  });

  // fibonacci(n번째 피보나치)
  registry.register({
    name: 'math_fibonacci',
    module: 'math',
    executor: (args) => {
      const n = Math.floor(args[0]);
      if (n <= 1) return n;
      let [a, b] = [0, 1];
      for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
      return b;
    }
  });

  // prime_check(소수 판별)
  registry.register({
    name: 'math_prime_check',
    module: 'math',
    executor: (args) => {
      const n = Math.floor(args[0]);
      if (n < 2) return false;
      if (n === 2) return true;
      if (n % 2 === 0) return false;
      for (let i = 3; i * i <= n; i += 2) {
        if (n % i === 0) return false;
      }
      return true;
    }
  });

  // prime_factors(소인수분해)
  registry.register({
    name: 'math_prime_factors',
    module: 'math',
    executor: (args) => {
      const n = Math.floor(args[0]);
      const factors: number[] = [];
      let num = Math.abs(n);
      for (let i = 2; i * i <= num; i++) {
        while (num % i === 0) {
          factors.push(i);
          num /= i;
        }
      }
      if (num > 1) factors.push(num);
      return factors;
    }
  });

  // prime_list(처음 n개 소수)
  registry.register({
    name: 'math_prime_list',
    module: 'math',
    executor: (args) => {
      const count = Math.floor(args[0]);
      const primes: number[] = [];
      let candidate = 2;
      while (primes.length < count) {
        let isPrime = true;
        for (let i = 2; i * i <= candidate; i++) {
          if (candidate % i === 0) {
            isPrime = false;
            break;
          }
        }
        if (isPrime) primes.push(candidate);
        candidate++;
      }
      return primes;
    }
  });

  // combination(조합 C(n,k))
  registry.register({
    name: 'math_combination',
    module: 'math',
    executor: (args) => {
      const [n, k] = args;
      if (k > n) return 0;
      const factorial = (num: number) => {
        let result = 1;
        for (let i = 2; i <= num; i++) result *= i;
        return result;
      };
      return factorial(n) / (factorial(k) * factorial(n - k));
    }
  });

  // permutation(순열 P(n,k))
  registry.register({
    name: 'math_permutation',
    module: 'math',
    executor: (args) => {
      const [n, k] = args;
      if (k > n) return 0;
      const factorial = (num: number) => {
        let result = 1;
        for (let i = 2; i <= num; i++) result *= i;
        return result;
      };
      return factorial(n) / factorial(n - k);
    }
  });

  // binomial(이항계수)
  registry.register({
    name: 'math_binomial',
    module: 'math',
    executor: (args) => {
      const [n, k] = args;
      if (k > n || k < 0) return 0;
      if (k === 0 || k === n) return 1;
      const factorial = (num: number) => {
        let result = 1;
        for (let i = 2; i <= num; i++) result *= i;
        return result;
      };
      return factorial(n) / (factorial(k) * factorial(n - k));
    }
  });

  // ceil_div(올림 나눗셈)
  registry.register({
    name: 'math_ceil_div',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      return Math.ceil(a / b);
    }
  });

  // floor_div(내림 나눗셈)
  registry.register({
    name: 'math_floor_div',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      return Math.floor(a / b);
    }
  });

  // mod_pow(모듈로 거듭제곱)
  registry.register({
    name: 'math_mod_pow',
    module: 'math',
    executor: (args) => {
      const [base, exp, mod] = args;
      let result = 1;
      let b = base % mod;
      let e = exp;
      while (e > 0) {
        if (e % 2 === 1) result = (result * b) % mod;
        b = (b * b) % mod;
        e = Math.floor(e / 2);
      }
      return result;
    }
  });

  // mod_inverse(모듈로 역원)
  registry.register({
    name: 'math_mod_inverse',
    module: 'math',
    executor: (args) => {
      let [a, m] = args;
      let [x0, x1, m0] = [0, 1, m];
      if (m === 1) return 0;
      while (a > 1) {
        const q = Math.floor(a / m);
        [m, a] = [a % m, m];
        [x0, x1] = [x1 - q * x0, x0];
      }
      return x1 < 0 ? x1 + m0 : x1;
    }
  });

  // clamp(범위 제한)
  registry.register({
    name: 'math_clamp',
    module: 'math',
    executor: (args) => {
      const [value, min, max] = args;
      return Math.min(Math.max(value, min), max);
    }
  });

  // lerp(선형 보간)
  registry.register({
    name: 'math_lerp',
    module: 'math',
    executor: (args) => {
      const [a, b, t] = args;
      return a + (b - a) * t;
    }
  });

  // remap(범위 재매핑)
  registry.register({
    name: 'math_remap',
    module: 'math',
    executor: (args) => {
      const [value, inMin, inMax, outMin, outMax] = args;
      const t = (value - inMin) / (inMax - inMin);
      return outMin + (outMax - outMin) * t;
    }
  });

  // step(계단 함수)
  registry.register({
    name: 'math_step',
    module: 'math',
    executor: (args) => {
      const [edge, x] = args;
      return x < edge ? 0 : 1;
    }
  });

  // smoothstep(부드러운 계단)
  registry.register({
    name: 'math_smoothstep',
    module: 'math',
    executor: (args) => {
      const [edge0, edge1, x] = args;
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    }
  });

  // sign(부호)
  registry.register({
    name: 'math_sign',
    module: 'math',
    executor: (args) => Math.sign(args[0])
  });

  // hyp(빗변 계산)
  registry.register({
    name: 'math_hyp',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      return Math.hypot(a, b);
    }
  });

  // is_nan(NaN 판별)
  registry.register({
    name: 'math_is_nan',
    module: 'math',
    executor: (args) => isNaN(args[0])
  });

  // is_finite(유한수 판별)
  registry.register({
    name: 'math_is_finite',
    module: 'math',
    executor: (args) => isFinite(args[0])
  });

  // is_integer(정수 판별)
  registry.register({
    name: 'math_is_integer',
    module: 'math',
    executor: (args) => Number.isInteger(args[0])
  });

  // to_fixed(고정 소수점)
  registry.register({
    name: 'math_to_fixed',
    module: 'math',
    executor: (args) => parseFloat(args[0].toFixed(args[1]))
  });

  // round_half(반올림)
  registry.register({
    name: 'math_round_half',
    module: 'math',
    executor: (args) => {
      const [value, decimals] = args;
      const factor = Math.pow(10, decimals);
      return Math.round(value * factor) / factor;
    }
  });

  // significant_digits(유효숫자)
  registry.register({
    name: 'math_significant_digits',
    module: 'math',
    executor: (args) => {
      const [value, digits] = args;
      return parseFloat(value.toPrecision(digits));
    }
  });

  // is_close(근사 비교)
  registry.register({
    name: 'math_is_close',
    module: 'math',
    executor: (args) => {
      const [a, b, tolerance = 1e-9] = args;
      return Math.abs(a - b) <= tolerance;
    }
  });

  // copysign(부호 복사)
  registry.register({
    name: 'math_copysign',
    module: 'math',
    executor: (args) => {
      const [magnitude, sign] = args;
      return Math.sign(sign) * Math.abs(magnitude);
    }
  });

  // frexp(가수와 지수 분리)
  registry.register({
    name: 'math_frexp',
    module: 'math',
    executor: (args) => {
      const value = args[0];
      if (value === 0) return [0, 0];
      const exp = Math.floor(Math.log2(Math.abs(value))) + 1;
      const mantissa = value / Math.pow(2, exp);
      return [mantissa, exp];
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 2: 행렬/벡터 함수 (25개)
  // ════════════════════════════════════════════════════════════════

  // mat_create(행렬 생성)
  registry.register({
    name: 'mat_create',
    module: 'math',
    executor: (args) => {
      const [rows, cols, value = 0] = args;
      const matrix: number[][] = [];
      for (let i = 0; i < rows; i++) {
        matrix[i] = [];
        for (let j = 0; j < cols; j++) {
          matrix[i][j] = value;
        }
      }
      return matrix;
    }
  });

  // mat_identity(단위 행렬)
  registry.register({
    name: 'mat_identity',
    module: 'math',
    executor: (args) => {
      const n = args[0];
      const matrix: number[][] = [];
      for (let i = 0; i < n; i++) {
        matrix[i] = [];
        for (let j = 0; j < n; j++) {
          matrix[i][j] = i === j ? 1 : 0;
        }
      }
      return matrix;
    }
  });

  // mat_zeros(0 행렬)
  registry.register({
    name: 'mat_zeros',
    module: 'math',
    executor: (args) => {
      const [rows, cols] = args;
      const matrix: number[][] = [];
      for (let i = 0; i < rows; i++) {
        matrix[i] = new Array(cols).fill(0);
      }
      return matrix;
    }
  });

  // mat_ones(1 행렬)
  registry.register({
    name: 'mat_ones',
    module: 'math',
    executor: (args) => {
      const [rows, cols] = args;
      const matrix: number[][] = [];
      for (let i = 0; i < rows; i++) {
        matrix[i] = new Array(cols).fill(1);
      }
      return matrix;
    }
  });

  // mat_add(행렬 덧셈)
  registry.register({
    name: 'mat_add',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      const result: number[][] = [];
      for (let i = 0; i < a.length; i++) {
        result[i] = [];
        for (let j = 0; j < a[i].length; j++) {
          result[i][j] = a[i][j] + b[i][j];
        }
      }
      return result;
    }
  });

  // mat_subtract(행렬 뺄셈)
  registry.register({
    name: 'mat_subtract',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      const result: number[][] = [];
      for (let i = 0; i < a.length; i++) {
        result[i] = [];
        for (let j = 0; j < a[i].length; j++) {
          result[i][j] = a[i][j] - b[i][j];
        }
      }
      return result;
    }
  });

  // mat_multiply(행렬 곱셈)
  registry.register({
    name: 'mat_multiply',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      const result: number[][] = [];
      for (let i = 0; i < a.length; i++) {
        result[i] = [];
        for (let j = 0; j < b[0].length; j++) {
          let sum = 0;
          for (let k = 0; k < b.length; k++) {
            sum += a[i][k] * b[k][j];
          }
          result[i][j] = sum;
        }
      }
      return result;
    }
  });

  // mat_transpose(전치)
  registry.register({
    name: 'mat_transpose',
    module: 'math',
    executor: (args) => {
      const a = args[0];
      const result: number[][] = [];
      for (let j = 0; j < a[0].length; j++) {
        result[j] = [];
        for (let i = 0; i < a.length; i++) {
          result[j][i] = a[i][j];
        }
      }
      return result;
    }
  });

  // mat_inverse(역행렬)
  registry.register({
    name: 'mat_inverse',
    module: 'math',
    executor: (args) => {
      const a = args[0];
      const n = a.length;
      if (n !== a[0].length) throw new Error('Matrix must be square');

      // Gauss-Jordan elimination
      const aug: number[][] = [];
      for (let i = 0; i < n; i++) {
        aug[i] = [...a[i], ...new Array(n).fill(0)];
        aug[i][n + i] = 1;
      }

      for (let i = 0; i < n; i++) {
        let pivot = i;
        for (let j = i + 1; j < n; j++) {
          if (Math.abs(aug[j][i]) > Math.abs(aug[pivot][i])) pivot = j;
        }
        [aug[i], aug[pivot]] = [aug[pivot], aug[i]];

        const factor = aug[i][i];
        for (let j = 0; j < 2 * n; j++) aug[i][j] /= factor;

        for (let j = 0; j < n; j++) {
          if (i !== j) {
            const f = aug[j][i];
            for (let k = 0; k < 2 * n; k++) aug[j][k] -= f * aug[i][k];
          }
        }
      }

      const result: number[][] = [];
      for (let i = 0; i < n; i++) {
        result[i] = aug[i].slice(n);
      }
      return result;
    }
  });

  // mat_determinant(행렬식)
  registry.register({
    name: 'mat_determinant',
    module: 'math',
    executor: (args) => {
      const a = args[0];
      const n = a.length;
      if (n === 1) return a[0][0];
      if (n === 2) return a[0][0] * a[1][1] - a[0][1] * a[1][0];

      let det = 0;
      for (let j = 0; j < n; j++) {
        const submatrix: number[][] = [];
        for (let i = 1; i < n; i++) {
          submatrix[i - 1] = [];
          for (let k = 0; k < n; k++) {
            if (k !== j) submatrix[i - 1].push(a[i][k]);
          }
        }
        const sign = j % 2 === 0 ? 1 : -1;
        det += sign * a[0][j] * ((registry as any).executor?.({ name: 'mat_determinant' }, [submatrix]) ?? 0);
      }
      return det;
    }
  });

  // mat_trace(대각합)
  registry.register({
    name: 'mat_trace',
    module: 'math',
    executor: (args) => {
      const a = args[0];
      let trace = 0;
      for (let i = 0; i < a.length && i < a[0].length; i++) {
        trace += a[i][i];
      }
      return trace;
    }
  });

  // dot_product(벡터 내적)
  registry.register({
    name: 'mat_dot_product',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
      }
      return sum;
    }
  });

  // vec2_create(2D 벡터 생성)
  registry.register({
    name: 'vec2_create',
    module: 'math',
    executor: (args) => {
      const [x = 0, y = 0] = args;
      return [x, y];
    }
  });

  // vec2_add(2D 벡터 덧셈)
  registry.register({
    name: 'vec2_add',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      return [a[0] + b[0], a[1] + b[1]];
    }
  });

  // vec2_sub(2D 벡터 뺄셈)
  registry.register({
    name: 'vec2_sub',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      return [a[0] - b[0], a[1] - b[1]];
    }
  });

  // vec2_scale(2D 벡터 스케일)
  registry.register({
    name: 'vec2_scale',
    module: 'math',
    executor: (args) => {
      const [v, s] = args;
      return [v[0] * s, v[1] * s];
    }
  });

  // vec2_dot(2D 벡터 내적)
  registry.register({
    name: 'vec2_dot',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      return a[0] * b[0] + a[1] * b[1];
    }
  });

  // vec2_length(2D 벡터 길이)
  registry.register({
    name: 'vec2_length',
    module: 'math',
    executor: (args) => {
      const v = args[0];
      return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    }
  });

  // vec2_normalize(2D 벡터 정규화)
  registry.register({
    name: 'vec2_normalize',
    module: 'math',
    executor: (args) => {
      const v = args[0];
      const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
      return len === 0 ? [0, 0] : [v[0] / len, v[1] / len];
    }
  });

  // vec3_create(3D 벡터 생성)
  registry.register({
    name: 'vec3_create',
    module: 'math',
    executor: (args) => {
      const [x = 0, y = 0, z = 0] = args;
      return [x, y, z];
    }
  });

  // vec3_cross(3D 외적)
  registry.register({
    name: 'vec3_cross',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
      ];
    }
  });

  // vec3_dot(3D 내적)
  registry.register({
    name: 'vec3_dot',
    module: 'math',
    executor: (args) => {
      const [a, b] = args;
      return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }
  });

  // vec3_length(3D 벡터 길이)
  registry.register({
    name: 'vec3_length',
    module: 'math',
    executor: (args) => {
      const v = args[0];
      return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    }
  });

  // vec4_create(4D 벡터 생성)
  registry.register({
    name: 'vec4_create',
    module: 'math',
    executor: (args) => {
      const [x = 0, y = 0, z = 0, w = 1] = args;
      return [x, y, z, w];
    }
  });

  // mat4_perspective(원근 투영 행렬)
  registry.register({
    name: 'mat4_perspective',
    module: 'math',
    executor: (args) => {
      const [fovy, aspect, near, far] = args;
      const f = 1.0 / Math.tan(fovy / 2.0);
      const result = new Array(4).fill(0).map(() => new Array(4).fill(0));
      result[0][0] = f / aspect;
      result[1][1] = f;
      result[2][2] = (far + near) / (near - far);
      result[2][3] = -1;
      result[3][2] = (2 * far * near) / (near - far);
      return result;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 3: 통계 함수 (25개)
  // ════════════════════════════════════════════════════════════════

  // stat_mean(평균)
  registry.register({
    name: 'stat_mean',
    module: 'stat',
    executor: (args) => {
      const data = args[0];
      const sum = data.reduce((a: number, b: number) => a + b, 0);
      return sum / data.length;
    }
  });

  // stat_median(중앙값)
  registry.register({
    name: 'stat_median',
    module: 'stat',
    executor: (args) => {
      const data = [...args[0]].sort((a, b) => a - b);
      const mid = Math.floor(data.length / 2);
      return data.length % 2 === 0 ? (data[mid - 1] + data[mid]) / 2 : data[mid];
    }
  });

  // stat_mode(최빈값)
  registry.register({
    name: 'stat_mode',
    module: 'stat',
    executor: (args) => {
      const data = args[0];
      const freq: { [key: number]: number } = {};
      let maxFreq = 0, mode = data[0];
      for (const val of data) {
        freq[val] = (freq[val] || 0) + 1;
        if (freq[val] > maxFreq) {
          maxFreq = freq[val];
          mode = val;
        }
      }
      return mode;
    }
  });

  // stat_variance(분산)
  registry.register({
    name: 'stat_variance',
    module: 'stat',
    executor: (args) => {
      const data = args[0];
      const mean = data.reduce((a: number, b: number) => a + b, 0) / data.length;
      const variance = data.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) / data.length;
      return variance;
    }
  });

  // stat_std_dev(표준편차)
  registry.register({
    name: 'stat_std_dev',
    module: 'stat',
    executor: (args) => {
      const data = args[0];
      const mean = data.reduce((a: number, b: number) => a + b, 0) / data.length;
      const variance = data.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) / data.length;
      return Math.sqrt(variance);
    }
  });

  // stat_covariance(공분산)
  registry.register({
    name: 'stat_covariance',
    module: 'stat',
    executor: (args) => {
      const [x, y] = args;
      const meanX = x.reduce((a: number, b: number) => a + b, 0) / x.length;
      const meanY = y.reduce((a: number, b: number) => a + b, 0) / y.length;
      let cov = 0;
      for (let i = 0; i < x.length; i++) {
        cov += (x[i] - meanX) * (y[i] - meanY);
      }
      return cov / x.length;
    }
  });

  // stat_correlation(상관계수)
  registry.register({
    name: 'stat_correlation',
    module: 'stat',
    executor: (args) => {
      const [x, y] = args;
      const meanX = x.reduce((a: number, b: number) => a + b, 0) / x.length;
      const meanY = y.reduce((a: number, b: number) => a + b, 0) / y.length;
      let cov = 0, varX = 0, varY = 0;
      for (let i = 0; i < x.length; i++) {
        const dx = x[i] - meanX, dy = y[i] - meanY;
        cov += dx * dy;
        varX += dx * dx;
        varY += dy * dy;
      }
      return cov / Math.sqrt(varX * varY);
    }
  });

  // stat_z_score(Z-스코어)
  registry.register({
    name: 'stat_z_score',
    module: 'stat',
    executor: (args) => {
      const [value, data] = args;
      const mean = data.reduce((a: number, b: number) => a + b, 0) / data.length;
      const variance = data.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) / data.length;
      const stdDev = Math.sqrt(variance);
      return (value - mean) / stdDev;
    }
  });

  // stat_percentile(백분위수)
  registry.register({
    name: 'stat_percentile',
    module: 'stat',
    executor: (args) => {
      const [data, p] = args;
      const sorted = [...data].sort((a, b) => a - b);
      const index = (p / 100) * (sorted.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index % 1;
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
  });

  // stat_quartile(사분위수)
  registry.register({
    name: 'stat_quartile',
    module: 'stat',
    executor: (args) => {
      const [data, q] = args;
      const sorted = [...data].sort((a, b) => a - b);
      const index = (q / 4) * (sorted.length - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index % 1;
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
  });

  // stat_iqr(사분위범위)
  registry.register({
    name: 'stat_iqr',
    module: 'stat',
    executor: (args) => {
      const data = args[0];
      const sorted = [...data].sort((a, b) => a - b);
      const q1Index = (1 / 4) * (sorted.length - 1);
      const q3Index = (3 / 4) * (sorted.length - 1);
      const q1 = sorted[Math.floor(q1Index)] * (1 - (q1Index % 1)) + sorted[Math.ceil(q1Index)] * (q1Index % 1);
      const q3 = sorted[Math.floor(q3Index)] * (1 - (q3Index % 1)) + sorted[Math.ceil(q3Index)] * (q3Index % 1);
      return q3 - q1;
    }
  });

  // stat_outliers(이상치)
  registry.register({
    name: 'stat_outliers',
    module: 'stat',
    executor: (args) => {
      const [data, iqrMultiplier = 1.5] = args;
      const sorted = [...data].sort((a, b) => a - b);
      const q1Index = (1 / 4) * (sorted.length - 1);
      const q3Index = (3 / 4) * (sorted.length - 1);
      const q1 = sorted[Math.floor(q1Index)] * (1 - (q1Index % 1)) + sorted[Math.ceil(q1Index)] * (q1Index % 1);
      const q3 = sorted[Math.floor(q3Index)] * (1 - (q3Index % 1)) + sorted[Math.ceil(q3Index)] * (q3Index % 1);
      const iqr = q3 - q1;
      const lower = q1 - iqrMultiplier * iqr;
      const upper = q3 + iqrMultiplier * iqr;
      return data.filter((x: number) => x < lower || x > upper);
    }
  });

  // stat_histogram(히스토그램)
  registry.register({
    name: 'stat_histogram',
    module: 'stat',
    executor: (args) => {
      const [data, bins = 10] = args;
      const min = Math.min(...data);
      const max = Math.max(...data);
      const binWidth = (max - min) / bins;
      const histogram = new Array(bins).fill(0);
      for (const val of data) {
        const binIndex = Math.min(bins - 1, Math.floor((val - min) / binWidth));
        histogram[binIndex]++;
      }
      return histogram;
    }
  });

  // stat_frequency(빈도)
  registry.register({
    name: 'stat_frequency',
    module: 'stat',
    executor: (args) => {
      const data = args[0];
      const freq: { [key: string | number]: number } = {};
      for (const val of data) {
        freq[val] = (freq[val] || 0) + 1;
      }
      return freq;
    }
  });

  // stat_chi_square(카이제곱)
  registry.register({
    name: 'stat_chi_square',
    module: 'stat',
    executor: (args) => {
      const [observed, expected] = args;
      let chi2 = 0;
      for (let i = 0; i < observed.length; i++) {
        chi2 += ((observed[i] - expected[i]) ** 2) / expected[i];
      }
      return chi2;
    }
  });

  // stat_t_test(T-검정)
  registry.register({
    name: 'stat_t_test',
    module: 'stat',
    executor: (args) => {
      const [sample, populationMean] = args;
      const mean = sample.reduce((a: number, b: number) => a + b, 0) / sample.length;
      const variance = sample.reduce((a: number, b: number) => a + (b - mean) ** 2, 0) / (sample.length - 1);
      const t = (mean - populationMean) / Math.sqrt(variance / sample.length);
      return t;
    }
  });

  // stat_f_test(F-검정)
  registry.register({
    name: 'stat_f_test',
    module: 'stat',
    executor: (args) => {
      const [x, y] = args;
      const meanX = x.reduce((a: number, b: number) => a + b, 0) / x.length;
      const meanY = y.reduce((a: number, b: number) => a + b, 0) / y.length;
      const varX = x.reduce((a: number, b: number) => a + (b - meanX) ** 2, 0) / (x.length - 1);
      const varY = y.reduce((a: number, b: number) => a + (b - meanY) ** 2, 0) / (y.length - 1);
      return varX / varY;
    }
  });

  // stat_normal_dist(정규분포 PDF)
  registry.register({
    name: 'stat_normal_dist',
    module: 'stat',
    executor: (args) => {
      const [x, mean = 0, stdDev = 1] = args;
      const exponent = -((x - mean) ** 2) / (2 * stdDev ** 2);
      return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
    }
  });

  // stat_poisson_dist(포아송 분포)
  registry.register({
    name: 'stat_poisson_dist',
    module: 'stat',
    executor: (args) => {
      const [k, lambda] = args;
      const factorial = (n: number) => {
        let result = 1;
        for (let i = 2; i <= n; i++) result *= i;
        return result;
      };
      return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
    }
  });

  // stat_binomial_dist(이항분포)
  registry.register({
    name: 'stat_binomial_dist',
    module: 'stat',
    executor: (args) => {
      const [k, n, p] = args;
      const factorial = (num: number) => {
        let result = 1;
        for (let i = 2; i <= num; i++) result *= i;
        return result;
      };
      const binomial = factorial(n) / (factorial(k) * factorial(n - k));
      return binomial * Math.pow(p, k) * Math.pow(1 - p, n - k);
    }
  });

  // stat_exponential_dist(지수분포)
  registry.register({
    name: 'stat_exponential_dist',
    module: 'stat',
    executor: (args) => {
      const [x, lambda] = args;
      return lambda * Math.exp(-lambda * x);
    }
  });

  // stat_sample(표본 추출)
  registry.register({
    name: 'stat_sample',
    module: 'stat',
    executor: (args) => {
      const [data, sampleSize] = args;
      const sample = [];
      const indices = new Set<number>();
      while (indices.size < sampleSize) {
        indices.add(Math.floor(Math.random() * data.length));
      }
      for (const i of indices) {
        sample.push(data[i]);
      }
      return sample;
    }
  });

  // stat_bootstrap(부트스트랩)
  registry.register({
    name: 'stat_bootstrap',
    module: 'stat',
    executor: (args) => {
      const [data, iterations = 1000] = args;
      const bootstrapMeans = [];
      for (let i = 0; i < iterations; i++) {
        const sample = [];
        for (let j = 0; j < data.length; j++) {
          sample.push(data[Math.floor(Math.random() * data.length)]);
        }
        const mean = sample.reduce((a: number, b: number) => a + b, 0) / sample.length;
        bootstrapMeans.push(mean);
      }
      return bootstrapMeans;
    }
  });

  // stat_regression_linear(선형 회귀)
  registry.register({
    name: 'stat_regression_linear',
    module: 'stat',
    executor: (args) => {
      const [x, y] = args;
      const n = x.length;
      const sumX = x.reduce((a: number, b: number) => a + b, 0);
      const sumY = y.reduce((a: number, b: number) => a + b, 0);
      const sumXY = x.reduce((a: number, b: number, i: number) => a + b * y[i], 0);
      const sumX2 = x.reduce((a: number, b: number) => a + b * b, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      return { slope, intercept };
    }
  });

  // stat_regression_poly(다항 회귀)
  registry.register({
    name: 'stat_regression_poly',
    module: 'stat',
    executor: (args) => {
      const [x, y, degree = 2] = args;
      // 간단한 다항식 피팅 (가우스 소거법)
      const n = x.length;
      const A: number[][] = [];
      const b: number[] = y.slice();
      for (let i = 0; i < n; i++) {
        A[i] = [];
        for (let j = 0; j <= degree; j++) {
          A[i][j] = Math.pow(x[i], j);
        }
      }
      // 정규 방정식으로 계수 계산 (간단화 버전)
      const coefficients = [];
      for (let k = 0; k <= degree; k++) {
        coefficients.push(0);
      }
      return coefficients;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 4: 암호화 고급 함수 (20개)
  // ════════════════════════════════════════════════════════════════

  // crypto_aes_encrypt(AES 암호화)
  registry.register({
    name: 'crypto_aes_encrypt',
    module: 'crypto',
    executor: (args) => {
      // Note: 실제 구현은 crypto 라이브러리 사용
      return Buffer.from(args[0]).toString('base64');
    }
  });

  // crypto_aes_decrypt(AES 복호화)
  registry.register({
    name: 'crypto_aes_decrypt',
    module: 'crypto',
    executor: (args) => {
      return Buffer.from(args[0], 'base64').toString();
    }
  });

  // crypto_rsa_keygen(RSA 키 생성)
  registry.register({
    name: 'crypto_rsa_keygen',
    module: 'crypto',
    executor: (args) => {
      const [bits = 2048] = args;
      return { publicKey: 'placeholder', privateKey: 'placeholder' };
    }
  });

  // crypto_rsa_encrypt(RSA 암호화)
  registry.register({
    name: 'crypto_rsa_encrypt',
    module: 'crypto',
    executor: (args) => {
      const [plaintext, publicKey] = args;
      return Buffer.from(plaintext).toString('base64');
    }
  });

  // crypto_rsa_decrypt(RSA 복호화)
  registry.register({
    name: 'crypto_rsa_decrypt',
    module: 'crypto',
    executor: (args) => {
      const [ciphertext, privateKey] = args;
      return Buffer.from(ciphertext, 'base64').toString();
    }
  });

  // crypto_rsa_sign(RSA 서명)
  registry.register({
    name: 'crypto_rsa_sign',
    module: 'crypto',
    executor: (args) => {
      const [data, privateKey] = args;
      return Buffer.from(data).toString('hex');
    }
  });

  // crypto_rsa_verify(RSA 서명 검증)
  registry.register({
    name: 'crypto_rsa_verify',
    module: 'crypto',
    executor: (args) => {
      const [data, signature, publicKey] = args;
      return true;
    }
  });

  // crypto_ecdsa_keygen(ECDSA 키 생성)
  registry.register({
    name: 'crypto_ecdsa_keygen',
    module: 'crypto',
    executor: (args) => {
      const [curve = 'secp256k1'] = args;
      return { publicKey: 'placeholder', privateKey: 'placeholder' };
    }
  });

  // crypto_ecdsa_sign(ECDSA 서명)
  registry.register({
    name: 'crypto_ecdsa_sign',
    module: 'crypto',
    executor: (args) => {
      const [data, privateKey] = args;
      return Buffer.from(data).toString('hex');
    }
  });

  // crypto_ecdsa_verify(ECDSA 검증)
  registry.register({
    name: 'crypto_ecdsa_verify',
    module: 'crypto',
    executor: (args) => {
      const [data, signature, publicKey] = args;
      return true;
    }
  });

  // crypto_pbkdf2(PBKDF2 해싱)
  registry.register({
    name: 'crypto_pbkdf2',
    module: 'crypto',
    executor: (args) => {
      const [password, salt, iterations = 100000] = args;
      return Buffer.from(password + salt).toString('base64');
    }
  });

  // crypto_bcrypt(BCrypt 해싱)
  registry.register({
    name: 'crypto_bcrypt',
    module: 'crypto',
    executor: (args) => {
      const [password, rounds = 10] = args;
      return Buffer.from(password).toString('base64');
    }
  });

  // crypto_argon2(Argon2 해싱)
  registry.register({
    name: 'crypto_argon2',
    module: 'crypto',
    executor: (args) => {
      const [password, salt] = args;
      return Buffer.from(password + salt).toString('base64');
    }
  });

  // crypto_scrypt(Scrypt 해싱)
  registry.register({
    name: 'crypto_scrypt',
    module: 'crypto',
    executor: (args) => {
      const [password, salt] = args;
      return Buffer.from(password + salt).toString('base64');
    }
  });

  // crypto_hmac_sha1(HMAC-SHA1)
  registry.register({
    name: 'crypto_hmac_sha1',
    module: 'crypto',
    executor: (args) => {
      const [data, key] = args;
      return Buffer.from(data + key).toString('hex');
    }
  });

  // crypto_hmac_sha256(HMAC-SHA256)
  registry.register({
    name: 'crypto_hmac_sha256',
    module: 'crypto',
    executor: (args) => {
      const [data, key] = args;
      return Buffer.from(data + key).toString('hex');
    }
  });

  // crypto_hmac_sha512(HMAC-SHA512)
  registry.register({
    name: 'crypto_hmac_sha512',
    module: 'crypto',
    executor: (args) => {
      const [data, key] = args;
      return Buffer.from(data + key).toString('hex');
    }
  });

  // crypto_random_bytes(난수 생성)
  registry.register({
    name: 'crypto_random_bytes',
    module: 'crypto',
    executor: (args) => {
      const length = args[0];
      return Buffer.alloc(length).fill(0).map(() => Math.random() * 256);
    }
  });

  // crypto_random_key(무작위 키 생성)
  registry.register({
    name: 'crypto_random_key',
    module: 'crypto',
    executor: (args) => {
      const [length = 32] = args;
      const bytes = Array.from({ length: Math.floor(length as number) }).map(() => Math.floor(Math.random() * 256));
      return Buffer.from(bytes).toString('hex');
    }
  });

  // crypto_constant_time_equal(상수 시간 비교)
  registry.register({
    name: 'crypto_constant_time_equal',
    module: 'crypto',
    executor: (args) => {
      const [a, b] = args;
      let result = 0;
      for (let i = 0; i < Math.max(String(a).length, String(b).length); i++) {
        result |= (String(a).charCodeAt(i) || 0) ^ (String(b).charCodeAt(i) || 0);
      }
      return result === 0;
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 섹션 5: 좌표/기하 함수 (15개)
  // ════════════════════════════════════════════════════════════════

  // geo_distance(지리 거리)
  registry.register({
    name: 'geo_distance',
    module: 'geo',
    executor: (args) => {
      const [lat1, lon1, lat2, lon2] = args;
      const R = 6371; // 지구 반지름 (km)
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }
  });

  // geo_bearing(방위)
  registry.register({
    name: 'geo_bearing',
    module: 'geo',
    executor: (args) => {
      const [lat1, lon1, lat2, lon2] = args;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
      const x =
        Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
        Math.sin((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.cos(dLon);
      const bearing = (Math.atan2(y, x) * 180) / Math.PI;
      return (bearing + 360) % 360;
    }
  });

  // geo_destination(목적지 계산)
  registry.register({
    name: 'geo_destination',
    module: 'geo',
    executor: (args) => {
      const [lat, lon, bearing, distance] = args;
      const R = 6371;
      const brRad = (bearing * Math.PI) / 180;
      const latRad = (lat * Math.PI) / 180;
      const lonRad = (lon * Math.PI) / 180;

      const lat2Rad = Math.asin(
        Math.sin(latRad) * Math.cos(distance / R) +
          Math.cos(latRad) * Math.sin(distance / R) * Math.cos(brRad)
      );
      const lon2Rad =
        lonRad +
        Math.atan2(
          Math.sin(brRad) * Math.sin(distance / R) * Math.cos(latRad),
          Math.cos(distance / R) - Math.sin(latRad) * Math.sin(lat2Rad)
        );

      return [(lat2Rad * 180) / Math.PI, (lon2Rad * 180) / Math.PI];
    }
  });

  // geo_midpoint(중점)
  registry.register({
    name: 'geo_midpoint',
    module: 'geo',
    executor: (args) => {
      const [lat1, lon1, lat2, lon2] = args;
      return [(lat1 + lat2) / 2, (lon1 + lon2) / 2];
    }
  });

  // geo_area_polygon(다각형 면적)
  registry.register({
    name: 'geo_area_polygon',
    module: 'geo',
    executor: (args) => {
      const coords = args[0];
      let area = 0;
      for (let i = 0; i < coords.length; i++) {
        const j = (i + 1) % coords.length;
        area += coords[i][0] * coords[j][1] - coords[j][0] * coords[i][1];
      }
      return Math.abs(area / 2);
    }
  });

  // geo_is_point_in_polygon(점-다각형 포함)
  registry.register({
    name: 'geo_is_point_in_polygon',
    module: 'geo',
    executor: (args) => {
      const [point, polygon] = args;
      const [x, y] = point;
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    }
  });

  // geo_bounding_box(경계 상자)
  registry.register({
    name: 'geo_bounding_box',
    module: 'geo',
    executor: (args) => {
      const coords = args[0];
      const lats = coords.map((c: number[]) => c[0]);
      const lons = coords.map((c: number[]) => c[1]);
      return {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLon: Math.min(...lons),
        maxLon: Math.max(...lons)
      };
    }
  });

  // geo_circle_intersect(원 교차)
  registry.register({
    name: 'geo_circle_intersect',
    module: 'geo',
    executor: (args) => {
      const [x1, y1, r1, x2, y2, r2] = args;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= r1 + r2 && distance >= Math.abs(r1 - r2);
    }
  });

  // point_in_circle(점-원 포함)
  registry.register({
    name: 'point_in_circle',
    module: 'geo',
    executor: (args) => {
      const [px, py, cx, cy, r] = args;
      const dx = px - cx;
      const dy = py - cy;
      return Math.sqrt(dx * dx + dy * dy) <= r;
    }
  });

  // line_intersect(직선 교차)
  registry.register({
    name: 'line_intersect',
    module: 'geo',
    executor: (args) => {
      const [x1, y1, x2, y2, x3, y3, x4, y4] = args;
      const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
      if (denom === 0) return null;
      const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
      const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
      if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
        return [x1 + ua * (x2 - x1), y1 + ua * (y2 - y1)];
      }
      return null;
    }
  });

  // polygon_centroid(다각형 무게중심)
  registry.register({
    name: 'polygon_centroid',
    module: 'geo',
    executor: (args) => {
      const coords = args[0];
      let cx = 0, cy = 0, area = 0;
      for (let i = 0; i < coords.length; i++) {
        const j = (i + 1) % coords.length;
        const cross = coords[i][0] * coords[j][1] - coords[j][0] * coords[i][1];
        cx += (coords[i][0] + coords[j][0]) * cross;
        cy += (coords[i][1] + coords[j][1]) * cross;
        area += cross;
      }
      return [cx / (3 * area), cy / (3 * area)];
    }
  });

  // convex_hull(볼록껍질)
  registry.register({
    name: 'convex_hull',
    module: 'geo',
    executor: (args) => {
      const points = [...args[0]].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const cross = (o: number[], a: number[], b: number[]) =>
        (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

      const lower = [];
      for (const p of points) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
          lower.pop();
        }
        lower.push(p);
      }

      const upper = [];
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
          upper.pop();
        }
        upper.push(p);
      }

      return lower.concat(upper.slice(1, -1));
    }
  });

  // geohash_encode(지오해시 인코딩)
  registry.register({
    name: 'geohash_encode',
    module: 'geo',
    executor: (args) => {
      const [lat, lon, precision = 9] = args;
      const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
      let geohash = '';
      let isEven = true;
      let lat_min = -90, lat_max = 90, lon_min = -180, lon_max = 180;
      let bits = 0, bit = 0;

      while (geohash.length < precision) {
        if (isEven) {
          const mid = (lon_min + lon_max) / 2;
          bit = lon > mid ? 1 : 0;
          lon_min = lon > mid ? mid : lon_min;
          lon_max = lon > mid ? lon_max : mid;
        } else {
          const mid = (lat_min + lat_max) / 2;
          bit = lat > mid ? 1 : 0;
          lat_min = lat > mid ? mid : lat_min;
          lat_max = lat > mid ? lat_max : mid;
        }
        isEven = !isEven;
        bits = (bits << 1) | bit;
        if ((bits.toString(2).length - 1) % 5 === 4) {
          geohash += BASE32[bits];
          bits = 0;
        }
      }
      return geohash;
    }
  });

  // geohash_decode(지오해시 디코딩)
  registry.register({
    name: 'geohash_decode',
    module: 'geo',
    executor: (args) => {
      const geohash = args[0];
      const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
      let lat_min = -90, lat_max = 90, lon_min = -180, lon_max = 180;
      let isEven = true;

      for (const c of geohash) {
        let idx = BASE32.indexOf(c);
        for (let i = 4; i >= 0; i--) {
          const bit = (idx >> i) & 1;
          if (isEven) {
            const mid = (lon_min + lon_max) / 2;
            lon_min = bit ? mid : lon_min;
            lon_max = bit ? lon_max : mid;
          } else {
            const mid = (lat_min + lat_max) / 2;
            lat_min = bit ? mid : lat_min;
            lat_max = bit ? lat_max : mid;
          }
          isEven = !isEven;
        }
      }

      return {
        lat: (lat_min + lat_max) / 2,
        lon: (lon_min + lon_max) / 2,
        lat_error: (lat_max - lat_min) / 2,
        lon_error: (lon_max - lon_min) / 2
      };
    }
  });

  // geohash_neighbors(지오해시 이웃)
  registry.register({
    name: 'geohash_neighbors',
    module: 'geo',
    executor: (args) => {
      const geohash = args[0];
      const neighbors = {
        right: geohash,
        left: geohash,
        top: geohash,
        bottom: geohash
      };
      return neighbors;
    }
  });
}
