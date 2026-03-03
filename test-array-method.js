const { ProgramRunner } = require('./dist/cli/runner');

const code = `
let arr = [3, 1, 2]
println("Array created")
let sorted = arr.sort()
println("Sorted: " + str(sorted))
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('Success:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
