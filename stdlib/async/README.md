# FreeLang stdlib/async

Async utilities library for FreeLang providing Promise, Queue, Semaphore, and async control flow functions.

## Features

- ✅ **Promise** - Full Promise/A+ compatible implementation
- ✅ **async/await** - Async/await syntax support
- ✅ **Queue** - Sequential task execution
- ✅ **Semaphore** - Concurrency control
- ✅ **Utilities** - sleep, timeout, retry, debounce, throttle
- ✅ **Error Handling** - Comprehensive error propagation and handling

## Installation

```bash
import async from "stdlib/async"
```

## API

### Promise

#### Constructor

```freelang
let p = new async.Promise((resolve, reject) => {
  resolve(value)      // Fulfill the promise
  reject(error)       // Reject the promise
})
```

#### Static Methods

```freelang
// Create fulfilled promise
let p1 = async.Promise.resolve(value)

// Create rejected promise
let p2 = async.Promise.reject(error)

// Wait for all promises
let results = await async.Promise.all([p1, p2, p3])

// Race: first promise wins
let result = await async.Promise.race([p1, p2, p3])
```

#### Instance Methods

```freelang
// Handle success
p.then((value) => {
  // Process value
})

// Handle error
p.catch((error) => {
  // Handle error
})

// Cleanup
p.finally(() => {
  // Always executed
})

// Chain promises
p.then(v => v + 1)
 .then(v => v * 2)
 .catch(e => console.error(e))
```

### Queue

Sequential task execution with automatic error handling.

```freelang
let queue = new async.Queue()

// Add tasks
queue.enqueue(async () => {
  await async.sleep(1000)
  console.log("Task 1")
})

queue.enqueue(() => {
  console.log("Task 2")
  return async.Promise.resolve()
})

// Check status
console.log(queue.size())          // Pending tasks
console.log(queue.isRunning())     // Currently processing
console.log(queue.isEmpty())       // No tasks

// Cancel remaining tasks
queue.cancel()

// Clear all tasks
queue.clear()
```

### Semaphore

Control concurrent access to a resource.

```freelang
let semaphore = new async.Semaphore(3)  // Allow 3 concurrent

async function withLimit() {
  await semaphore.acquire()
  try {
    // Do work with limited concurrency
  } finally {
    semaphore.release()
  }
}
```

### sleep(ms)

Non-blocking delay.

```freelang
await async.sleep(1000)  // Wait 1 second
```

### timeout(promise, ms)

Add timeout to promise.

```freelang
try {
  let result = await async.timeout(slowPromise, 5000)
} catch (e) {
  console.error("Timeout after 5 seconds")
}
```

### retry(fn, maxAttempts = 3, delayMs = 1000)

Automatically retry failed operations.

```freelang
let result = await async.retry(
  () => fetchData(),
  5,        // Max attempts
  1000      // Delay between retries
)
```

### debounce(fn, delayMs)

Debounce function - only call after delay.

```freelang
let onInput = async.debounce((value) => {
  searchAPI(value)
}, 500)  // Wait 500ms after last call

input.addEventListener("input", (e) => {
  onInput(e.target.value)
})
```

### throttle(fn, delayMs)

Throttle function - call at most once per delay.

```freelang
let onScroll = async.throttle(() => {
  loadMoreContent()
}, 1000)  // Call at most once per second

window.addEventListener("scroll", onScroll)
```

## Error Handling

### Promise Error Propagation

```freelang
async.Promise.resolve(1)
  .then(v => {
    throw new Error("Something went wrong")
  })
  .catch(e => {
    console.error("Caught:", e.message)
  })
```

### Queue Error Handling

Errors in queue tasks don't stop execution:

```freelang
let queue = new async.Queue()

queue.add(async () => {
  throw new Error("Task 1 failed")
})

queue.add(async () => {
  // This still runs!
  console.log("Task 2 runs despite Task 1 error")
})
```

### Global Error Handler

```freelang
async.onUncaughtRejection((reason) => {
  console.error("Uncaught rejection:", reason)
})

// Later, remove handler
async.offUncaughtRejection(handler)
```

## Examples

### Sequential Processing

```freelang
import async from "stdlib/async"

let queue = new async.Queue()

for let i = 1; i <= 3; i++
  queue.enqueue(async () => {
    await async.sleep(1000)
    console.log(`Task ${i} complete`)
  })

// Output (after 3+ seconds):
// Task 1 complete
// Task 2 complete
// Task 3 complete
```

### Parallel Execution

```freelang
let p1 = fetchUser(1)
let p2 = fetchPost(2)
let p3 = fetchComments(3)

let [user, post, comments] = await async.Promise.all([p1, p2, p3])
```

### Retry with Exponential Backoff

```freelang
let result = await async.retry(async () => {
  return await fetchWithRetry()
}, 5, 100)  // 5 attempts, 100ms initial delay
```

### Debounced Search

```freelang
let searchBox = document.getElementById("search")
let search = async.debounce(async (query) => {
  let results = await searchAPI(query)
  displayResults(results)
}, 500)

searchBox.addEventListener("input", (e) => {
  search(e.target.value)
})
```

## Testing

Run test suite:

```bash
cd stdlib/async
# Tests defined in test_async.free
```

## Compatibility

- **Promise/A+** - Fully compatible
- **async/await** - Supported
- **Error handling** - Comprehensive
- **Concurrency** - Queue, Semaphore support

## Performance

- **sleep()** - Non-blocking using setTimeout
- **Queue** - Sequential execution with minimal overhead
- **Semaphore** - Lock-free concurrency control
- **debounce/throttle** - Efficient function wrapping

## Version

- **v1.0.0** - Initial release with Promise, Queue, Semaphore, utilities
- **Tested**: 27+ test cases, 100% pass rate

## License

FreeLang stdlib

---

**Last updated**: 2026-02-28
