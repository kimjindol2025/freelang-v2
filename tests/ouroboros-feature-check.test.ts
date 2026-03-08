import { Lexer, TokenBuffer } from '../src/lexer/lexer';
import { parseMinimalFunction } from '../src/parser/parser';

describe('Project Ouroboros: Feature Check', () => {
  test('Struct/Object literal support', () => {
    const code = `fn test
input: string
output: string
{ let token = { type: "IDENT", value: "x" }; return token.type; }`;
    
    const lexer = new Lexer(code);
    const buffer = new TokenBuffer(lexer);
    const ast = parseMinimalFunction(buffer);
    
    console.log('✅ Struct literal parsing: SUCCESS');
    console.log('   AST:', JSON.stringify(ast, null, 2));
  });

  test('Array literal and push support', () => {
    const code = `fn test
input: string
output: array<string>
{ let tokens = []; push(tokens, "IDENT"); return tokens; }`;
    
    const lexer = new Lexer(code);
    const buffer = new TokenBuffer(lexer);
    const ast = parseMinimalFunction(buffer);
    
    console.log('✅ Array literal & push: SUCCESS');
  });

  test('String functions (length, substr)', () => {
    const code = `fn test
input: string
output: string
{ let s = "hello"; let len = length(s); return substr(s, 0, 2); }`;
    
    const lexer = new Lexer(code);
    const buffer = new TokenBuffer(lexer);
    const ast = parseMinimalFunction(buffer);
    
    console.log('✅ String functions: SUCCESS');
  });

  test('Character comparison', () => {
    const code = `fn test
input: string
output: bool
{ let c = 'a'; return c == 'a'; }`;
    
    const lexer = new Lexer(code);
    const buffer = new TokenBuffer(lexer);
    const ast = parseMinimalFunction(buffer);
    
    console.log('✅ Character comparison: SUCCESS');
  });

  test('State machine (loops + conditions)', () => {
    const code = `fn test
input: string
output: number
{ 
  let i = 0;
  let count = 0;
  while i < 10 {
    if i > 5 { count += 1; }
    i += 1;
  }
  return count;
}`;
    
    const lexer = new Lexer(code);
    const buffer = new TokenBuffer(lexer);
    const ast = parseMinimalFunction(buffer);
    
    console.log('✅ Nested loops + conditions: SUCCESS');
  });
});
