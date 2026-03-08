import {
  RandomGenerator,
  MathConstants,
  MathUtils,
  Random,
  Statistics,
  testMathFoundation,
} from '../src/phase-11/math-foundation';

describe('Phase 11: Math Foundation & Random Numbers', () => {
  // Math Constants
  describe('Math Constants', () => {
    it('should have correct PI value', () => {
      expect(MathConstants.PI).toBeCloseTo(3.14159265, 5);
    });

    it('should have correct E value', () => {
      expect(MathConstants.E).toBeCloseTo(2.71828182, 5);
    });

    it('should have LN2', () => {
      expect(MathConstants.LN2).toBeCloseTo(0.693147, 5);
    });

    it('should have SQRT2', () => {
      expect(MathConstants.SQRT2).toBeCloseTo(1.414213, 5);
    });
  });

  // Basic Math Functions
  describe('MathUtils', () => {
    it('should calculate sqrt', () => {
      expect(MathUtils.sqrt(16)).toBe(4);
      expect(MathUtils.sqrt(2)).toBeCloseTo(1.414, 2);
    });

    it('should calculate pow', () => {
      expect(MathUtils.pow(2, 10)).toBe(1024);
      expect(MathUtils.pow(3, 3)).toBe(27);
    });

    it('should calculate exp', () => {
      expect(MathUtils.exp(0)).toBe(1);
      expect(MathUtils.exp(1)).toBeCloseTo(MathConstants.E, 5);
    });

    it('should calculate log', () => {
      expect(MathUtils.log(1)).toBe(0);
      expect(MathUtils.log(MathConstants.E)).toBeCloseTo(1, 10);
    });

    it('should calculate log10', () => {
      expect(MathUtils.log10(1)).toBe(0);
      expect(MathUtils.log10(100)).toBe(2);
    });

    it('should calculate abs', () => {
      expect(MathUtils.abs(-5)).toBe(5);
      expect(MathUtils.abs(5)).toBe(5);
    });

    it('should floor/ceil/round', () => {
      expect(MathUtils.floor(3.7)).toBe(3);
      expect(MathUtils.ceil(3.2)).toBe(4);
      expect(MathUtils.round(3.5)).toBe(4);
    });

    it('should find min/max', () => {
      expect(MathUtils.min(1, 5, 3)).toBe(1);
      expect(MathUtils.max(1, 5, 3)).toBe(5);
    });

    it('should calculate sin/cos/tan', () => {
      expect(MathUtils.sin(0)).toBe(0);
      expect(MathUtils.cos(0)).toBe(1);
      expect(MathUtils.tan(0)).toBe(0);
    });

    it('should calculate special trig values', () => {
      expect(MathUtils.sin(MathConstants.PI / 2)).toBeCloseTo(1, 10);
      expect(MathUtils.cos(MathConstants.PI)).toBeCloseTo(-1, 10);
    });

    it('should clamp values', () => {
      expect(MathUtils.clamp(5, 0, 10)).toBe(5);
      expect(MathUtils.clamp(15, 0, 10)).toBe(10);
      expect(MathUtils.clamp(-5, 0, 10)).toBe(0);
    });

    it('should linear interpolate', () => {
      expect(MathUtils.lerp(0, 10, 0)).toBe(0);
      expect(MathUtils.lerp(0, 10, 0.5)).toBe(5);
      expect(MathUtils.lerp(0, 10, 1)).toBe(10);
    });

    it('should calculate distance', () => {
      expect(MathUtils.distance(0, 0, 3, 4)).toBe(5);
      expect(MathUtils.distance(0, 0, 0, 0)).toBe(0);
    });
  });

  // Random Generator
  describe('RandomGenerator', () => {
    it('should generate uniform random numbers', () => {
      const rng = new RandomGenerator(42);
      const val = rng.random();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });

    it('should be reproducible with seed', () => {
      const rng1 = new RandomGenerator(42);
      const rng2 = new RandomGenerator(42);
      expect(rng1.random()).toBe(rng2.random());
    });

    it('should generate different values with different seeds', () => {
      const rng1 = new RandomGenerator(42);
      const rng2 = new RandomGenerator(43);
      expect(rng1.random()).not.toBe(rng2.random());
    });

    it('should generate normal distribution', () => {
      const rng = new RandomGenerator(42);
      const values = Array.from({ length: 1000 }, () => rng.randomNormal());
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      expect(mean).toBeCloseTo(0, 0); // Should be close to 0
    });

    it('should generate random integers', () => {
      const rng = new RandomGenerator();
      for (let i = 0; i < 100; i++) {
        const val = rng.randomInt(0, 10);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(10);
      }
    });

    it('should shuffle arrays', () => {
      const rng = new RandomGenerator();
      const arr = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle(arr);
      expect(shuffled.length).toBe(5);
      expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should choose random element', () => {
      const rng = new RandomGenerator();
      const arr = [1, 2, 3];
      const chosen = rng.randomChoice(arr);
      expect(arr).toContain(chosen);
    });
  });

  // Global Random Functions
  describe('Random (Global)', () => {
    it('should generate random number', () => {
      const val = Random.random();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });

    it('should generate normal distribution', () => {
      const val = Random.normal();
      expect(typeof val).toBe('number');
    });

    it('should generate random integer', () => {
      const val = Random.int(1, 100);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThan(100);
    });

    it('should shuffle array', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = Random.shuffle(arr);
      expect(shuffled.length).toBe(5);
    });

    it('should choose from array', () => {
      const arr = [1, 2, 3];
      const chosen = Random.choice(arr);
      expect(arr).toContain(chosen);
    });

    it('should set seed', () => {
      Random.seed(42);
      const val1 = Random.random();
      Random.seed(42);
      const val2 = Random.random();
      expect(val1).toBe(val2);
    });
  });

  // Statistics
  describe('Statistics', () => {
    const data = [1, 2, 3, 4, 5];

    it('should calculate sum', () => {
      expect(Statistics.sum(data)).toBe(15);
    });

    it('should calculate mean', () => {
      expect(Statistics.mean(data)).toBe(3);
    });

    it('should calculate median', () => {
      expect(Statistics.median(data)).toBe(3);
      expect(Statistics.median([1, 2, 3, 4])).toBe(2.5);
    });

    it('should calculate variance', () => {
      expect(Statistics.variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4, 1);
    });

    it('should calculate standard deviation', () => {
      const stdDev = Statistics.stdDev([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(stdDev).toBeCloseTo(2, 0);
    });

    it('should find min/max', () => {
      expect(Statistics.min(data)).toBe(1);
      expect(Statistics.max(data)).toBe(5);
    });

    it('should calculate range', () => {
      expect(Statistics.range(data)).toBe(4);
    });

    it('should calculate percentile', () => {
      const arr = Array.from({ length: 100 }, (_, i) => i + 1);
      const p50 = Statistics.percentile(arr, 50);
      const p25 = Statistics.percentile(arr, 25);
      expect(p50).toBeGreaterThan(49);
      expect(p50).toBeLessThan(52);
      expect(p25).toBeGreaterThan(24);
      expect(p25).toBeLessThan(26);
    });

    it('should handle empty arrays', () => {
      expect(Statistics.mean([])).toBe(0);
      expect(Statistics.variance([])).toBe(0);
    });
  });

  // Monte Carlo Pi Estimation (Real-World Example)
  describe('Monte Carlo Pi Estimation', () => {
    it('should estimate PI using Monte Carlo', () => {
      Random.seed(42);
      const iterations = 100000;
      let hits = 0;

      for (let i = 0; i < iterations; i++) {
        const x = Random.random();
        const y = Random.random();
        if (MathUtils.sqrt(x * x + y * y) <= 1) {
          hits++;
        }
      }

      const piEstimate = (4 * hits) / iterations;
      expect(piEstimate).toBeCloseTo(MathConstants.PI, 1);
    });
  });

  // Integration test
  it('should run math foundation tests without errors', () => {
    expect(() => testMathFoundation()).not.toThrow();
  });
});
