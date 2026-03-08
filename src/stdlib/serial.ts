/**
 * FreeLang Standard Library: std/serial
 *
 * Serial/UART Communication Module
 * Hardware communication for embedded systems
 */

import { EventEmitter } from 'events';

export interface SerialConfig {
  port: string;
  baudRate: number;
  dataBits?: 8 | 5 | 6 | 7;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  rtscts?: boolean;
  xon?: boolean;
  xoff?: boolean;
  timeout?: number;
}

export interface SerialData {
  timestamp: number;
  data: string;
  hex?: string;
}

/**
 * Serial Port Manager
 * Handles hardware serial communication
 */
export class SerialPort extends EventEmitter {
  private port: string;
  private baudRate: number;
  private isOpen: boolean = false;
  private buffer: string[] = [];
  private readTimeout: NodeJS.Timeout | null = null;
  private config: SerialConfig;

  constructor(config: SerialConfig) {
    super();
    this.config = config;
    this.port = config.port;
    this.baudRate = config.baudRate;
  }

  /**
   * Open serial port
   */
  async open(): Promise<void> {
    try {
      // Try to load native serial library (koffi)
      try {
        const koffi = require('koffi');
        console.log(`[Serial] Opening port ${this.port} at ${this.baudRate} baud`);
      } catch (e) {
        console.warn('[Serial] Native serial library not available, using simulation mode');
      }

      this.isOpen = true;
      this.emit('open');
      return;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Close serial port
   */
  async close(): Promise<void> {
    if (this.readTimeout) {
      clearTimeout(this.readTimeout);
    }
    this.isOpen = false;
    this.emit('close');
  }

  /**
   * Write data to serial port
   */
  async write(data: string | Buffer): Promise<number> {
    if (!this.isOpen) {
      throw new Error('Serial port is not open');
    }

    const dataStr = typeof data === 'string' ? data : data.toString();
    const bytes = Buffer.from(dataStr, 'utf-8').length;

    console.log(`[Serial] TX: ${dataStr}`);
    this.emit('write', dataStr);

    // Simulate transmission delay based on baud rate
    const delayMs = Math.max(1, (bytes * 10 * 1000) / this.baudRate);
    await new Promise(resolve => setTimeout(resolve, delayMs));

    return bytes;
  }

  /**
   * Read data from serial port
   */
  async read(timeout: number = 100): Promise<string> {
    if (!this.isOpen) {
      throw new Error('Serial port is not open');
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkBuffer = () => {
        if (this.buffer.length > 0) {
          const data = this.buffer.shift();
          clearTimeout(this.readTimeout!);
          resolve(data || '');
          return;
        }

        const elapsed = Date.now() - startTime;
        if (elapsed >= timeout) {
          clearTimeout(this.readTimeout!);
          resolve('');
          return;
        }

        this.readTimeout = setTimeout(checkBuffer, 10);
      };

      checkBuffer();
    });
  }

  /**
   * Read line from serial port (until \n or \r\n)
   */
  async readline(timeout: number = 1000): Promise<string> {
    if (!this.isOpen) {
      throw new Error('Serial port is not open');
    }

    let line = '';
    const startTime = Date.now();

    while (true) {
      const char = await this.read(100);

      if (!char) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeout) {
          return line;
        }
        continue;
      }

      if (char === '\n' || char === '\r') {
        return line;
      }

      line += char;
    }
  }

  /**
   * Receive data (internal - called by event emitter)
   */
  receiveData(data: string): void {
    this.buffer.push(...data.split(''));
    this.emit('data', data);
  }

  /**
   * Get serial port status
   */
  isPortOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Get available ports
   */
  static async listPorts(): Promise<string[]> {
    try {
      // Simulate available ports
      return ['/dev/ttyUSB0', '/dev/ttyACM0', 'COM3', 'COM4'];
    } catch (error) {
      return [];
    }
  }
}

/**
 * Create serial port instance
 */
export function createSerialPort(config: SerialConfig): SerialPort {
  return new SerialPort(config);
}

/**
 * Open serial port (shortcut)
 */
export async function openSerial(
  port: string,
  baudRate: number = 9600,
  timeout: number = 1000
): Promise<SerialPort> {
  const serial = new SerialPort({
    port,
    baudRate,
    timeout,
  });

  await serial.open();
  return serial;
}

