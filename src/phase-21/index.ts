/**
 * Phase 21: Runtime System Integration
 *
 * Exports all runtime system components
 */

export { RuntimeSystemBase, type RuntimeConfig, type RuntimeTarget, type GCStrategy, type MemoryStats, type ExceptionHandler, type LinkedSymbol } from './runtime-base/runtime-system-base';

export {
  NativeRuntime,
  JVMRuntime,
  WASMRuntime,
  BytecodeVMRuntime,
  LLVMRuntime,
  CustomRuntime,
  HybridRuntime,
  RuntimeFactory,
} from './runtimes/runtime-systems';

export { RuntimeSystemBase as default } from './runtime-base/runtime-system-base';
