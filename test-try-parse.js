const { Lexer } = require('./dist/src/script-runner/lexer');
const { Parser } = require('./dist/src/script-runner/parser');

const code = `try {
  println("try");
} catch (e) {
  println("catch");
}`;

const lexer = new Lexer(code);
const { tokens, errors: lexErrors } = lexer.tokenize();

if (lexErrors.length > 0) {
  console.error('Lexer errors:', lexErrors);
  process.exit(1);
}

const parser = new Parser(tokens);
const { program, errors } = parser.parse();

if (errors.length > 0) {
  console.error('Parse errors:', errors);
  process.exit(1);
}

console.log('✅ try-catch parsed successfully!');
console.log('AST:', JSON.stringify(program.stmts[0], null, 2));
