/**
 * FreeLang Standard Library: std/robotai
 *
 * Robot AI Controller Library
 * Complete implementation for autonomous obstacle-avoiding robots
 */

import { Robot, createRobot, MotorCommand, SensorReading } from './serial';
import * as json from './json';
import * as array from './array';

/**
 * Sensor Reading with Processing
 */
export interface ProcessedSensor {
  distance: number;
  timestamp: number;
  confidence: number;
  raw: number[];
  variance: number;
}

/**
 * Robot Decision Output
 */
export interface RobotDecision {
  direction: 'forward' | 'backward' | 'left' | 'right' | 'stop';
  speed: number;
  confidence: number;
  timestamp: number;
}

/**
 * Controller Statistics
 */
export interface ControllerStats {
  totalCycles: number;
  avgDistance: number;
  avgConfidence: number;
  obstacleCount: number;
  detectionRate: number;
  forwardCount: number;
  turnCount: number;
  avgResponseTime: number;
}

/**
 * Sensor Data Processing
 */
export class SensorProcessor {
  /**
   * Filter distance using median filter
   */
  static filterDistance(measurements: number[]): number {
    if (measurements.length === 0) {
      return 0;
    }

    // Create copy and sort
    const sorted = [...measurements].sort((a, b) => a - b);

    // Return median
    const mid = Math.floor(sorted.length / 2);
    return sorted[mid];
  }

  /**
   * Calculate variance (standard deviation squared)
   */
  static calculateVariance(data: number[]): number {
    if (data.length === 0) {
      return 0;
    }

    // Calculate mean
    const mean = data.reduce((sum, x) => sum + x, 0) / data.length;

    // Calculate variance
    const variance = data.reduce((sum, x) => {
      const diff = x - mean;
      return sum + (diff * diff);
    }, 0) / data.length;

    return variance;
  }

  /**
   * Calculate confidence score
   */
  static calculateConfidence(distance: number, variance: number): number {
    // Range validation
    if (distance < 5 || distance > 500) {
      return 0;
    }

    // Confidence = 1.0 - (variance / (distance * 0.1))
    const confidence = 1.0 - (variance / (distance * 0.1));

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Process raw sensor readings
   */
  static processSensorReading(rawData: number[], timestamp: number): ProcessedSensor {
    const distance = this.filterDistance(rawData);
    const variance = this.calculateVariance(rawData);
    const confidence = this.calculateConfidence(distance, variance);

    return {
      distance,
      timestamp,
      confidence,
      raw: rawData,
      variance
    };
  }
}

/**
 * Decision Engine
 */
export class DecisionEngine {
  /**
   * Make robot decision based on sensor input
   */
  static makeDecision(sensor: ProcessedSensor): RobotDecision {
    const distance = sensor.distance;
    const confidence = sensor.confidence;

    let direction: 'forward' | 'backward' | 'left' | 'right' | 'stop';
    let speed: number;

    // Distance-based decision making
    if (distance < 20) {
      // Obstacle detected: avoid
      direction = 'right';
      speed = 150;
    } else if (distance < 30) {
      // Warning distance: reduce speed
      direction = 'forward';
      speed = 128;
    } else if (distance < 100) {
      // Safe: normal speed
      direction = 'forward';
      speed = 200;
    } else {
      // Very safe: full speed
      direction = 'forward';
      speed = 255;
    }

    return {
      direction,
      speed,
      confidence,
      timestamp: sensor.timestamp
    };
  }

  /**
   * Evaluate path direction (for advanced navigation)
   */
  static evaluatePath(distance: number, direction: string): number {
    // Base score (0-100)
    let baseScore = (distance / 30.0) * 100;
    baseScore = Math.min(100, baseScore);

    // Direction weights
    const weights: Record<string, number> = {
      'forward': 1.0,
      'left': 0.8,
      'right': 0.8,
      'backward': 0.3
    };

    const weight = weights[direction] || 0.5;
    return baseScore * weight;
  }

  /**
   * Select optimal direction
   */
  static selectOptimalDirection(sensor: ProcessedSensor): string {
    const directions = ['forward', 'left', 'right', 'backward'];
    let bestDirection = 'forward';
    let bestScore = 0;

    for (const dir of directions) {
      const score = this.evaluatePath(sensor.distance, dir);
      if (score > bestScore) {
        bestScore = score;
        bestDirection = dir;
      }
    }

    return bestDirection;
  }
}

/**
 * Main Robot AI Controller
 */
export class RobotAIController {
  private robot: Robot;
  private sensorProcessor: typeof SensorProcessor;
  private decisionEngine: typeof DecisionEngine;
  private stats: ControllerStats;
  private isRunning: boolean = false;

  constructor(port: string, baudRate: number = 115200) {
    this.robot = createRobot(port, baudRate);
    this.sensorProcessor = SensorProcessor;
    this.decisionEngine = DecisionEngine;
    this.stats = {
      totalCycles: 0,
      avgDistance: 0,
      avgConfidence: 0,
      obstacleCount: 0,
      detectionRate: 0,
      forwardCount: 0,
      turnCount: 0,
      avgResponseTime: 0
    };
  }

