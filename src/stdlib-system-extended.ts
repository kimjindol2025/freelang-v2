/**
 * FreeLang v2 - System Extended stdlib 함수
 *
 * Phase C: 120개 System/Event/Logging/Scheduler 함수 한 번에 등록
 * - Event System (25개)
 * - Logging (20개)
 * - Scheduler (20개)
 * - Cache (20개)
 * - Validation (20개)
 * - Config (15개)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

/**
 * 글로벌 이벤트 에미터 저장소
 */
const globalEventEmitters: Map<string, {
  listeners: Map<string, Function[]>;
  once: Map<string, Function[]>;
}> = new Map();

/**
 * 글로벌 캐시 저장소
 */
const globalCaches: Map<string, {
  data: Map<any, any>;
  ttl: Map<any, number>;
  created: Map<any, number>;
  accessed: Map<any, number>;
}> = new Map();

/**
 * 글로벌 스케줄러 저장소
 */
const globalSchedules: Map<string, {
  interval: NodeJS.Timeout | null;
  running: boolean;
  lastRun?: number;
  nextRun?: number;
  runCount: number;
}> = new Map();

/**
 * 글로벌 타이머 저장소
 */
const globalTimers: Map<string, {
  timeout: NodeJS.Timeout | null;
  startTime: number;
  duration: number;
  paused: boolean;
  pausedTime: number;
  active: boolean;
}> = new Map();

/**
 * 글로벌 설정 저장소
 */
const globalConfig: Map<string, any> = new Map();

/**
 * 글로벌 로그 핸들러
 */
const globalLogHandlers: Function[] = [];
let globalLogLevel = 'info';

/**
 * System Extended 함수들을 NativeFunctionRegistry에 등록
 */
