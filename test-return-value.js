const { ProgramRunner } = require('./dist/cli/runner');

const code = `
fn add(a, b) {
  let result = a + b
  return result
}

let x = add(3, 4)
println("x = " + str(x))
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('Success:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
