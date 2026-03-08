/**
 * ================================================
 * Phase 4-6: Robot AI Controller - FreeLang v2 완전 구현
 * Serial API + Struct + JSON 처리 포함
 * ================================================
 */

import { createRobotAI, RobotAIController } from '../dist/stdlib/robotai';
import * as json from '../dist/stdlib/json';
import * as array from '../dist/stdlib/array';
import * as string from '../dist/stdlib/string';

// ================================================
// Phase 4: 센서 처리
// ================================================

interface SensorReading {
  distance: number;
  timestamp: number;
  confidence: number;
  raw: number[];
}

interface RobotCommand {
  direction: string;
  speed: number;
  confidence: number;
  timestamp: number;
}

/**
 * 거리 측정값 필터링 (중앙값 필터)
 */
function filterDistance(measurements: number[]): number {
  if (measurements.length === 0) {
    return 0.0;
  }

  // 배열 정렬
  const sorted = [...measurements].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted[mid];
}

/**
 * 분산 계산
 */
function calculateVariance(data: number[]): number {
  if (data.length === 0) {
    return 0.0;
  }

  // 평균 계산
  const sum = data.reduce((acc, x) => acc + x, 0);
  const mean = sum / data.length;

  // 분산 계산
  const variance = data.reduce((acc, x) => {
    const diff = x - mean;
    return acc + (diff * diff);
  }, 0);

  return variance / data.length;
}

/**
 * 신뢰도 계산
 */
function calculateConfidence(distance: number, variance: number): number {
  // 범위 검증
  if (distance < 5.0 || distance > 500.0) {
    return 0.0;
  }

  // 신뢰도 = 1.0 - (분산 / (거리 * 0.1))
  let confidence = 1.0 - (variance / (distance * 0.1));

  // 범위 제한 [0.0, 1.0]
  if (confidence < 0.0) {
    return 0.0;
  } else if (confidence > 1.0) {
    return 1.0;
  } else {
    return confidence;
  }
}

/**
 * 센서 데이터 처리
 */
function processSensorReading(rawData: number[], timestamp: number): SensorReading {
  const distance = filterDistance(rawData);
  const variance = calculateVariance(rawData);
  const confidence = calculateConfidence(distance, variance);

  return {
    distance,
    timestamp,
    confidence,
    raw: rawData
  };
}

// ================================================
// Phase 4: 의사결정 엔진
// ================================================

/**
 * 거리 기반 의사결정
 */
function makeDecision(sensor: SensorReading): RobotCommand {
  const distance = sensor.distance;
  const confidence = sensor.confidence;

  let direction: string;
  let speed: number;

  // 거리 기반 의사결정
  if (distance < 20.0) {
    // 장애물 감지: 우회전
    direction = "right";
    speed = 150;
  } else if (distance < 30.0) {
    // 경고 거리: 속도 감소
    direction = "forward";
    speed = 128;
  } else if (distance < 100.0) {
    // 안전한 거리: 통상 속도
    direction = "forward";
    speed = 200;
  } else {
    // 충분한 거리: 최대 속도
    direction = "forward";
    speed = 255;
  }

  return {
    direction,
    speed,
    confidence,
    timestamp: sensor.timestamp
  };
}

// ================================================
// Phase 4: 경로 평가 및 최적화
// ================================================

/**
 * 경로 평가
 */
function evaluatePath(distance: number, direction: string): number {
  // 거리 점수 (0-100)
  let baseScore = (distance / 30.0) * 100.0;
  if (baseScore > 100.0) {
    baseScore = 100.0;
  }

  // 방향별 가중치
  let weight: number;
  if (direction === "forward") {
    weight = 1.0;
  } else if (direction === "left" || direction === "right") {
    weight = 0.8;
  } else if (direction === "backward") {
    weight = 0.3;
  } else {
    weight = 0.5;
  }

  return baseScore * weight;
}

/**
 * 최적 방향 선택
 */
