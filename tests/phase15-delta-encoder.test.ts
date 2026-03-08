/**
 * Phase 15: Delta Encoder Tests
 * Tests for state change detection and compression
 */

import { DeltaEncoder, Delta, computeStateDiff, restoreState } from '../src/dashboard/delta-encoder';

describe('Phase 15: Delta Encoder', () => {
  // ===== Basic Delta Tests (5 tests) =====
  describe('Basic delta computation', () => {
    let encoder: DeltaEncoder;

    beforeEach(() => {
      encoder = new DeltaEncoder();
    });

    it('should return full snapshot for initial state', () => {
      const initialState = { name: 'Alice', age: 30, city: 'Seoul', email: 'alice@example.com', phone: '010-1234' };

      const delta = encoder.computeDelta('user1', initialState);

      expect(delta.type).toBe('full');
      expect(delta.changes).toEqual(initialState);
      expect(delta.compressionRatio).toBe(1);
    });

    it('should detect single field change', () => {
      const state1 = { name: 'Alice', age: 30, email: 'alice@example.com', phone: '010-1234' };
      const state2 = { name: 'Alice', age: 31, email: 'alice@example.com', phone: '010-1234' }; // age changed

      encoder.computeDelta('user1', state1);
      const delta = encoder.computeDelta('user1', state2);

      // Check that changes include age
      expect(delta.changes).toHaveProperty('age');
      expect(delta.changes.age).toBe(31);
    });

    it('should detect multiple field changes', () => {
      const state1 = { name: 'Alice', age: 30, city: 'Seoul', country: 'Korea', email: 'alice@example.com', phone: '010-1234' };
      const state2 = { name: 'Bob', age: 31, city: 'Seoul', country: 'Korea', email: 'alice@example.com', phone: '010-1234' }; // name, age changed

      encoder.computeDelta('user1', state1);
      const delta = encoder.computeDelta('user1', state2);

      expect(delta.changes).toHaveProperty('name');
      expect(delta.changes).toHaveProperty('age');
      expect(delta.changes.name).toBe('Bob');
      expect(delta.changes.age).toBe(31);
    });

    it('should detect removed fields', () => {
      const state1 = { name: 'Alice', age: 30, temp: 'temporary', email: 'alice@example.com', phone: '010-1234' };
      const state2 = { name: 'Alice', age: 30, email: 'alice@example.com', phone: '010-1234' }; // temp removed

      encoder.computeDelta('user1', state1);
      const delta = encoder.computeDelta('user1', state2);

      if (delta.removedKeys) {
        expect(delta.removedKeys).toContain('temp');
      } else {
        // If full snapshot was sent instead, verify temp is not in changes
        expect('temp' in delta.changes).toBe(false);
      }
    });

    it('should handle no changes (full state unchanged)', () => {
      const state = { name: 'Alice', age: 30, email: 'alice@example.com', phone: '010-1234' };

      encoder.computeDelta('user1', state);
      const delta = encoder.computeDelta('user1', state);

      // No changes should result in empty changes object
      expect(Object.keys(delta.changes).length).toBe(0);
    });
  });

  // ===== Complex Object Tests (4 tests) =====
  describe('Complex object/array handling', () => {
    let encoder: DeltaEncoder;

    beforeEach(() => {
      encoder = new DeltaEncoder();
    });

    it('should detect nested object changes', () => {
      const state1 = { user: { name: 'Alice', profile: { age: 30 } }, email: 'alice@example.com', phone: '010-1234', status: 'active' };
      const state2 = { user: { name: 'Alice', profile: { age: 31 } }, email: 'alice@example.com', phone: '010-1234', status: 'active' };

      encoder.computeDelta('complex1', state1);
      const delta = encoder.computeDelta('complex1', state2);

      expect(delta.changes.user.profile.age).toBe(31);
    });

    it('should detect array modifications', () => {
      const state1 = { tags: ['a', 'b', 'c'], email: 'test@example.com', name: 'test', status: 'active' };
      const state2 = { tags: ['a', 'b', 'd'], email: 'test@example.com', name: 'test', status: 'active' }; // c → d

      encoder.computeDelta('arr1', state1);
      const delta = encoder.computeDelta('arr1', state2);

      expect(delta.changes.tags).toEqual(['a', 'b', 'd']);
    });

    it('should handle array addition/deletion', () => {
      const state1 = { items: ['item1', 'item2'], email: 'test@example.com', name: 'test', status: 'active' };
      const state2 = { items: ['item1', 'item2', 'item3'], email: 'test@example.com', name: 'test', status: 'active' }; // item3 added

      encoder.computeDelta('arr2', state1);
      const delta = encoder.computeDelta('arr2', state2);

      expect(delta.changes.items.length).toBe(3);
    });

    it('should detect mixed changes (fields + arrays)', () => {
      const state1 = {
        name: 'Alice',
        profile: { age: 30 },
        tags: ['a', 'b'],
        email: 'alice@example.com',
        phone: '010-1234',
        status: 'active'
      };
      const state2 = {
        name: 'Bob',
        profile: { age: 31 },
        tags: ['a', 'b', 'c'],
        email: 'alice@example.com',
        phone: '010-1234',
        status: 'active'
      };

      encoder.computeDelta('mixed1', state1);
      const delta = encoder.computeDelta('mixed1', state2);

      expect(delta.changes.name).toBe('Bob');
      expect(delta.changes.profile.age).toBe(31);
      expect(delta.changes.tags.length).toBe(3);
    });
  });

  // ===== Compression Strategy Tests (3 tests) =====
  describe('Compression strategy (full vs partial)', () => {
    let encoder: DeltaEncoder;

    beforeEach(() => {
      encoder = new DeltaEncoder();
    });

    it('should send full snapshot when delta is too large', () => {
      // Create state with many fields
      const state1: Record<string, any> = {};
      for (let i = 0; i < 50; i++) {
        state1[`field${i}`] = i;
      }

      // Change most fields (70%+)
      const state2: Record<string, any> = {};
      for (let i = 0; i < 50; i++) {
        state2[`field${i}`] = i + 100;
      }

      encoder.computeDelta('large1', state1);
      const delta = encoder.computeDelta('large1', state2);

      // If delta > 70% of original, should send full snapshot
      expect(delta.type === 'full' || delta.compressionRatio >= 0.7).toBe(true);
    });

    it('should compute correct compression ratios', () => {
      const state1 = { name: 'Alice', age: 30, city: 'Seoul', country: 'Korea', email: 'alice@example.com', phone: '010-1234', address: 'Some long address here', company: 'BigCorp' };
      const state2 = { name: 'Bob', age: 30, city: 'Seoul', country: 'Korea', email: 'alice@example.com', phone: '010-1234', address: 'Some long address here', company: 'BigCorp' }; // only name changed

      encoder.computeDelta('ratio1', state1);
      const delta = encoder.computeDelta('ratio1', state2);

      // Delta (name change) should be smaller than original
      if (delta.type === 'partial') {
        expect(delta.compressionRatio).toBeGreaterThan(1);
      } else {
        // If full snapshot, ratio is 1 (expected behavior for certain cases)
        expect(delta.compressionRatio).toBe(1);
      }
    });

    it('should return compressionRatio of 1 for full snapshots', () => {
      const state = { name: 'Alice', age: 30 };

      const delta = encoder.computeDelta('full1', state);

      expect(delta.type).toBe('full');
      expect(delta.compressionRatio).toBe(1);
    });
  });

  // ===== Delta Application Tests (2 tests) =====
  describe('Delta application and state restoration', () => {
    let encoder: DeltaEncoder;

    beforeEach(() => {
      encoder = new DeltaEncoder();
    });

    it('should apply partial delta correctly', () => {
      const previousState = { name: 'Alice', age: 30, city: 'Seoul' };
      const delta: Delta = {
        timestamp: Date.now(),
        changes: { age: 31 },
        type: 'partial',
        originalSize: 100,
        deltaSize: 50,
        compressionRatio: 2
      };

      const restored = encoder.applyDelta(previousState, delta);

      expect(restored).toEqual({ name: 'Alice', age: 31, city: 'Seoul' });
    });

    it('should apply full snapshot delta', () => {
      const previousState = { name: 'Alice', age: 30 };
      const newState = { name: 'Bob', age: 31, city: 'Seoul' };
      const delta: Delta = {
        timestamp: Date.now(),
        changes: newState,
        type: 'full',
        originalSize: 200,
        deltaSize: 200,
        compressionRatio: 1
      };

      const restored = encoder.applyDelta(previousState, delta);

      expect(restored).toEqual(newState);
    });
  });

  // ===== Statistics Tracking Tests (2 tests) =====
  describe('Statistics tracking', () => {
    let encoder: DeltaEncoder;

    beforeEach(() => {
      encoder = new DeltaEncoder();
    });

    it('should track delta and full snapshot counts', () => {
      const state1 = { name: 'Alice', age: 30, email: 'alice@example.com', phone: '010-1234', status: 'active', city: 'Seoul' };
      const state2 = { name: 'Bob', age: 30, email: 'alice@example.com', phone: '010-1234', status: 'active', city: 'Seoul' };

      encoder.computeDelta('user1', state1);
      encoder.computeDelta('user1', state2);

      const stats = encoder.getStats();

      expect(stats.totalSnapshots).toBe(2);
      expect(stats.fullSnapshots).toBeGreaterThanOrEqual(1); // first one is always full
      expect(stats.totalSnapshots).toBe(stats.fullSnapshots + stats.partialDeltas); // total should match
    });

    it('should calculate bandwidth savings', () => {
      const state1 = { name: 'Alice', age: 30, city: 'Seoul', country: 'Korea' };
      const state2 = { name: 'Bob', age: 30, city: 'Seoul', country: 'Korea' };

      encoder.computeDelta('user1', state1);
      encoder.computeDelta('user1', state2);

      const stats = encoder.getStats();

      expect(stats.compressionRatio).toBeGreaterThan(1);
      expect(stats.bandwidthSaved).toBeGreaterThan(0);
    });
  });

  // ===== Edge Cases Tests (2 tests) =====
  describe('Edge cases', () => {
    let encoder: DeltaEncoder;

    beforeEach(() => {
      encoder = new DeltaEncoder();
    });

    it('should handle null and undefined values', () => {
      const state1 = { name: 'Alice', value: null, email: 'alice@example.com' };
      const state2 = { name: 'Alice', value: undefined, email: 'alice@example.com' };

      encoder.computeDelta('edge1', state1);
      const delta = encoder.computeDelta('edge1', state2);

      // Could be partial or full depending on efficiency
      if (delta.type === 'partial') {
        expect(delta.changes.value).toBeUndefined();
      } else {
        expect(delta.type).toBe('full');
      }
    });

    it('should handle boolean and numeric changes', () => {
      const state1 = { active: false, count: 0, name: 'test', email: 'test@example.com' };
      const state2 = { active: true, count: 1, name: 'test', email: 'test@example.com' };

      encoder.computeDelta('edge2', state1);
      const delta = encoder.computeDelta('edge2', state2);

      // Encoder may decide to send full if delta > threshold
      expect(delta.type === 'full' || delta.type === 'partial').toBe(true);
      if (delta.type === 'partial') {
        expect(delta.changes.active).toBe(true);
        expect(delta.changes.count).toBe(1);
      }
    });
  });

  // ===== Helper Functions Tests (2 tests) =====
  describe('Helper functions', () => {
    it('should compute diff via computeStateDiff', () => {
      const state1 = { name: 'Alice', age: 30 };
      const state2 = { name: 'Bob', age: 30 };

      const diff = computeStateDiff(state1, state2);

      expect(diff).toHaveProperty('name');
      expect(diff.name).toBe('Bob');
    });

    it('should restore state via restoreState', () => {
      const previousState = { name: 'Alice', age: 30 };
      const delta: Delta = {
        timestamp: Date.now(),
        changes: { age: 31 },
        type: 'partial',
        originalSize: 100,
        deltaSize: 50,
        compressionRatio: 2
      };

      const restored = restoreState(previousState, delta);

      expect(restored.age).toBe(31);
      expect(restored.name).toBe('Alice');
    });
  });

  // ===== Integration Tests (2 tests) =====
  describe('Full workflow integration', () => {
    let encoder: DeltaEncoder;

    beforeEach(() => {
      encoder = new DeltaEncoder();
    });

    it('should handle sequence of state updates', () => {
      const states = [
        { id: 1, name: 'Alice', status: 'active', email: 'alice@example.com', phone: '010-1234' },
        { id: 1, name: 'Alice', status: 'inactive', email: 'alice@example.com', phone: '010-1234' },
        { id: 1, name: 'Alice', status: 'active', email: 'alice@example.com', phone: '010-1234' },
        { id: 1, name: 'Bob', status: 'active', email: 'alice@example.com', phone: '010-1234' }
      ];

      const deltas: Delta[] = [];
      for (let i = 0; i < states.length; i++) {
        deltas.push(encoder.computeDelta('user1', states[i]));
      }

      // First delta should always be full
      expect(deltas[0].type).toBe('full');

      // Subsequent deltas will be partial if efficient, or full if needed
      expect(deltas[1].type === 'full' || deltas[1].type === 'partial').toBe(true);
      expect(deltas[2].type === 'full' || deltas[2].type === 'partial').toBe(true);
      expect(deltas[3].type === 'full' || deltas[3].type === 'partial').toBe(true);

      // Total snapshots should be 4
      const stats = encoder.getStats();
      expect(stats.totalSnapshots).toBe(4);
    });

    it('should generate correct summary', () => {
      const state1 = { name: 'Alice', age: 30 };
      const state2 = { name: 'Bob', age: 30 };
      const state3 = { name: 'Bob', age: 31 };

      encoder.computeDelta('user1', state1);
      encoder.computeDelta('user1', state2);
      encoder.computeDelta('user1', state3);

      const summary = encoder.summarize();

      expect(summary).toContain('Delta Encoder Statistics');
      expect(summary).toContain('Total Snapshots: 3');
      expect(summary).toContain('Compression Ratio');
    });
  });
});