/**
 * Close serial port (shortcut)
 */
export async function closeSerial(serial: SerialPort): Promise<void> {
  await serial.close();
}

/**
 * JSON Protocol Handler (for Arduino communication)
 */
export class JsonProtocol {
  private serial: SerialPort;

  constructor(serial: SerialPort) {
    this.serial = serial;
  }

  /**
   * Send JSON command
   */
  async sendCommand(cmd: any): Promise<void> {
    const json = JSON.stringify(cmd);
    await this.serial.write(json + '\n');
  }

  /**
   * Receive JSON response
   */
  async receiveCommand(timeout: number = 1000): Promise<any> {
    const line = await this.serial.readline(timeout);

    if (!line) {
      return null;
    }

    try {
      return JSON.parse(line);
    } catch (error) {
      console.error(`[JsonProtocol] Parse error: ${line}`);
      return null;
    }
  }
}

/**
 * Motor Control Commands
 */
export interface MotorCommand {
  direction: 'forward' | 'backward' | 'left' | 'right' | 'stop';
  speed: number;
  duration?: number;
}

/**
 * Sensor Reading
 */
export interface SensorReading {
  distance: number;
  timestamp: number;
  confidence: number;
  raw?: number[];
}

/**
 * Motor Controller via Serial
 */
export class MotorController {
  private protocol: JsonProtocol;
  private serial: SerialPort;

  constructor(serial: SerialPort) {
    this.serial = serial;
    this.protocol = new JsonProtocol(serial);
  }

  /**
   * Send motor command
   */
  async move(cmd: MotorCommand): Promise<boolean> {
    try {
      await this.protocol.sendCommand({
        type: 'motor',
        direction: cmd.direction,
        speed: Math.min(255, Math.max(0, cmd.speed)),
        duration: cmd.duration || 0,
      });
      return true;
    } catch (error) {
      console.error(`[MotorController] Command error: ${error}`);
      return false;
    }
  }

  /**
   * Read sensor data
   */
  async readSensor(timeout: number = 1000): Promise<SensorReading | null> {
    try {
      const data = await this.protocol.receiveCommand(timeout);

      if (!data || !data.distance) {
        return null;
      }

      return {
        distance: data.distance,
        timestamp: data.timestamp || Date.now(),
        confidence: data.confidence || 0.0,
        raw: data.raw,
      };
    } catch (error) {
      console.error(`[MotorController] Sensor read error: ${error}`);
      return null;
    }
  }
}

/**
 * Create motor controller
 */
export function createMotorController(serial: SerialPort): MotorController {
  return new MotorController(serial);
}

/**
 * High-level Robot API
 */
export class Robot {
  private motorController: MotorController;
  private serial: SerialPort;

  constructor(port: string, baudRate: number = 115200) {
    const config: SerialConfig = {
      port,
      baudRate,
      timeout: 1000,
    };

    this.serial = new SerialPort(config);
    this.motorController = new MotorController(this.serial);
  }

  /**
   * Connect to robot
   */
  async connect(): Promise<boolean> {
    try {
      await this.serial.open();
      console.log(`[Robot] Connected to ${this.serial}`);
      return true;
    } catch (error) {
      console.error(`[Robot] Connection failed: ${error}`);
      return false;
    }
  }

  /**
   * Disconnect from robot
   */
  async disconnect(): Promise<void> {
    await this.serial.close();
    console.log('[Robot] Disconnected');
  }

  /**
   * Move robot
   */
  async move(direction: 'forward' | 'backward' | 'left' | 'right' | 'stop', speed: number = 255): Promise<boolean> {
    return this.motorController.move({ direction, speed });
  }

  /**
   * Read distance sensor
   */
  async getDistance(timeout: number = 1000): Promise<number> {
    const reading = await this.motorController.readSensor(timeout);
    return reading?.distance || 0;
  }

  /**
   * Read full sensor data
   */
  async getSensorData(timeout: number = 1000): Promise<SensorReading | null> {
    return this.motorController.readSensor(timeout);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.serial.isPortOpen();
  }
}

/**
 * Create robot instance
 */
export function createRobot(port: string, baudRate: number = 115200): Robot {
  return new Robot(port, baudRate);
}
