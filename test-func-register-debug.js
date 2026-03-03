const { ProgramRunner } = require('./dist/cli/runner');

const code = 'fn test() { let x = 5; println(x); return x } test()';
const runner = new ProgramRunner();

console.log('Registering functions...');
console.log('Registry exists:', runner.getRegistry() ? 'yes' : 'no');

// Manually run the registration part of runString
const { Lexer, TokenBuffer } = require('./dist/lexer/lexer');
const { Parser } = require('./dist/parser/parser');

const lexer = new Lexer(code);
const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
const parser = new Parser(tokenBuffer);
const ast = parser.parseModule();

console.log('AST statements:', ast.statements.length);
ast.statements.forEach((stmt, idx) => {
  console.log(`  [${idx}] type: ${stmt.type}${stmt.name ? ` name: ${stmt.name}` : ''}`);
  if (stmt.type === 'function') {
    const fn = stmt;
    runner.getRegistry().register({
      type: 'FunctionDefinition',
      name: fn.name,
      params: fn.params?.map(p => p.name) || [],
      body: fn.body
    });
    console.log(`    → Registered function: ${fn.name}`);
  }
});

console.log('\nRegistry contains:', runner.getRegistry().exists('test') ? 'test function found' : 'test function NOT found');