  /**
   * Initialize robot connection
   */
  async initialize(): Promise<boolean> {
    try {
      const connected = await this.robot.connect();
      if (!connected) {
        console.error('[RobotAI] Failed to connect to robot');
        return false;
      }

      console.log('[RobotAI] Robot initialized successfully');
      return true;
    } catch (error) {
      console.error(`[RobotAI] Initialization error: ${error}`);
      return false;
    }
  }

  /**
   * Shutdown robot
   */
  async shutdown(): Promise<void> {
    this.isRunning = false;
    await this.robot.disconnect();
    console.log('[RobotAI] Robot shutdown complete');
  }

  /**
   * Run single control cycle
   */
  async runCycle(cycleNum: number): Promise<RobotDecision | null> {
    try {
      const startTime = Date.now();

      // Read sensor
      const sensorData = await this.robot.getSensorData(1000);
      if (!sensorData) {
        console.warn(`[RobotAI] Cycle ${cycleNum}: Failed to read sensor`);
        return null;
      }

      // Process sensor data
      const processedSensor = this.sensorProcessor.processSensorReading(
        sensorData.raw || [sensorData.distance],
        sensorData.timestamp
      );

      // Make decision
      const decision = this.decisionEngine.makeDecision(processedSensor);

      // Get optimal direction
      const optimalDir = this.decisionEngine.selectOptimalDirection(processedSensor);

      // Execute command
      const success = await this.robot.move(decision.direction, decision.speed);
      if (!success) {
        console.warn(`[RobotAI] Cycle ${cycleNum}: Failed to execute command`);
      }

      // Update statistics
      this.stats.totalCycles = cycleNum + 1;
      this.stats.avgDistance += processedSensor.distance;
      this.stats.avgConfidence += processedSensor.confidence;

      if (processedSensor.distance < 30) {
        this.stats.obstacleCount++;
      }

      if (decision.direction === 'forward') {
        this.stats.forwardCount++;
      } else {
        this.stats.turnCount++;
      }

      const responseTime = Date.now() - startTime;
      this.stats.avgResponseTime += responseTime;

      // Log (10% sample)
      if (cycleNum % 10 === 0) {
        console.log(`\n[Cycle ${cycleNum}]`);
        console.log(`  Distance: ${processedSensor.distance.toFixed(1)} cm`);
        console.log(`  Confidence: ${processedSensor.confidence.toFixed(2)}`);
        console.log(`  Decision: ${decision.direction} (speed: ${decision.speed})`);
        console.log(`  Optimal: ${optimalDir}`);
        console.log(`  Response: ${responseTime}ms`);
      }

      return decision;
    } catch (error) {
      console.error(`[RobotAI] Cycle error: ${error}`);
      return null;
    }
  }

  /**
   * Run controller for specified cycles
   */
  async run(cycles: number = 60): Promise<ControllerStats> {
    if (!this.robot.isConnected()) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize robot');
      }
    }

    console.log('====================================');
    console.log('🤖 Robot AI Controller - Phase 4-6');
    console.log('FreeLang v2 Implementation');
    console.log('====================================\n');

    this.isRunning = true;

    for (let cycle = 0; cycle < cycles && this.isRunning; cycle++) {
      await this.runCycle(cycle);
    }

    // Calculate final statistics
    this.finializeStats();

    // Print report
    this.printReport();

    return this.stats;
  }

  /**
   * Finalize statistics
   */
  private finializeStats(): void {
    if (this.stats.totalCycles === 0) {
      return;
    }

    this.stats.avgDistance /= this.stats.totalCycles;
    this.stats.avgConfidence /= this.stats.totalCycles;
    this.stats.avgResponseTime /= this.stats.totalCycles;
    this.stats.detectionRate = (this.stats.obstacleCount / this.stats.totalCycles) * 100;
  }

  /**
   * Print control report
   */
  private printReport(): void {
    console.log('\n====================================');
    console.log('📊 Results Analysis');
    console.log('====================================');
    console.log(`Total Cycles: ${this.stats.totalCycles}`);
    console.log(`Avg Distance: ${this.stats.avgDistance.toFixed(1)} cm`);
    console.log(`Avg Confidence: ${this.stats.avgConfidence.toFixed(2)}`);
    console.log(`Obstacle Detections: ${this.stats.obstacleCount}`);
    console.log(`Detection Rate: ${this.stats.detectionRate.toFixed(1)}%`);
    console.log(`Forward Movements: ${this.stats.forwardCount}`);
    console.log(`Turn Movements: ${this.stats.turnCount}`);
    console.log(`Avg Response Time: ${this.stats.avgResponseTime.toFixed(2)}ms`);
    console.log('\n✅ Phase 4-6 Complete - FreeLang v2 Implementation');
    console.log('====================================\n');
  }

  /**
   * Stop controller
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Get current statistics
   */
  getStats(): ControllerStats {
    return { ...this.stats };
  }
}

/**
 * Create robot AI controller
 */
export function createRobotAI(port: string, baudRate: number = 115200): RobotAIController {
  return new RobotAIController(port, baudRate);
}

/**
 * Convenience function to run controller
 */
export async function runRobotAI(port: string, cycles: number = 60): Promise<ControllerStats> {
  const controller = createRobotAI(port);

  try {
    const stats = await controller.run(cycles);
    await controller.shutdown();
    return stats;
  } catch (error) {
    console.error(`[RobotAI] Error: ${error}`);
    await controller.shutdown();
    throw error;
  }
}
