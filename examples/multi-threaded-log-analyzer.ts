/**
 * Phase 10 Example: Multi-Threaded Log Analyzer
 *
 * This example demonstrates:
 * - Reading large log files
 * - Parallel processing with ThreadPool
 * - String utilities (parsing, regex)
 * - Collections (HashMap for statistics)
 * - File I/O operations
 * - Memory monitoring
 *
 * Usage:
 *   npm run example-logs
 */

import { FileIO } from '../src/phase-10/file-io';
import { StringUtils, RegexUtils } from '../src/phase-10/string-utils';
import { ThreadPool, parallelMap } from '../src/phase-10/threading';
import { HashMap } from '../src/phase-10/collections';
import { MemoryMonitor } from '../src/phase-9/memory-monitor';

/**
 * Log Entry
 */
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  ip?: string;
  duration?: number;
}

/**
 * Parse log line into structured entry
 */
function parseLogEntry(line: string): LogEntry | null {
  if (StringUtils.isEmpty(line.trim())) return null;

  const timestamp = RegexUtils.extractTimestamp(line) || new Date().toISOString();
  const match = RegexUtils.parseLog(line);
  const ip = RegexUtils.extractIp(line) || undefined;

  if (!match) return null;

  // Extract duration if present (e.g., "500ms")
  const durationMatch = line.match(/(\d+)ms/);
  const duration = durationMatch ? parseInt(durationMatch[1], 10) : undefined;

  return {
    timestamp,
    level: match.level,
    message: match.message,
    ip,
    duration,
  };
}

/**
 * Analyze log entries
 */
function analyzeEntries(entries: LogEntry[]): {
  totalLines: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  avgDuration: number;
  uniqueIps: number;
  topErrors: Array<{ error: string; count: number }>;
} {
  const levelCount = new HashMap<string, number>();
  const errorMap = new HashMap<string, number>();
  const ipSet = new Set<string>();
  let totalDuration = 0;
  let durationCount = 0;

  for (const entry of entries) {
    const level = entry.level || 'UNKNOWN';
    levelCount.set(level, (levelCount.get(level) || 0) + 1);

    if (level === 'ERROR') {
      const shortMsg = StringUtils.substring(entry.message, 0, 50);
      errorMap.set(shortMsg, (errorMap.get(shortMsg) || 0) + 1);
    }

    if (entry.ip) ipSet.add(entry.ip);
    if (entry.duration) {
      totalDuration += entry.duration;
      durationCount++;
    }
  }

  return {
    totalLines: entries.length,
    errorCount: levelCount.get('ERROR') || 0,
    warningCount: levelCount.get('WARN') || 0,
    infoCount: levelCount.get('INFO') || 0,
    avgDuration: durationCount > 0 ? totalDuration / durationCount : 0,
    uniqueIps: ipSet.size,
    topErrors: errorMap
      .entries()
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error, count]) => ({ error, count })),
  };
}

/**
 * Main analyzer
 */
async function analyzeLogFile(filePath: string, concurrency: number = 4): Promise<void> {
  const fileIO = new FileIO();
  const monitor = new MemoryMonitor();
  const startTime = Date.now();

  console.log(`📊 Log Analyzer Starting...`);
  console.log(`📁 File: ${filePath}`);
  console.log(`⚙️  Concurrency: ${concurrency} threads\n`);

  // 1. Read file
  console.log('1️⃣ Reading file...');
  monitor.recordSnapshot();

  let lines: string[];
  try {
    const content = fileIO.readFile(filePath);
    lines = StringUtils.split(content, '\n');
  } catch (error) {
    console.error(`❌ Cannot read file: ${error}`);
    return;
  }

  console.log(`   ✅ Read ${lines.length} lines (${fileIO.formatFileSize(fileIO.stat(filePath).size)})\n`);

  // 2. Parse lines in parallel
  console.log('2️⃣ Parsing log entries...');
  const parseStart = Date.now();

  const entries = await parallelMap(
    lines,
    async (line) => parseLogEntry(line),
    concurrency
  );

  const validEntries = entries.filter((e) => e !== null) as LogEntry[];
  const parseDuration = Date.now() - parseStart;

  console.log(`   ✅ Parsed ${validEntries.length} entries in ${parseDuration}ms\n`);

  // 3. Analyze entries
  console.log('3️⃣ Analyzing entries...');
  const analyzeStart = Date.now();
  const analysis = analyzeEntries(validEntries);
  const analyzeDuration = Date.now() - analyzeStart;

  console.log(`   ✅ Analysis complete in ${analyzeDuration}ms\n`);

  // 4. Report results
  console.log('📈 Analysis Results:');
  console.log(`   Total Lines:      ${analysis.totalLines}`);
  console.log(`   Error Count:      ${analysis.errorCount}`);
  console.log(`   Warning Count:    ${analysis.warningCount}`);
  console.log(`   Info Count:       ${analysis.infoCount}`);
  console.log(`   Avg Duration:     ${analysis.avgDuration.toFixed(2)}ms`);
  console.log(`   Unique IPs:       ${analysis.uniqueIps}`);

  if (analysis.topErrors.length > 0) {
    console.log(`\n🔴 Top Errors:`);
    analysis.topErrors.forEach((err, i) => {
      console.log(`   ${i + 1}. "${err.error}" (${err.count}x)`);
    });
  }

  // 5. Memory report
  console.log(`\n💾 Memory Usage:`);
  const report = MemoryMonitor.getReport();
  const usage = MemoryMonitor.getMemoryUsage();
  console.log(`   Heap Used:   ${report.percentages.heapUsagePercent.toFixed(2)}%`);
  console.log(`   Heap Size:   ${MemoryMonitor.formatBytes(usage.heapUsed)}`);
  console.log(`   Total Memory: ${MemoryMonitor.formatBytes(usage.rss)}`);

  const totalTime = Date.now() - startTime;
  console.log(`\n⏱️  Total Time: ${totalTime}ms`);
}

/**
 * Create sample log file for testing
 */
async function createSampleLogFile(): Promise<string> {
  const fileIO = new FileIO();
  const logPath = '/tmp/sample.log';

  const sampleLogs = [
    '2026-02-17T10:00:00 INFO: Server started on port 3000',
    '2026-02-17T10:00:01 INFO: Database connection established',
    '2026-02-17T10:00:02 ERROR: Failed to load config at 192.168.1.1 500ms',
    '2026-02-17T10:00:03 WARN: Cache miss 200ms',
    '2026-02-17T10:00:04 INFO: Request received from 10.0.0.5',
    '2026-02-17T10:00:05 ERROR: Timeout at 192.168.1.1 1000ms',
    '2026-02-17T10:00:06 INFO: Response sent 150ms',
    '2026-02-17T10:00:07 WARN: High memory usage 300ms',
    '2026-02-17T10:00:08 ERROR: Authentication failed at 192.168.1.2 800ms',
    '2026-02-17T10:00:09 INFO: Cleanup completed 50ms',
  ];

  // Create a larger sample by repeating
  const lines: string[] = [];
  for (let i = 0; i < 100; i++) {
    lines.push(...sampleLogs.map((log) => log + ` [iteration ${i}]`));
  }

  fileIO.writeFile(logPath, lines.join('\n'));
  return logPath;
}

/**
 * Entry point
 */
async function main(): Promise<void> {
  let logPath: string;
  if (process.argv[2]) {
    logPath = process.argv[2];
  } else {
    logPath = await createSampleLogFile();
  }
  await analyzeLogFile(logPath);
}

main().catch(console.error);
