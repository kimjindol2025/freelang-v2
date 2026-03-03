const { ProgramRunner } = require('./dist/cli/runner');

const code = `
fn filterDistance(measurements) {
  println("In filterDistance, got " + str(measurements.length) + " items")
  if measurements.length == 0 {
    return 0.0
  }
  let sorted = measurements.sort()
  println("Sorted")
  let mid = sorted.length / 2
  println("Mid = " + str(mid))
  return sorted[mid]
}

let data = [10.0, 11.0, 12.0, 13.0, 14.0]
println("Calling filterDistance...")
let result = filterDistance(data)
println("Got result: " + str(result))
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('\nProgram result:');
console.log('Success:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