function selectOptimalDirection(sensor: SensorReading): string {
  const directions = ["forward", "left", "right", "backward"];
  let bestDirection = "forward";
  let bestScore = 0.0;

  for (const direction of directions) {
    const score = evaluatePath(sensor.distance, direction);
    if (score > bestScore) {
      bestScore = score;
      bestDirection = direction;
    }
  }

  return bestDirection;
}

// ================================================
// Phase 5: 하드웨어 통합 (시뮬레이션)
// ================================================

/**
 * 센서 데이터 생성 (시뮬레이션)
 */
function generateSensorData(cycle: number): number[] {
  // 100cm에서 시작, 점진적으로 접근
  let baseDistance = 100.0 - (cycle * 0.5);
  if (baseDistance < 10.0) {
    baseDistance = 10.0;
  }

  // 노이즈 추가
  return [
    baseDistance - 1.0,
    baseDistance,
    baseDistance + 1.5,
    baseDistance - 0.5,
    baseDistance + 0.5
  ];
}

// ================================================
// Phase 6: 메인 제어 루프
// ================================================

/**
 * 제어 루프 실행
 */
function runController(cycles: number): void {
  console.log("====================================");
  console.log("🤖 Phase 4-6: Robot AI Controller");
  console.log("FreeLang v2 완전 구현");
  console.log("====================================\n");

  let totalDistance = 0.0;
  let totalConfidence = 0.0;
  let obstacleCount = 0;
  let forwardCount = 0;
  let turnCount = 0;

  for (let cycle = 0; cycle < cycles; cycle++) {
    // 1. 센서 데이터 생성 (시뮬레이션)
    const rawData = generateSensorData(cycle);
    const timestamp = cycle * 100;

    // 2. 센서 처리
    const sensor = processSensorReading(rawData, timestamp);
    totalDistance = totalDistance + sensor.distance;
    totalConfidence = totalConfidence + sensor.confidence;

    // 3. 의사결정
    const command = makeDecision(sensor);

    // 4. 최적 방향 선택 (고급)
    const optimalDir = selectOptimalDirection(sensor);

    // 5. 통계 수집
    if (sensor.distance < 30.0) {
      obstacleCount = obstacleCount + 1;
    }

    if (command.direction === "forward") {
      forwardCount = forwardCount + 1;
    } else {
      turnCount = turnCount + 1;
    }

    // 6. 로그 출력 (10% 샘플)
    if (cycle % Math.floor(cycles / 10) === 0) {
      console.log("");
      console.log(`Cycle ${cycle}:`);
      console.log(`  Distance: ${sensor.distance.toFixed(1)} cm`);
      console.log(`  Confidence: ${sensor.confidence.toFixed(2)}`);
      console.log(`  Decision: ${command.direction} (speed: ${command.speed})`);
      console.log(`  Optimal: ${optimalDir}`);
    }
  }

  // 7. 최종 통계
  console.log("");
  console.log("====================================");
  console.log("📊 결과 분석");
  console.log("====================================");
  console.log(`총 사이클: ${cycles}`);
  console.log(`평균 거리: ${(totalDistance / cycles).toFixed(1)} cm`);
  console.log(`평균 신뢰도: ${(totalConfidence / cycles).toFixed(2)}`);
  console.log(`장애물 감지: ${obstacleCount} cycles`);
  console.log(`감지 성공률: ${((obstacleCount / cycles) * 100.0).toFixed(1)}%`);
  console.log(`직진: ${forwardCount} cycles`);
  console.log(`회전: ${turnCount} cycles`);
  console.log("");
  console.log("✅ Phase 4-6 완료 - FreeLang v2 완전 구현");
  console.log("====================================\n");

  // 8. JSON으로 결과 저장
  const result = {
    cycles,
    avgDistance: totalDistance / cycles,
    avgConfidence: totalConfidence / cycles,
    obstacleDetections: obstacleCount,
    detectionRate: (obstacleCount / cycles) * 100.0,
    forwardMoves: forwardCount,
    turnMoves: turnCount
  };

  const resultJson = JSON.stringify(result, null, 2);
  console.log("📄 Result JSON:");
  console.log(resultJson);
}

// ================================================
// 프로그램 시작
// ================================================

// Phase 4-6 실행 (60 사이클)
runController(60);
