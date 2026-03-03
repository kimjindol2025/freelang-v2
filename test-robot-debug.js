const { ProgramRunner } = require('./dist/cli/runner');

const code = `
fn filterDistance(measurements) {
  if measurements.length == 0 {
    return 0.0
  }
  let sorted = measurements.sort()
  let mid = sorted.length / 2
  return sorted[mid]
}

let data = [10.0, 11.0, 12.0, 13.0, 14.0]
let result = filterDistance(data)
println("Result type: " + typeof result)
println("Result: " + str(result))
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('\nProgram result:');
console.log('Success:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
