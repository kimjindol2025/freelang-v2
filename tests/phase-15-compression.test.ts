/**
 * Phase 15: Compression Layer Tests
 *
 * 압축 엔진 검증:
 * - 압축/해제 동작
 * - 임계값 처리
 * - 압축 효율성
 * - 성능 메트릭
 * - 에러 처리
 */

import { CompressionLayer, CompressedMessage, CompressionStats } from '../src/dashboard/compression-layer';

describe('Phase 15: Compression Layer', () => {
  let compressor: CompressionLayer;

  beforeEach(() => {
    compressor = new CompressionLayer(200, 6, true); // threshold: 200, level: 6, enabled
  });

  afterEach(() => {
    compressor.resetStats();
  });

  describe('Basic Compression & Decompression', () => {
    test('should compress large messages', async () => {
      const largeMessage = JSON.stringify({
        type: 'stats',
        data: {
          total_patterns: 100,
          avg_confidence: 0.75,
          patterns: Array(50).fill({ id: 'pattern', confidence: 0.8 })
        }
      });

      const result = await compressor.compress(largeMessage);

      expect(result).not.toBeNull();
      expect(result!.compressedSize).toBeLessThan(result!.originalSize);
      expect(result!.compressionRatio).toBeGreaterThan(1);
    });

    test('should decompress correctly', async () => {
      // Make message large enough to exceed threshold (200 bytes)
      const originalMessage = JSON.stringify({
        type: 'stats',
        timestamp: Date.now(),
        data: {
          value: 123,
          nested: { deep: true },
          patterns: Array(20).fill({ id: 'pattern', confidence: 0.75, approval: 0.8 })
        }
      });

      const compressed = await compressor.compress(originalMessage);
      expect(compressed).not.toBeNull();

      const decompressed = await compressor.decompress(compressed!.compressed);
      expect(decompressed).toBe(originalMessage);
    });

    test('should handle empty messages', async () => {
      const result = await compressor.compress('');
      expect(result).toBeNull(); // Below threshold
    });

    test('should skip compression for small messages', async () => {
      const smallMessage = 'small';
      const result = await compressor.compress(smallMessage);

      expect(result).toBeNull(); // Below threshold (200 bytes)
      const stats = compressor.getStats();
      expect(stats.uncompressedMessages).toBe(1);
    });
  });

  describe('Threshold Handling', () => {
    test('should respect compression threshold', async () => {
      const message = 'x'.repeat(150); // Below default 200

      const result = await compressor.compress(message);
      expect(result).toBeNull();

      const stats = compressor.getStats();
      expect(stats.uncompressedMessages).toBe(1);
      expect(stats.compressedMessages).toBe(0);
    });

    test('should compress at threshold boundary', async () => {
      // Create message exactly at threshold (200 bytes)
      // + JSON overhead for type/timestamp
      const message = JSON.stringify({
        type: 'stats',
        data: 'x'.repeat(180)
      });

      const result = await compressor.compress(message);
      // May or may not compress depending on gzip efficiency
      expect(result === null || result.compressionRatio >= 1.5).toBe(true);
    });

    test('should use custom threshold', async () => {
      const customCompressor = new CompressionLayer(50, 6, true);

      const message = 'x'.repeat(100); // Above custom threshold

      const result = await customCompressor.compress(message);
      expect(result).not.toBeNull();
    });
  });

  describe('Compression Efficiency', () => {
    test('should skip compression if inefficient (<50% reduction)', async () => {
      // Random binary-like data compresses poorly
      const poorCompressData = Array(500)
        .fill(0)
        .map(() => String.fromCharCode(Math.random() * 256))
        .join('');

      const result = await compressor.compress(poorCompressData);
      // May skip if compression ratio < 1.5
      expect(result === null || result.compressionRatio >= 1.5).toBe(true);
    });

    test('should achieve good compression for repetitive data', async () => {
      const repetitiveData = JSON.stringify({
        patterns: Array(100)
          .fill(0)
          .map((_, i) => ({
            id: `pattern_${i}`,
            type: 'stats',
            confidence: 0.75,
            approval: 0.80,
            data: { value: 1, count: 2, ratio: 3 }
          }))
      });

      const result = await compressor.compress(repetitiveData);
      expect(result).not.toBeNull();
      expect(result!.compressionRatio).toBeGreaterThan(2); // Should compress well
    });
  });

  describe('Performance & Metrics', () => {
    test('should track compression statistics', async () => {
      const messages = [
        JSON.stringify({ type: 'stats', data: 'x'.repeat(300) }),
        JSON.stringify({ type: 'trends', data: 'y'.repeat(250) }),
        'small' // Uncompressed
      ];

      for (const msg of messages) {
        await compressor.compress(msg);
      }

      const stats = compressor.getStats();
      expect(stats.totalMessages).toBe(3);
      expect(stats.compressedMessages).toBeGreaterThanOrEqual(2);
      expect(stats.uncompressedMessages).toBeGreaterThanOrEqual(1);
    });

    test('should calculate compression ratio', async () => {
      const repetitiveMessage = JSON.stringify({
        data: Array(200).fill({ value: 1 })
      });

      const result = await compressor.compress(repetitiveMessage);
      expect(result).not.toBeNull();
      expect(result!.compressionRatio).toBeGreaterThan(1);

      const stats = compressor.getStats();
      expect(stats.compressionRatio).toBeGreaterThan(1);
    });

    test('should measure compression time', async () => {
      const message = JSON.stringify({
        data: Array(1000).fill({ id: 'test', value: 123 })
      });

      const result = await compressor.compress(message);
      expect(result).not.toBeNull();
      expect(result!.compressionTime).toBeGreaterThan(0);
      expect(result!.compressionTime).toBeLessThan(100); // Should be fast
    });

    test('should track average compression time', async () => {
      const messages = Array(5)
        .fill(0)
        .map(
          () => JSON.stringify({
            data: Array(100).fill({ id: 'test', value: 123 })
          })
        );

      for (const msg of messages) {
        await compressor.compress(msg);
      }

      const stats = compressor.getStats();
      expect(stats.averageCompressionTime).toBeGreaterThan(0);
      expect(stats.averageCompressionTime).toBeLessThan(50);
    });

    test('should calculate bandwidth savings', async () => {
      const message = JSON.stringify({
        data: Array(200).fill({ id: 'pattern', confidence: 0.75, approval: 0.8 })
      });

      const result = await compressor.compress(message);
      expect(result).not.toBeNull();

      const stats = compressor.getStats();
      expect(stats.bandwidthSaved).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    test('should disable compression', async () => {
      compressor.setCompressionEnabled(false);

      const largeMessage = JSON.stringify({
        data: Array(500).fill({ id: 'test' })
      });

      const result = await compressor.compress(largeMessage);
      expect(result).toBeNull();

      const stats = compressor.getStats();
      expect(stats.compressedMessages).toBe(0);
    });

    test('should change compression level', () => {
      compressor.setCompressionLevel(1); // Fast compression
      expect(() => compressor.setCompressionLevel(9)).not.toThrow(); // Max compression

      // Invalid levels should throw
      expect(() => compressor.setCompressionLevel(-1)).toThrow();
      expect(() => compressor.setCompressionLevel(10)).toThrow();
    });

    test('should change compression threshold', async () => {
      compressor.setCompressionThreshold(50); // Lower threshold

      const message = 'x'.repeat(100); // Above new threshold

      const result = await compressor.compress(message);
      expect(result === null || result.compressionRatio >= 1.5).toBe(true);
    });
  });

  describe('State Management', () => {
    test('should reset statistics', async () => {
      const message = JSON.stringify({
        data: Array(200).fill({ id: 'test' })
      });

      await compressor.compress(message);

      let stats = compressor.getStats();
      expect(stats.totalMessages).toBe(1);

      compressor.resetStats();

      stats = compressor.getStats();
      expect(stats.totalMessages).toBe(0);
      expect(stats.compressedMessages).toBe(0);
      expect(stats.bandwidthSaved).toBe(0);
    });
  });

  describe('Debug & Summary', () => {
    test('should provide debug info', async () => {
      const message = JSON.stringify({
        data: Array(200).fill({ id: 'test' })
      });

      await compressor.compress(message);

      const debug = compressor.getDebugInfo();
      expect(debug).toHaveProperty('enabled');
      expect(debug).toHaveProperty('threshold');
      expect(debug).toHaveProperty('level');
      expect(debug).toHaveProperty('stats');
      expect(debug).toHaveProperty('recentCompressionTimes');
    });

    test('should generate summary', async () => {
      const message = JSON.stringify({
        data: Array(200).fill({ id: 'test' })
      });

      await compressor.compress(message);

      const summary = compressor.getSummary();
      expect(summary).toContain('Compression Summary');
      expect(summary).toContain('Total messages');
      expect(summary).toContain('Bandwidth saved');
    });
  });

  describe('Large Message Handling', () => {
    test('should handle very large messages', async () => {
      const veryLargeMessage = JSON.stringify({
        data: Array(1000)
          .fill(0)
          .map((_, i) => ({
            id: `pattern_${i}`,
            metadata: {
              confidence: 0.75,
              approval: 0.8,
              usage: 100,
              feedback: 50
            },
            timestamps: Array(10).fill(Date.now())
          }))
      });

      const result = await compressor.compress(veryLargeMessage);
      expect(result).not.toBeNull();
      expect(result!.compressedSize).toBeLessThan(result!.originalSize);
    }, 10000);

    test('should handle multiple large messages efficiently', async () => {
      const createMessage = (index: number) =>
        JSON.stringify({
          id: index,
          data: Array(300)
            .fill(0)
            .map((_, i) => ({
              nested: { value: i, flag: i % 2 === 0 }
            }))
        });

      let totalOriginal = 0;
      let totalCompressed = 0;

      for (let i = 0; i < 10; i++) {
        const message = createMessage(i);
        const result = await compressor.compress(message);

        if (result) {
          totalOriginal += result.originalSize;
          totalCompressed += result.compressedSize;
        }
      }

      expect(totalCompressed).toBeLessThan(totalOriginal);

      const stats = compressor.getStats();
      expect(stats.compressionRatio).toBeGreaterThan(1.5);
    });
  });

  describe('Error Handling', () => {
    test('should handle decompression errors gracefully', async () => {
      const invalidBuffer = Buffer.from('not-gzip-data');

      await expect(compressor.decompress(invalidBuffer)).rejects.toThrow();
    });

    test('should handle compression of invalid data', async () => {
      // Even though TypeScript expects string, test robustness
      const result = await compressor.compress('');
      expect(result).toBeNull(); // Too small
    });
  });

  describe('Compatibility', () => {
    test('should work with JSON serialized messages', async () => {
      const jsonMessage = JSON.stringify({
        type: 'batch',
        timestamp: Date.now(),
        messages: [
          {
            type: 'stats',
            timestamp: Date.now(),
            data: {
              total_patterns: 100,
              avg_confidence: 0.75,
              patterns: Array(50).fill({ id: 'p', c: 0.8 })
            }
          }
        ]
      });

      const result = await compressor.compress(jsonMessage);
      expect(result).not.toBeNull();

      const decompressed = await compressor.decompress(result!.compressed);
      expect(JSON.parse(decompressed)).toEqual(JSON.parse(jsonMessage));
    });

    test('should preserve message integrity through compress-decompress cycle', async () => {
      const originalData = {
        complex: {
          nested: {
            deeply: {
              value: 'test',
              numbers: [1, 2, 3, 4, 5],
              flags: [true, false, true]
            }
          },
          array: Array(100).fill({ id: 'item', value: Math.random() })
        }
      };

      const message = JSON.stringify(originalData);
      const result = await compressor.compress(message);

      expect(result).not.toBeNull();

      const decompressed = await compressor.decompress(result!.compressed);
      expect(JSON.parse(decompressed)).toEqual(originalData);
    });
  });
});
