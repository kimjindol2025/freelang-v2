/**
 * Phase 11 Dynamic Confidence 테스트
 */

const { DynamicConfidenceAdjuster } = require('./src/phase-11/dynamic-confidence-adjuster.ts');

const adjuster = new DynamicConfidenceAdjuster();

// 테스트 패턴들
const patterns = [
  { id: 'sum', confidence: 0.85 },
  { id: 'filter', confidence: 0.75 },
  { id: 'custom_1', confidence: 0.60 },
];

// 테스트 피드백
const feedback = new Map([
  ['sum', {
    patternId: 'sum',
    helpful: 45,
    unhelpful: 5,
    usageCount: 120,
    lastUsed: new Date(),
    avgUserRating: 0.92,
  }],
  ['filter', {
    patternId: 'filter',
    helpful: 30,
    unhelpful: 20,
    usageCount: 80,
    lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    avgUserRating: 0.60,
  }],
]);

// 조정 실행
console.log('🔧 Phase 11: Dynamic Confidence Adjustment\n');
const adjusted = adjuster.adjustBatch(patterns, feedback);

for (const result of adjusted) {
  console.log(`📊 Pattern: ${result.patternId}`);
  console.log(`   Original: ${(result.originalConfidence * 100).toFixed(2)}%`);
  console.log(`   Adjusted: ${(result.newConfidence * 100).toFixed(2)}%`);
  console.log(`   Factors: usage=${result.factors.usageFactor.toFixed(2)}, success=${result.factors.successRate.toFixed(2)}, time=${result.factors.timeFactor.toFixed(2)}`);
  console.log();
}

// 통계
const stats = adjuster.calculateStats(adjusted);
console.log('📈 Statistics:');
console.log(`   Average: ${(stats.averageConfidence * 100).toFixed(2)}%`);
console.log(`   High (≥85%): ${stats.highConfidenceCount}`);
console.log(`   Total Improvement: ${(stats.totalImprovement * 100).toFixed(2)}%`);
