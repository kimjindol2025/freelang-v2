const { ProgramRunner } = require('./dist/cli/runner');

const code = `
fn testSort(arr) {
  println("In testSort")
  let sorted = arr.sort()
  println("Sorted in func")
  return sorted
}

let arr = [3, 1, 2]
let result = testSort(arr)
println("Result: " + str(result))
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('Success:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
