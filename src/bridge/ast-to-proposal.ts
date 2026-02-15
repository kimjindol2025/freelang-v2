/**
 * FreeLang v2 Phase 5 - AST to HeaderProposal Bridge
 *
 * MinimalFunctionAST (.free 파일) → HeaderProposal (파이프라인 입력)
 *
 * 역할: Phase 5 (v1 파서)와 Phase 1-4 (AI 파이프라인) 연결
 */
import { MinimalFunctionAST } from '../parser/ast';
import { HeaderProposal } from '../engine/auto-header';
import { Directive } from '../engine/patterns';

/**
 * AST 파싱 신뢰도 (명시적 선언이므로 매우 높음)
 * - 0.98: v1 파서로 완벽하게 구문 분석된 명시적 선언
 * (자유형 텍스트 기반이 아니라 explicit 문법이므로 거의 확실함)
 */
const AST_CONFIDENCE = 0.98;

/**
 * AST를 HeaderProposal로 변환
 *
 * .free 파일의 explicit 선언을 HeaderProposal 형식으로 변환하므로
 * 신뢰도는 매우 높음 (AST_CONFIDENCE = 0.98)
 */
export function astToProposal(ast: MinimalFunctionAST): HeaderProposal {
  const confidence = AST_CONFIDENCE;

  // matched_op 추론: intent에서 동작 키워드 찾기
  const matched_op = inferOperation(ast.intent || '', ast.fnName);

  // 이유 생성 (intent 또는 함수명 기반)
  const reason = ast.intent || `${ast.fnName} operation`;

  // Phase 5: 타입 생략 시 intent에서 추론
  const inputType = ast.inputType || inferTypeFromIntent(ast.intent || '', 'input');
  const outputType = ast.outputType || inferTypeFromIntent(ast.intent || '', 'output');

  // 지시어 (directive) 추론: intent에서 최적화 방향 찾기
  const directive = inferDirective(ast.intent || '');

  // 복잡도 추론 (의도에서 또는 기본값)
  const complexity = inferComplexity(ast.intent || '');

  return {
    fn: ast.fnName,
    input: inputType,
    output: outputType,
    reason,
    directive,
    complexity,
    confidence,
    matched_op
  };
}


/**
 * 동작 추론 (intent + fnName에서)
 *
 * intent가 있으면 거기서, 없으면 fnName에서 동작 추론
 */
function inferOperation(intent: string, fnName: string): string {
  // intent에서 핵심 동작어 찾기
  const intentLower = (intent || fnName).toLowerCase();

  // 키워드 매핑
  const keywords: Record<string, string[]> = {
    sum: ['합산', 'sum', 'add', 'total'],
    average: ['평균', 'average', 'avg', 'mean'],
    max: ['최대', 'max', 'maximum'],
    min: ['최소', 'min', 'minimum'],
    sort: ['정렬', 'sort'],
    reverse: ['역순', 'reverse', 'reverse'],
    filter: ['필터', 'filter', 'where'],
    map: ['변환', 'map', 'transform'],
    count: ['개수', 'count', 'length'],
    find: ['찾기', 'find', 'search'],
    flatten: ['평탄화', 'flatten'],
    unique: ['유일', 'unique', 'distinct']
  };

  // 각 동작에서 intent 키워드 검색
  for (const [op, opKeywords] of Object.entries(keywords)) {
    for (const keyword of opKeywords) {
      if (intentLower.includes(keyword)) {
        return op;
      }
    }
  }

  // 함수명이 동작명과 정확히 일치하면 사용
  if (intentLower in keywords) {
    return intentLower;
  }

  // 기본값: 함수명 사용
  return fnName;
}

/**
 * 지시어 추론 (intent에서 최적화 힌트 찾기)
 *
 * "배열 합산" → "memory" (기본값)
 * "빠른 정렬" → "speed"
 * "메모리 효율적 필터링" → "memory"
 * "안전한 검사" → "safety"
 */
function inferDirective(intent: string): Directive {
  const intentLower = intent.toLowerCase();

  if (
    intentLower.includes('빠른') ||
    intentLower.includes('fast') ||
    intentLower.includes('speed') ||
    intentLower.includes('quick')
  ) {
    return 'speed';
  }

  if (
    intentLower.includes('메모리') ||
    intentLower.includes('효율') ||
    intentLower.includes('memory') ||
    intentLower.includes('efficient')
  ) {
    return 'memory';
  }

  if (
    intentLower.includes('안전') ||
    intentLower.includes('검사') ||
    intentLower.includes('safe') ||
    intentLower.includes('check')
  ) {
    return 'safety';
  }

  // 기본값: memory (효율성 우선)
  return 'memory';
}

/**
 * 복잡도 추론
 */
function inferComplexity(intent: string): string {
  const intentLower = intent.toLowerCase();

  if (
    intentLower.includes('정렬') ||
    intentLower.includes('sort') ||
    intentLower.includes('merge')
  ) {
    return 'O(n log n)';
  }

  if (
    intentLower.includes('순회') ||
    intentLower.includes('반복') ||
    intentLower.includes('loop') ||
    intentLower.includes('iterate')
  ) {
    return 'O(n)';
  }

  if (
    intentLower.includes('이진') ||
    intentLower.includes('찾기') ||
    intentLower.includes('binary') ||
    intentLower.includes('search')
  ) {
    return 'O(log n)';
  }

  // 기본값
  return 'O(n)';
}