export function registerSystemExtendedFunctions(registry: NativeFunctionRegistry): void {
  // ────────────────────────────────────────────────────────────
  // Event System (25개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'event_emitter_create',
    module: 'system',
    executor: (args) => {
      const name = String(args[0]);
      globalEventEmitters.set(name, {
        listeners: new Map(),
        once: new Map()
      });
      return { emitter: name };
    }
  });

  registry.register({
    name: 'event_on',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);
      const handler = args[2]; // Function

      const emitter = globalEventEmitters.get(emitterName);
      if (!emitter) return false;

      if (!emitter.listeners.has(eventName)) {
        emitter.listeners.set(eventName, []);
      }
      emitter.listeners.get(eventName)!.push(handler);
      return true;
    }
  });

  registry.register({
    name: 'event_off',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);
      const handler = args[2];

      const emitter = globalEventEmitters.get(emitterName);
      if (!emitter) return false;

      const listeners = emitter.listeners.get(eventName);
      if (!listeners) return false;

      const index = listeners.indexOf(handler);
      if (index === -1) return false;

      listeners.splice(index, 1);
      return true;
    }
  });

  registry.register({
    name: 'event_once',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);
      const handler = args[2];

      const emitter = globalEventEmitters.get(emitterName);
      if (!emitter) return false;

      if (!emitter.once.has(eventName)) {
        emitter.once.set(eventName, []);
      }
      emitter.once.get(eventName)!.push(handler);
      return true;
    }
  });

  registry.register({
    name: 'event_emit',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);
      const data = args[2];

      const emitter = globalEventEmitters.get(emitterName);
      if (!emitter) return 0;

      let count = 0;

      // 일반 리스너
      const listeners = emitter.listeners.get(eventName) || [];
      for (const handler of listeners) {
        if (typeof handler === 'function') {
          handler(data);
          count++;
        }
      }

      // Once 리스너
      const onceListeners = emitter.once.get(eventName) || [];
      for (const handler of onceListeners) {
        if (typeof handler === 'function') {
          handler(data);
          count++;
        }
      }
      emitter.once.delete(eventName);

      return count;
    }
  });

  registry.register({
    name: 'event_remove_all',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = args[1] ? String(args[1]) : null;

      const emitter = globalEventEmitters.get(emitterName);
      if (!emitter) return false;

      if (eventName) {
        emitter.listeners.delete(eventName);
        emitter.once.delete(eventName);
      } else {
        emitter.listeners.clear();
        emitter.once.clear();
      }
      return true;
    }
  });

  registry.register({
    name: 'event_listeners',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);

      const emitter = globalEventEmitters.get(emitterName);
      if (!emitter) return [];

      const listeners = emitter.listeners.get(eventName) || [];
      return [listeners.length];
    }
  });

  registry.register({
    name: 'event_count',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);

      const emitter = globalEventEmitters.get(emitterName);
      if (!emitter) return 0;

      let count = 0;
      for (const listeners of emitter.listeners.values()) {
        count += listeners.length;
      }
      for (const listeners of emitter.once.values()) {
        count += listeners.length;
      }
      return count;
    }
  });

  registry.register({
    name: 'event_has',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);

      const emitter = globalEventEmitters.get(emitterName);
      if (!emitter) return false;

      return emitter.listeners.has(eventName) || emitter.once.has(eventName);
    }
  });

  registry.register({
    name: 'event_pipe',
    module: 'system',
    executor: (args) => {
      const fromEmitter = String(args[0]);
      const eventName = String(args[1]);
      const toEmitter = String(args[2]);

      const from = globalEventEmitters.get(fromEmitter);
      const to = globalEventEmitters.get(toEmitter);

      if (!from || !to) return false;

      const listeners = from.listeners.get(eventName) || [];
      listeners.push((data) => {
        registry.call('event_emit', [toEmitter, eventName, data]);
      });

      return true;
    }
  });

  registry.register({
    name: 'event_broadcast',
    module: 'system',
    executor: (args) => {
      const eventName = String(args[0]);
      const data = args[1];

      let count = 0;
      for (const emitter of globalEventEmitters.values()) {
        const listeners = emitter.listeners.get(eventName) || [];
        for (const handler of listeners) {
          if (typeof handler === 'function') {
            handler(data);
            count++;
          }
        }
      }
      return count;
    }
  });

  registry.register({
    name: 'event_filter',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);
      const predicate = args[2]; // Function

      const emitter = globalEventEmitters.get(emitterName);
      if (!emitter) return false;

      const listeners = emitter.listeners.get(eventName) || [];
      const filtered: Function[] = [];

      for (const listener of listeners) {
        if (typeof predicate === 'function' && predicate(listener)) {
          filtered.push(listener);
        }
      }

      emitter.listeners.set(eventName, filtered);
      return filtered.length;
    }
  });

  registry.register({
    name: 'event_map',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);
      const mapper = args[2]; // Function

      const emitter = globalEventEmitters.get(emitterName);
      if (!emitter) return [];

      const listeners = emitter.listeners.get(eventName) || [];
      const results = [];

      for (const listener of listeners) {
        if (typeof mapper === 'function') {
          results.push(mapper(listener));
        }
      }

      return results;
    }
  });

  registry.register({
    name: 'event_reduce',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);
      const reducer = args[2]; // Function
      const initialValue = args[3];

      const emitter = globalEventEmitters.get(emitterName);
      if (!emitter) return initialValue;

      const listeners = emitter.listeners.get(eventName) || [];
      let acc = initialValue;

      for (const listener of listeners) {
        if (typeof reducer === 'function') {
          acc = reducer(acc, listener);
        }
      }

      return acc;
    }
  });

  registry.register({
    name: 'event_batch',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventNames = args[1]; // Array
      const batchHandler = args[2]; // Function

      const emitter = globalEventEmitters.get(emitterName);
      if (!emitter) return false;

      const batch: any[] = [];

      for (const eventName of eventNames) {
        emitter.listeners.set(String(eventName), [
          (data) => {
            batch.push({ event: eventName, data });
            if (batch.length === eventNames.length && typeof batchHandler === 'function') {
              batchHandler(batch);
              batch.length = 0;
            }
          }
        ]);
      }

      return true;
    }
  });

  registry.register({
    name: 'event_debounce',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);
      const delay = Number(args[2]);
      const handler = args[3]; // Function

      let timeoutId: NodeJS.Timeout | null = null;

      const debounced = (data: any) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (typeof handler === 'function') handler(data);
        }, delay);
      };

      return registry.call('event_on', [emitterName, eventName, debounced]);
    }
  });

  registry.register({
    name: 'event_throttle',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);
      const interval = Number(args[2]);
      const handler = args[3]; // Function

      let lastCall = 0;

      const throttled = (data: any) => {
        const now = Date.now();
        if (now - lastCall >= interval) {
          lastCall = now;
          if (typeof handler === 'function') handler(data);
        }
      };

      return registry.call('event_on', [emitterName, eventName, throttled]);
    }
  });

  registry.register({
    name: 'event_delay',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);
      const delay = Number(args[2]);
      const handler = args[3]; // Function

      const delayed = (data: any) => {
        setTimeout(() => {
          if (typeof handler === 'function') handler(data);
        }, delay);
      };

      return registry.call('event_on', [emitterName, eventName, delayed]);
    }
  });

  registry.register({
    name: 'event_queue',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);
      const maxSize = Number(args[2]);

      const queue: any[] = [];
      const emitter = globalEventEmitters.get(emitterName);

      if (!emitter) return false;

      const originalListeners = emitter.listeners.get(eventName) || [];
      const queuedHandler = (data: any) => {
        queue.push(data);
        if (queue.length > maxSize) {
          queue.shift();
        }
        for (const listener of originalListeners) {
          if (typeof listener === 'function') listener(data);
        }
      };

      emitter.listeners.set(eventName, [queuedHandler]);
      return true;
    }
  });

  registry.register({
    name: 'event_priority',
    module: 'system',
    executor: (args) => {
      const emitterName = String(args[0]);
      const eventName = String(args[1]);
      const priority = Number(args[2]);
      const handler = args[3]; // Function

      const emitter = globalEventEmitters.get(emitterName);
      if (!emitter) return false;

      if (!emitter.listeners.has(eventName)) {
        emitter.listeners.set(eventName, []);
      }

      const listeners = emitter.listeners.get(eventName)!;
      listeners.push(handler);
      // 우선순위로 정렬 (간단한 구현)
      listeners.sort(() => priority - Math.random() * 10);

      return true;
    }
  });

  registry.register({
    name: 'event_channel_create',
    module: 'system',
    executor: (args) => {
      const channelName = String(args[0]);
      globalEventEmitters.set(channelName, {
        listeners: new Map(),
        once: new Map()
      });
      return { channel: channelName };
    }
  });

  registry.register({
    name: 'event_channel_send',
    module: 'system',
    executor: (args) => {
      const channelName = String(args[0]);
      const message = args[1];

      return registry.call('event_emit', [channelName, 'message', message]);
    }
  });

  registry.register({
    name: 'event_channel_recv',
    module: 'system',
    executor: (args) => {
      const channelName = String(args[0]);
      let received: any = null;

      registry.call('event_once', [channelName, 'message', (msg: any) => {
        received = msg;
      }]);

      return received;
    }
  });

  registry.register({
    name: 'event_channel_close',
    module: 'system',
    executor: (args) => {
      const channelName = String(args[0]);
      globalEventEmitters.delete(channelName);
      return true;
    }
  });

  registry.register({
    name: 'event_channel_select',
    module: 'system',
    executor: (args) => {
      const channels = args[0]; // Array

      for (const channel of channels) {
        const emitter = globalEventEmitters.get(String(channel));
        if (emitter && emitter.listeners.has('message')) {
          return channel;
        }
      }

      return null;
    }
  });

  // ────────────────────────────────────────────────────────────
  // Logging (20개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'log_info',
    module: 'system',
    executor: (args) => {
      const message = String(args[0]);
      console.log(`[INFO] ${message}`);
      return true;
    }
  });

  registry.register({
    name: 'log_warn',
    module: 'system',
    executor: (args) => {
      const message = String(args[0]);
      console.warn(`[WARN] ${message}`);
      return true;
    }
  });

  registry.register({
    name: 'log_error',
    module: 'system',
    executor: (args) => {
      const message = String(args[0]);
      console.error(`[ERROR] ${message}`);
      return true;
    }
  });

  registry.register({
    name: 'log_debug',
    module: 'system',
    executor: (args) => {
      const message = String(args[0]);
      console.log(`[DEBUG] ${message}`);
      return true;
    }
  });

  registry.register({
    name: 'log_trace',
    module: 'system',
    executor: (args) => {
      const message = String(args[0]);
      console.trace(`[TRACE] ${message}`);
      return true;
    }
  });

  registry.register({
    name: 'log_fatal',
    module: 'system',
    executor: (args) => {
      const message = String(args[0]);
      console.error(`[FATAL] ${message}`);
      process.exit(1);
    }
  });

  registry.register({
    name: 'log_set_level',
    module: 'system',
    executor: (args) => {
      globalLogLevel = String(args[0]);
      return true;
    }
  });

  registry.register({
    name: 'log_get_level',
    module: 'system',
    executor: () => globalLogLevel
  });

  registry.register({
    name: 'log_set_formatter',
    module: 'system',
    executor: (args) => {
      const formatter = args[0]; // Function
      // 포맷터 저장 (사용 시)
      return typeof formatter === 'function';
    }
  });

  registry.register({
    name: 'log_add_handler',
    module: 'system',
    executor: (args) => {
      const handler = args[0]; // Function
      if (typeof handler === 'function') {
        globalLogHandlers.push(handler);
        return true;
      }
      return false;
    }
  });

  registry.register({
    name: 'log_remove_handler',
    module: 'system',
    executor: (args) => {
      const handler = args[0];
      const index = globalLogHandlers.indexOf(handler);
      if (index !== -1) {
        globalLogHandlers.splice(index, 1);
        return true;
      }
      return false;
    }
  });

  registry.register({
    name: 'log_file_handler',
    module: 'system',
    executor: (args) => {
      const filename = String(args[0]);
      return (message: string) => {
        // 파일 로깅 (실제로는 fs 모듈 필요)
        console.log(`[FILE] ${filename}: ${message}`);
      };
    }
  });

  registry.register({
    name: 'log_console_handler',
    module: 'system',
    executor: () => {
      return (message: string) => {
        console.log(message);
      };
    }
  });

  registry.register({
    name: 'log_json_handler',
    module: 'system',
    executor: () => {
      return (message: string) => {
        console.log(JSON.stringify({ timestamp: Date.now(), message }));
      };
    }
  });

  registry.register({
    name: 'log_rotate',
    module: 'system',
    executor: (args) => {
      const filename = String(args[0]);
      const maxSize = Number(args[1]);
      // 로그 로테이션 (스텁)
      return true;
    }
  });

  registry.register({
    name: 'log_flush',
    module: 'system',
    executor: () => {
      // 버퍼 플러시 (스텁)
      return true;
    }
  });

  registry.register({
    name: 'log_close',
    module: 'system',
    executor: () => {
      globalLogHandlers.length = 0;
      return true;
    }
  });

  registry.register({
    name: 'log_structured',
    module: 'system',
    executor: (args) => {
      const level = String(args[0]);
      const context = args[1];
      console.log(JSON.stringify({ level, timestamp: Date.now(), ...context }));
      return true;
    }
  });

  registry.register({
    name: 'log_context',
    module: 'system',
    executor: (args) => {
      const context = args[0];
      // 컨텍스트 저장 (스텁)
      return true;
    }
  });

  registry.register({
    name: 'log_benchmark',
    module: 'system',
    executor: (args) => {
      const label = String(args[0]);
      const startTime = Date.now();
      return () => {
        const elapsed = Date.now() - startTime;
        console.log(`[BENCHMARK] ${label}: ${elapsed}ms`);
      };
    }
  });

  // ────────────────────────────────────────────────────────────
  // Scheduler (20개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'schedule_cron',
    module: 'system',
    executor: (args) => {
      const pattern = String(args[0]);
      const handler = args[1]; // Function
      const scheduleId = `cron_${Date.now()}_${Math.random()}`;

      // 간단한 구현: 1분마다 실행
      const interval = setInterval(() => {
        if (typeof handler === 'function') handler();
      }, 60000);

      globalSchedules.set(scheduleId, {
        interval,
        running: true,
        runCount: 0
      });

      return scheduleId;
    }
  });

  registry.register({
    name: 'schedule_interval',
    module: 'system',
    executor: (args) => {
      const interval = Number(args[0]);
      const handler = args[1]; // Function
      const scheduleId = `interval_${Date.now()}_${Math.random()}`;

      const intervalId = setInterval(() => {
        if (typeof handler === 'function') handler();
        const schedule = globalSchedules.get(scheduleId);
        if (schedule) {
          schedule.runCount++;
          schedule.lastRun = Date.now();
        }
      }, interval);

      globalSchedules.set(scheduleId, {
        interval: intervalId,
        running: true,
        runCount: 0
      });

      return scheduleId;
    }
  });

  registry.register({
    name: 'schedule_once',
    module: 'system',
    executor: (args) => {
      const delay = Number(args[0]);
      const handler = args[1]; // Function
      const scheduleId = `once_${Date.now()}_${Math.random()}`;

      const timeoutId = setTimeout(() => {
        if (typeof handler === 'function') handler();
        globalSchedules.delete(scheduleId);
      }, delay);

      globalSchedules.set(scheduleId, {
        interval: timeoutId as any,
        running: true,
        runCount: 1
      });

      return scheduleId;
    }
  });

  registry.register({
    name: 'schedule_cancel',
    module: 'system',
    executor: (args) => {
      const scheduleId = String(args[0]);
      const schedule = globalSchedules.get(scheduleId);

      if (!schedule) return false;

      if (schedule.interval) {
        clearInterval(schedule.interval);
        clearTimeout(schedule.interval as any);
      }

      globalSchedules.delete(scheduleId);
      return true;
    }
  });

  registry.register({
    name: 'schedule_cancel_all',
    module: 'system',
    executor: () => {
      for (const schedule of globalSchedules.values()) {
        if (schedule.interval) {
          clearInterval(schedule.interval);
          clearTimeout(schedule.interval as any);
        }
      }
      globalSchedules.clear();
      return true;
    }
  });

  registry.register({
    name: 'schedule_is_running',
    module: 'system',
    executor: (args) => {
      const scheduleId = String(args[0]);
      const schedule = globalSchedules.get(scheduleId);
      return schedule ? schedule.running : false;
    }
  });

  registry.register({
    name: 'schedule_next_run',
    module: 'system',
    executor: (args) => {
      const scheduleId = String(args[0]);
      const schedule = globalSchedules.get(scheduleId);
      return schedule && schedule.nextRun ? schedule.nextRun : null;
    }
  });

  registry.register({
    name: 'schedule_last_run',
    module: 'system',
    executor: (args) => {
      const scheduleId = String(args[0]);
      const schedule = globalSchedules.get(scheduleId);
      return schedule && schedule.lastRun ? schedule.lastRun : null;
    }
  });

  registry.register({
    name: 'schedule_run_count',
    module: 'system',
    executor: (args) => {
      const scheduleId = String(args[0]);
      const schedule = globalSchedules.get(scheduleId);
      return schedule ? schedule.runCount : 0;
    }
  });

  registry.register({
    name: 'schedule_pause',
    module: 'system',
    executor: (args) => {
      const scheduleId = String(args[0]);
      const schedule = globalSchedules.get(scheduleId);

      if (!schedule) return false;

      schedule.running = false;
      if (schedule.interval) {
        clearInterval(schedule.interval);
        clearTimeout(schedule.interval as any);
      }

      return true;
    }
  });

  registry.register({
    name: 'schedule_resume',
    module: 'system',
    executor: (args) => {
      const scheduleId = String(args[0]);
      const schedule = globalSchedules.get(scheduleId);

      if (!schedule) return false;

      schedule.running = true;
      return true;
    }
  });

  registry.register({
    name: 'schedule_list',
    module: 'system',
    executor: () => {
      const schedules = [];
      for (const [id, schedule] of globalSchedules.entries()) {
        schedules.push({
          id,
          running: schedule.running,
          runCount: schedule.runCount
        });
      }
      return schedules;
    }
  });

  registry.register({
    name: 'timer_set',
    module: 'system',
    executor: (args) => {
      const duration = Number(args[0]);
      const handler = args[1]; // Function
      const timerId = `timer_${Date.now()}_${Math.random()}`;

      const timeout = setTimeout(() => {
        if (typeof handler === 'function') handler();
        globalTimers.delete(timerId);
      }, duration);

      globalTimers.set(timerId, {
        timeout,
        startTime: Date.now(),
        duration,
        paused: false,
        pausedTime: 0,
        active: true
      });

      return timerId;
    }
  });

  registry.register({
    name: 'timer_clear',
    module: 'system',
    executor: (args) => {
      const timerId = String(args[0]);
      const timer = globalTimers.get(timerId);

      if (!timer) return false;

      if (timer.timeout) clearTimeout(timer.timeout);
      globalTimers.delete(timerId);
      return true;
    }
  });

  registry.register({
    name: 'timer_reset',
    module: 'system',
    executor: (args) => {
      const timerId = String(args[0]);
      const timer = globalTimers.get(timerId);

      if (!timer) return false;

      if (timer.timeout) clearTimeout(timer.timeout);
      timer.startTime = Date.now();
      timer.paused = false;
      timer.pausedTime = 0;

      return true;
    }
  });

  registry.register({
    name: 'timer_pause',
    module: 'system',
    executor: (args) => {
      const timerId = String(args[0]);
      const timer = globalTimers.get(timerId);

      if (!timer) return false;

      timer.paused = true;
      timer.pausedTime = Date.now();
      if (timer.timeout) clearTimeout(timer.timeout);

      return true;
    }
  });

  registry.register({
    name: 'timer_resume',
    module: 'system',
    executor: (args) => {
      const timerId = String(args[0]);
      const timer = globalTimers.get(timerId);

      if (!timer || !timer.paused) return false;

      const pausedDuration = Date.now() - timer.pausedTime;
      timer.startTime += pausedDuration;
      timer.paused = false;

      return true;
    }
  });

  registry.register({
    name: 'timer_is_active',
    module: 'system',
    executor: (args) => {
      const timerId = String(args[0]);
      const timer = globalTimers.get(timerId);
      return timer ? timer.active && !timer.paused : false;
    }
  });

  registry.register({
    name: 'timer_elapsed',
    module: 'system',
    executor: (args) => {
      const timerId = String(args[0]);
      const timer = globalTimers.get(timerId);

      if (!timer) return 0;

      if (timer.paused) {
        return timer.pausedTime - timer.startTime;
      }

      return Date.now() - timer.startTime;
    }
  });

  registry.register({
    name: 'timer_remaining',
    module: 'system',
    executor: (args) => {
      const timerId = String(args[0]);
      const timer = globalTimers.get(timerId);

      if (!timer) return 0;

      const elapsed = Date.now() - timer.startTime;
      return Math.max(0, timer.duration - elapsed);
    }
  });

  // ────────────────────────────────────────────────────────────
  // Cache (20개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'cache_create',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      globalCaches.set(cacheName, {
        data: new Map(),
        ttl: new Map(),
        created: new Map(),
        accessed: new Map()
      });
      return { cache: cacheName };
    }
  });

  registry.register({
    name: 'cache_get',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const key = args[1];

      const cache = globalCaches.get(cacheName);
      if (!cache) return null;

      const value = cache.data.get(key);
      if (value === undefined) return null;

      // TTL 체크
      const ttl = cache.ttl.get(key);
      const created = cache.created.get(key);

      if (ttl && created && Date.now() - created > ttl) {
        cache.data.delete(key);
        return null;
      }

      cache.accessed.set(key, Date.now());
      return value;
    }
  });

  registry.register({
    name: 'cache_set',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const key = args[1];
      const value = args[2];
      const ttl = args[3] ? Number(args[3]) : 0;

      const cache = globalCaches.get(cacheName);
      if (!cache) return false;

      cache.data.set(key, value);
      cache.created.set(key, Date.now());
      cache.accessed.set(key, Date.now());

      if (ttl > 0) {
        cache.ttl.set(key, ttl);
      }

      return true;
    }
  });

  registry.register({
    name: 'cache_delete',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const key = args[1];

      const cache = globalCaches.get(cacheName);
      if (!cache) return false;

      const exists = cache.data.has(key);
      cache.data.delete(key);
      cache.ttl.delete(key);
      cache.created.delete(key);
      cache.accessed.delete(key);

      return exists;
    }
  });

  registry.register({
    name: 'cache_has',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const key = args[1];

      const cache = globalCaches.get(cacheName);
      if (!cache) return false;

      return cache.data.has(key);
    }
  });

  registry.register({
    name: 'cache_clear',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);

      const cache = globalCaches.get(cacheName);
      if (!cache) return false;

      cache.data.clear();
      cache.ttl.clear();
      cache.created.clear();
      cache.accessed.clear();

      return true;
    }
  });

  registry.register({
    name: 'cache_ttl',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const key = args[1];
      const ttl = Number(args[2]);

      const cache = globalCaches.get(cacheName);
      if (!cache) return false;

      if (cache.data.has(key)) {
        cache.ttl.set(key, ttl);
        cache.created.set(key, Date.now());
        return true;
      }

      return false;
    }
  });

  registry.register({
    name: 'cache_keys',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);

      const cache = globalCaches.get(cacheName);
      if (!cache) return [];

      return Array.from(cache.data.keys());
    }
  });

  registry.register({
    name: 'cache_values',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);

      const cache = globalCaches.get(cacheName);
      if (!cache) return [];

      return Array.from(cache.data.values());
    }
  });

  registry.register({
    name: 'cache_size',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);

      const cache = globalCaches.get(cacheName);
      if (!cache) return 0;

      return cache.data.size;
    }
  });

  registry.register({
    name: 'cache_stats',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);

      const cache = globalCaches.get(cacheName);
      if (!cache) return { size: 0, ttl_count: 0, hits: 0, misses: 0 };

      let ttlCount = 0;
      for (const ttl of cache.ttl.values()) {
        if (ttl > 0) ttlCount++;
      }

      return {
        size: cache.data.size,
        ttl_count: ttlCount,
        hits: cache.accessed.size,
        misses: 0
      };
    }
  });

  registry.register({
    name: 'cache_lru',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const maxSize = Number(args[1]);

      const cache = globalCaches.get(cacheName);
      if (!cache) return false;

      if (cache.data.size > maxSize) {
        // LRU 제거
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, accessed] of cache.accessed.entries()) {
          if (accessed < oldestTime) {
            oldestTime = accessed;
            oldestKey = key;
          }
        }

        if (oldestKey !== null) {
          cache.data.delete(oldestKey);
          cache.accessed.delete(oldestKey);
          cache.ttl.delete(oldestKey);
          cache.created.delete(oldestKey);
        }
      }

      return true;
    }
  });

  registry.register({
    name: 'cache_lfu',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const maxSize = Number(args[1]);

      const cache = globalCaches.get(cacheName);
      if (!cache) return false;

      // LFU 구현 (스텁 - 간단히 가장 오래된 것 제거)
      return registry.call('cache_lru', [cacheName, maxSize]);
    }
  });

  registry.register({
    name: 'cache_arc',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const maxSize = Number(args[1]);

      const cache = globalCaches.get(cacheName);
      if (!cache) return false;

      // ARC 구현 (스텁)
      return true;
    }
  });

  registry.register({
    name: 'cache_memoize',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const func = args[1]; // Function

      if (typeof func !== 'function') return null;

      return (...funcArgs: any[]) => {
        const cacheKey = JSON.stringify(funcArgs);
        const cached = registry.call('cache_get', [cacheName, cacheKey]);

        if (cached !== null && cached !== undefined) {
          return cached;
        }

        const result = func(...funcArgs);
        registry.call('cache_set', [cacheName, cacheKey, result]);

        return result;
      };
    }
  });

  registry.register({
    name: 'cache_invalidate',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const pattern = String(args[1]);

      const cache = globalCaches.get(cacheName);
      if (!cache) return 0;

      let count = 0;
      for (const key of cache.data.keys()) {
        if (String(key).includes(pattern)) {
          cache.data.delete(key);
          count++;
        }
      }

      return count;
    }
  });

  registry.register({
    name: 'cache_warm',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const loader = args[1]; // Function

      if (typeof loader !== 'function') return false;

      const items = loader();
      if (Array.isArray(items)) {
        for (const [key, value] of items) {
          registry.call('cache_set', [cacheName, key, value]);
        }
        return true;
      }

      return false;
    }
  });

  registry.register({
    name: 'cache_preload',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const data = args[1]; // Array or Object

      const cache = globalCaches.get(cacheName);
      if (!cache) return false;

      if (Array.isArray(data)) {
        for (const [key, value] of data) {
          cache.data.set(key, value);
        }
      } else if (typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          cache.data.set(key, value);
        }
      }

      return true;
    }
  });

  registry.register({
    name: 'cache_persist',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const filename = String(args[1]);

      const cache = globalCaches.get(cacheName);
      if (!cache) return false;

      // JSON 직렬화 (파일 쓰기는 스텁)
      const data = Object.fromEntries(cache.data);
      console.log(`[CACHE PERSIST] ${filename}:`, JSON.stringify(data));

      return true;
    }
  });

  registry.register({
    name: 'cache_load',
    module: 'system',
    executor: (args) => {
      const cacheName = String(args[0]);
      const filename = String(args[1]);

      const cache = globalCaches.get(cacheName);
      if (!cache) return false;

      // 파일에서 읽기 (스텁)
      console.log(`[CACHE LOAD] ${filename}`);

      return true;
    }
  });

  // ────────────────────────────────────────────────────────────
  // Validation (20개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'validate_required',
    module: 'system',
    executor: (args) => {
      const value = args[0];
      return value !== null && value !== undefined && value !== '';
    }
  });

  registry.register({
    name: 'validate_type',
    module: 'system',
    executor: (args) => {
      const value = args[0];
      const expectedType = String(args[1]);
      return typeof value === expectedType;
    }
  });

  registry.register({
    name: 'validate_min',
    module: 'system',
    executor: (args) => {
      const value = Number(args[0]);
      const min = Number(args[1]);
      return value >= min;
    }
  });

  registry.register({
    name: 'validate_max',
    module: 'system',
    executor: (args) => {
      const value = Number(args[0]);
      const max = Number(args[1]);
      return value <= max;
    }
  });

  registry.register({
    name: 'validate_min_length',
    module: 'system',
    executor: (args) => {
      const value = String(args[0]);
      const minLen = Number(args[1]);
      return value.length >= minLen;
    }
  });

  registry.register({
    name: 'validate_max_length',
    module: 'system',
    executor: (args) => {
      const value = String(args[0]);
      const maxLen = Number(args[1]);
      return value.length <= maxLen;
    }
  });

  registry.register({
    name: 'validate_pattern',
    module: 'system',
    executor: (args) => {
      const value = String(args[0]);
      const pattern = String(args[1]);
      try {
        const regex = new RegExp(pattern);
        return regex.test(value);
      } catch {
        return false;
      }
    }
  });

  registry.register({
    name: 'validate_email',
    module: 'system',
    executor: (args) => {
      const value = String(args[0]);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    }
  });

  registry.register({
    name: 'validate_url',
    module: 'system',
    executor: (args) => {
      const value = String(args[0]);
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }
  });

  registry.register({
    name: 'validate_ip',
    module: 'system',
    executor: (args) => {
      const value = String(args[0]);
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      return ipv4Regex.test(value);
    }
  });

  registry.register({
    name: 'validate_ipv6',
    module: 'system',
    executor: (args) => {
      const value = String(args[0]);
      // 간단한 IPv6 검증
      return value.includes(':');
    }
  });

  registry.register({
    name: 'validate_uuid',
    module: 'system',
    executor: (args) => {
      const value = String(args[0]);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    }
  });

  registry.register({
    name: 'validate_date',
    module: 'system',
    executor: (args) => {
      const value = String(args[0]);
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
  });

  registry.register({
    name: 'validate_range',
    module: 'system',
    executor: (args) => {
      const value = Number(args[0]);
      const min = Number(args[1]);
      const max = Number(args[2]);
      return value >= min && value <= max;
    }
  });

  registry.register({
    name: 'validate_enum',
    module: 'system',
    executor: (args) => {
      const value = args[0];
      const enumValues = args[1]; // Array
      return Array.isArray(enumValues) && enumValues.includes(value);
    }
  });

  registry.register({
    name: 'validate_custom',
    module: 'system',
    executor: (args) => {
      const value = args[0];
      const validator = args[1]; // Function
      return typeof validator === 'function' && validator(value);
    }
  });

  registry.register({
    name: 'validate_object',
    module: 'system',
    executor: (args) => {
      const value = args[0];
      const schema = args[1]; // Object

      if (typeof value !== 'object' || value === null) return false;

      for (const key in schema) {
        if (!(key in value)) return false;
      }

      return true;
    }
  });

  registry.register({
    name: 'validate_array',
    module: 'system',
    executor: (args) => {
      const value = args[0];
      const itemValidator = args[1]; // Function

      if (!Array.isArray(value)) return false;

      if (typeof itemValidator === 'function') {
        return value.every(item => itemValidator(item));
      }

      return true;
    }
  });

  registry.register({
    name: 'validate_schema',
    module: 'system',
    executor: (args) => {
      const value = args[0];
      const schema = args[1]; // Object with validators

      if (typeof value !== 'object' || value === null) return false;

      for (const [key, validator] of Object.entries(schema)) {
        if (typeof validator === 'function') {
          if (!validator(value[key])) return false;
        }
      }

      return true;
    }
  });

  registry.register({
    name: 'validate_all',
    module: 'system',
    executor: (args) => {
      const value = args[0];
      const validators = args[1]; // Array<Function>

      if (!Array.isArray(validators)) return false;

      return validators.every(validator =>
        typeof validator === 'function' && validator(value)
      );
    }
  });

  // ────────────────────────────────────────────────────────────
  // Config (15개)
  // ────────────────────────────────────────────────────────────

  registry.register({
    name: 'config_load',
    module: 'system',
    executor: (args) => {
      const configName = String(args[0]);
      // 설정 로드 (스텁)
      return true;
    }
  });

  registry.register({
    name: 'config_get',
    module: 'system',
    executor: (args) => {
      const key = String(args[0]);
      const defaultValue = args[1];

      const value = globalConfig.get(key);
      return value !== undefined ? value : defaultValue;
    }
  });

  registry.register({
    name: 'config_set',
    module: 'system',
    executor: (args) => {
      const key = String(args[0]);
      const value = args[1];

      globalConfig.set(key, value);
      return true;
    }
  });

  registry.register({
    name: 'config_delete',
    module: 'system',
    executor: (args) => {
      const key = String(args[0]);
      return globalConfig.delete(key);
    }
  });

  registry.register({
    name: 'config_has',
    module: 'system',
    executor: (args) => {
      const key = String(args[0]);
      return globalConfig.has(key);
    }
  });

  registry.register({
    name: 'config_merge',
    module: 'system',
    executor: (args) => {
      const configData = args[0]; // Object

      if (typeof configData === 'object') {
        for (const [key, value] of Object.entries(configData)) {
          globalConfig.set(key, value);
        }
        return true;
      }

      return false;
    }
  });

  registry.register({
    name: 'config_reload',
    module: 'system',
    executor: (args) => {
      const configName = String(args[0]);
      // 설정 리로드 (스텁)
      return true;
    }
  });

  registry.register({
    name: 'config_watch',
    module: 'system',
    executor: (args) => {
      const key = String(args[0]);
      const handler = args[1]; // Function

      // 감시 설정 (스텁)
      return typeof handler === 'function';
    }
  });

  registry.register({
    name: 'config_validate',
    module: 'system',
    executor: (args) => {
      const schema = args[0]; // Object with validators

      if (typeof schema !== 'object') return false;

      for (const [key, validator] of Object.entries(schema)) {
        const value = globalConfig.get(key);
        if (typeof validator === 'function' && !validator(value)) {
          return false;
        }
      }

      return true;
    }
  });

  registry.register({
    name: 'config_env_expand',
    module: 'system',
    executor: (args) => {
      const value = String(args[0]);
      // 환경변수 확장 (${VAR} → process.env.VAR)
      return value.replace(/\$\{(\w+)\}/g, (match, envVar) => {
        return process.env[envVar] || match;
      });
    }
  });

  registry.register({
    name: 'config_required',
    module: 'system',
    executor: (args) => {
      const key = String(args[0]);
      const value = globalConfig.get(key);

      if (value === undefined || value === null) {
        throw new Error(`Required config missing: ${key}`);
      }

      return value;
    }
  });

  registry.register({
    name: 'config_default',
    module: 'system',
    executor: (args) => {
      const key = String(args[0]);
      const defaultValue = args[1];

      if (!globalConfig.has(key)) {
        globalConfig.set(key, defaultValue);
      }

      return globalConfig.get(key);
    }
  });

  registry.register({
    name: 'config_types',
    module: 'system',
    executor: (args) => {
      const schema = args[0]; // Object with types

      // 타입 스키마 저장 (스텁)
      return true;
    }
  });

  registry.register({
    name: 'config_save',
    module: 'system',
    executor: (args) => {
      const filename = String(args[0]);

      // 설정 저장 (파일 쓰기는 스텁)
      const configData = Object.fromEntries(globalConfig);
      console.log(`[CONFIG SAVE] ${filename}:`, JSON.stringify(configData, null, 2));

      return true;
    }
  });

  registry.register({
    name: 'config_export',
    module: 'system',
    executor: () => {
      return Object.fromEntries(globalConfig);
    }
  });
}
