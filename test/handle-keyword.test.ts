
// Test: handle 키워드 (2026-03-06)
import { run } from '../cli/runner.ts';

describe('handle keyword', () => {
  it('should work like try-catch', () => {
    const code = `
      handle {
        let x = 1 / 0;
        println("이건 실행 안 됨");
      } => (e) {
        println("에러 처리됨");
      }
    `;

    const result = run(code);
    expect(result).toBe("에러 처리됨");
  });

  it('should support nested handles', () => {
    const code = `
      handle {
        handle {
          throw "inner error";
        } => (e1) {
          throw "outer error";
        }
      } => (e2) {
        println(e2);
      }
    `;

    const result = run(code);
    expect(result).toBe("outer error");
  });

  it('should support variable access in catch block', () => {
    const code = `
      handle {
        throw 42;
      } => (error) {
        println(error + 8);
      }
    `;

    const result = run(code);
    expect(result).toBe("50");
  });
});