/**
 * Phase 5: Intent에서 타입 추론
 *
 * 타입이 생략된 경우 intent 문자열에서 타입을 추론합니다.
 * 예:
 *   - "배열 합산" + "input" → "array<number>"
 *   - "배열 합산" + "output" → "number"
 *   - "배열 문자열 필터" + "input" → "array<string>"
 *   - "배열 문자열 필터" + "output" → "array<string>"
 */
function inferTypeFromIntent(intent: string, position: 'input' | 'output'): string {
  const intentLower = (intent || '').toLowerCase();

  // 타입 힌트 키워드 매핑
  const isArrayOperation = (kw: string) =>
    intentLower.includes(kw) &&
    (intentLower.includes('배열') || intentLower.includes('array'));

  const isStringType = () =>
    intentLower.includes('문자열') ||
    intentLower.includes('string') ||
    intentLower.includes('text') ||
    intentLower.includes('str');

  const isNumberType = () =>
    intentLower.includes('숫자') ||
    intentLower.includes('number') ||
    intentLower.includes('num') ||
    intentLower.includes('count');

  // 연산 타입 검사
  const isSumLike = () =>
    intentLower.includes('합산') ||
    intentLower.includes('합') ||
    intentLower.includes('sum') ||
    intentLower.includes('add') ||
    intentLower.includes('total');

  const isAverageLike = () =>
    intentLower.includes('평균') ||
    intentLower.includes('average') ||
    intentLower.includes('avg') ||
    intentLower.includes('mean');

  const isMaxMinLike = () =>
    (intentLower.includes('최대') || intentLower.includes('max')) ||
    (intentLower.includes('최소') || intentLower.includes('min'));

  const isSortLike = () =>
    intentLower.includes('정렬') ||
    intentLower.includes('sort') ||
    intentLower.includes('reverse') ||
    intentLower.includes('역순');

  const isFilterLike = () =>
    intentLower.includes('필터') ||
    intentLower.includes('filter') ||
    intentLower.includes('where') ||
    intentLower.includes('검사') ||
    intentLower.includes('조건');

  const isMapLike = () =>
    intentLower.includes('변환') ||
    intentLower.includes('map') ||
    intentLower.includes('transform');

  const isCountLike = () =>
    intentLower.includes('개수') ||
    intentLower.includes('count') ||
    intentLower.includes('length');

  const isFlattenLike = () =>
    intentLower.includes('평탄화') ||
    intentLower.includes('flatten') ||
    intentLower.includes('merge');

  const isUniqueLike = () =>
    intentLower.includes('유일') ||
    intentLower.includes('unique') ||
    intentLower.includes('distinct');

  // Input 타입 추론
  if (position === 'input') {
    // 명시적 배열 언급이 없으면, 연산 특성으로 배열 여부 판단
    if (
      isSortLike() ||
      isFilterLike() ||
      isMapLike() ||
      isFlattenLike() ||
      isUniqueLike() ||
      isAverageLike() ||
      isSumLike() ||
      isMaxMinLike() ||
      isCountLike()
    ) {
      // 배열 연산이므로 input은 배열
      if (isStringType()) {
        return 'array<string>';
      }
      return 'array<number>'; // 기본값: 숫자 배열
    }

    // 일반적인 경우
    if (isStringType()) {
      return 'string';
    }
    if (isNumberType()) {
      return 'number';
    }

    // 기본값: 배열 (대부분의 연산이 배열을 받음)
    return 'array<number>';
  }

  // Output 타입 추론
  if (position === 'output') {
    // 단일 값을 반환하는 연산
    if (isSumLike() || isAverageLike() || isMaxMinLike() || isCountLike()) {
      return 'number';
    }

    // 배열을 반환하는 연산
    if (isSortLike() || isFilterLike() || isMapLike() || isFlattenLike() || isUniqueLike()) {
      if (isStringType()) {
        return 'array<string>';
      }
      return 'array<number>';
    }

    // find/search 같은 경우: 개별 원소를 반환
    if (intentLower.includes('찾기') || intentLower.includes('find') || intentLower.includes('search')) {
      if (isStringType()) {
        return 'string';
      }
      return 'number';
    }

    // 기본값: result (제네릭 타입)
    return 'result';
  }

  // 위치가 잘못된 경우
  return 'result';
}

/**
 * HeaderProposal을 인쇄 가능한 형식으로 변환 (디버깅)
 */
export function proposalToString(proposal: HeaderProposal): string {
  return `
Header: fn ${proposal.fn}: ${proposal.input} -> ${proposal.output}
Function: ${proposal.fn}
Input: ${proposal.input}
Output: ${proposal.output}
Reason: ${proposal.reason}
Directive: ${proposal.directive}
Complexity: ${proposal.complexity}
Confidence: ${proposal.confidence}%
Matched Op: ${proposal.matched_op}
  `.trim();
}
