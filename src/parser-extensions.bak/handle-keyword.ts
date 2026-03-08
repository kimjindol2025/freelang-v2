
// FreeLang Parser Extension - handle 키워드 (2026-03-06)

/**
 * handle 키워드를 파서에 추가
 *
 * 문법:
 * handle {
 *   // 시도할 코드
 * } => (e) {
 *   // 오류 처리
 * }
 *
 * 변환:
 * try { ... } catch (e) { ... }
 */

export interface HandleStatement extends Statement {
  type: 'HandleStatement';
  tryBlock: BlockStatement;
  catchParam: string;
  catchBlock: BlockStatement;
}

export function parseHandleStatement(parser: Parser): HandleStatement {
  parser.consume('handle');

  const tryBlock = parseBlockStatement(parser);

  parser.consume('=>');
  parser.consume('(');
  const catchParam = parser.consume('identifier').value;
  parser.consume(')');

  const catchBlock = parseBlockStatement(parser);

  return {
    type: 'HandleStatement',
    tryBlock,
    catchParam,
    catchBlock,
    line: parser.currentToken.line
  };
}

// 인터프리터 변환 (기존 try-catch 로직 재사용)
export function executeHandleStatement(handle: HandleStatement, ctx: ExecutionContext) {
  try {
    return executeBlockStatement(handle.tryBlock, ctx);
  } catch (error) {
    ctx.setVariable(handle.catchParam, error);
    return executeBlockStatement(handle.catchBlock, ctx);
  }
}
