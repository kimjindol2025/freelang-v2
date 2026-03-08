/**
 * Phase 11 Example: Monte Carlo Pi Estimation
 *
 * 몬테카를로 방법으로 π 추정:
 * - 정사각형 안에 난수 생성
 * - 원 안에 들어가는 점의 비율 이용
 * - π ≈ 4 * (원 안의 점 / 전체 점)
 */

import { Random, MathUtils, MathConstants, Statistics } from '../src/phase-11/math-foundation';

/**
 * 단일 시뮬레이션
 */
function estimatePiSingle(iterations: number): number {
  let hits = 0;

  for (let i = 0; i < iterations; i++) {
    const x = Random.random();
    const y = Random.random();

    // 원의 반지름은 1, 거리 <= 1이면 원 안에 있음
    if (MathUtils.sqrt(x * x + y * y) <= 1) {
      hits++;
    }
  }

  return (4 * hits) / iterations;
}

/**
 * 다중 시뮬레이션으로 신뢰도 측정
 */
function estimatePiMultiple(
  iterations: number,
  runs: number
): {
  estimates: number[];
  mean: number;
  stdDev: number;
  actualPi: number;
  error: number;
} {
  const estimates: number[] = [];

  for (let run = 0; run < runs; run++) {
    const estimate = estimatePiSingle(iterations);
    estimates.push(estimate);
  }

  const mean = Statistics.mean(estimates);
  const stdDev = Statistics.stdDev(estimates);
  const error = MathUtils.abs(mean - MathConstants.PI);

  return {
    estimates,
    mean,
    stdDev,
    actualPi: MathConstants.PI,
    error,
  };
}

/**
 * 수렴 분석 (반복 횟수에 따른 추정 정확도)
 */
function convergenceAnalysis(): void {
  console.log('📈 Convergence Analysis (1000 runs per iteration count)\n');

  const iterationCounts = [1000, 10000, 100000, 1000000];

  for (const iterations of iterationCounts) {
    const result = estimatePiMultiple(iterations, 100);

    console.log(`Iterations: ${iterations.toLocaleString()}`);
    console.log(`  Mean π estimate: ${result.mean.toFixed(6)}`);
    console.log(`  Actual π:        ${MathConstants.PI.toFixed(6)}`);
    console.log(`  Error:           ${result.error.toFixed(6)}`);
    console.log(`  Std Dev:         ${result.stdDev.toFixed(6)}`);
    console.log(
      `  Accuracy:        ${((1 - result.error / MathConstants.PI) * 100).toFixed(2)}%\n`
    );
  }
}

/**
 * 분포 분석 (100개 실행의 분포)
 */
function distributionAnalysis(iterations: number): void {
  console.log(`📊 Distribution Analysis (${iterations.toLocaleString()} iterations × 100 runs)\n`);

  const result = estimatePiMultiple(iterations, 100);

  console.log('Statistics:');
  console.log(`  Mean:           ${result.mean.toFixed(6)}`);
  console.log(`  Median:         ${Statistics.median(result.estimates).toFixed(6)}`);
  console.log(`  Min:            ${Statistics.min(result.estimates).toFixed(6)}`);
  console.log(`  Max:            ${Statistics.max(result.estimates).toFixed(6)}`);
  console.log(`  Range:          ${Statistics.range(result.estimates).toFixed(6)}`);
  console.log(`  Std Dev:        ${result.stdDev.toFixed(6)}`);
  console.log(`  Variance:       ${Statistics.variance(result.estimates).toFixed(6)}`);

  // Percentiles
  console.log('\nPercentiles:');
  console.log(`  25th:           ${Statistics.percentile(result.estimates, 25).toFixed(6)}`);
  console.log(`  50th (median):  ${Statistics.percentile(result.estimates, 50).toFixed(6)}`);
  console.log(`  75th:           ${Statistics.percentile(result.estimates, 75).toFixed(6)}`);
  console.log(`  95th:           ${Statistics.percentile(result.estimates, 95).toFixed(6)}`);

  console.log(`\nActual π:        ${MathConstants.PI.toFixed(6)}`);
  console.log(`Error:           ${result.error.toFixed(6)}`);
  console.log(`Accuracy:        ${((1 - result.error / MathConstants.PI) * 100).toFixed(2)}%`);
}

/**
 * 점의 시각화 (작은 규모)
 */
function visualize(iterations: number = 100): void {
  console.log(`\n🎨 Visualization (${iterations} points, 40×20 grid)\n`);

  const grid: string[][] = Array(20)
    .fill(null)
    .map(() => Array(40).fill(' '));

  let hits = 0;

  for (let i = 0; i < iterations; i++) {
    const x = Random.random();
    const y = Random.random();

    const gridX = Math.floor(x * 40);
    const gridY = Math.floor(y * 20);

    if (MathUtils.sqrt(x * x + y * y) <= 1) {
      grid[gridY][gridX] = '●';
      hits++;
    } else {
      grid[gridY][gridX] = '○';
    }
  }

  for (const row of grid) {
    console.log('  ' + row.join(''));
  }

  const estimate = (4 * hits) / iterations;
  console.log(`\n  Points in circle: ${hits}/${iterations}`);
  console.log(`  π estimate:       ${estimate.toFixed(4)}`);
  console.log(`  Actual π:         ${MathConstants.PI.toFixed(4)}`);
  console.log(`  Error:            ${MathUtils.abs(estimate - MathConstants.PI).toFixed(4)}`);
}

/**
 * 메인
 */
function main(): void {
  console.log('🎯 Monte Carlo Pi Estimation\n');
  console.log(`Actual π = ${MathConstants.PI.toFixed(10)}\n`);
  console.log('═══════════════════════════════════════════\n');

  // 1. 시각화
  visualize(100);

  // 2. 수렴 분석
  console.log('\n═══════════════════════════════════════════\n');
  convergenceAnalysis();

  // 3. 분포 분석
  console.log('═══════════════════════════════════════════\n');
  distributionAnalysis(100000);

  // 4. 최종 결과
  console.log('\n═══════════════════════════════════════════\n');
  Random.seed(42);
  const finalEstimate = estimatePiSingle(10000000);
  console.log('🎯 Final Estimate (10M iterations):');
  console.log(`  Estimated π: ${finalEstimate.toFixed(10)}`);
  console.log(`  Actual π:    ${MathConstants.PI.toFixed(10)}`);
  console.log(`  Error:       ${MathUtils.abs(finalEstimate - MathConstants.PI).toFixed(10)}`);
  console.log(`  Accuracy:    ${((1 - MathUtils.abs(finalEstimate - MathConstants.PI) / MathConstants.PI) * 100).toFixed(4)}%`);
}

main();
