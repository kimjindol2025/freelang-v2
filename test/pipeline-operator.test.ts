
// Test: 파이프라인 연산자 (2026-03-06)
import { run } from '../cli/runner.ts';

describe('pipeline operator |>', () => {
  it('should chain function calls left to right', () => {
    const code = `
      fn double(x) { return x * 2; }
      fn add10(x) { return x + 10; }
      fn square(x) { return x * x; }

      let result = 5 |> double |> add10 |> square;
      println(result);
    `;

    // 5 * 2 = 10, 10 + 10 = 20, 20 * 20 = 400
    const result = run(code);
    expect(result).toBe("400");
  });

  it('should work with array methods', () => {
    const code = `
      let arr = [1, 2, 3, 4, 5];
      let result = arr
        |> filter(fn(x) { return x > 2; })
        |> map(fn(x) { return x * 2; })
        |> reduce(fn(acc, x) { return acc + x; }, 0);
      println(result);
    `;

    // [3, 4, 5] => [6, 8, 10] => 24
    const result = run(code);
    expect(result).toBe("24");
  });

  it('should improve code readability', () => {
    const code = `
      fn process(data) {
        return data
          |> parse
          |> validate
          |> transform
          |> format;
      }

      let result = process("[1,2,3]");
      println(typeof result);
    `;

    const result = run(code);
    expect(result).toBe("string");
  });
});
