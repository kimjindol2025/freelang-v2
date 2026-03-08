/**
 * FreeLang v2 - Integration Functions (Phase F)
 *
 * 외부 API 통합, 메시징 시스템, 이벤트 처리 (40개 함수)
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

export function registerIntegrationFunctions(registry: NativeFunctionRegistry): void {
  // ─────────────────────────────────────────────────────────────
  // Event Emitter/Listener (10 functions)
  // ─────────────────────────────────────────────────────────────

  const eventBus = {};

  registry.register({
    name: 'event_on',
    module: 'integration',
    executor: (args) => {
      const event = String(args[0]);
      const handler = args[1];
      if (typeof handler !== 'function') return false;

      if (!eventBus[event]) eventBus[event] = [];
      eventBus[event].push(handler);
      return true;
    }
  });

  registry.register({
    name: 'event_off',
    module: 'integration',
    executor: (args) => {
      const event = String(args[0]);
      const handler = args[1];
      if (!eventBus[event]) return false;

      const index = eventBus[event].indexOf(handler);
      if (index > -1) {
        eventBus[event].splice(index, 1);
        return true;
      }
      return false;
    }
  });

  registry.register({
    name: 'event_emit',
    module: 'integration',
    executor: (args) => {
      const event = String(args[0]);
      const data = args[1];
      if (!eventBus[event]) return 0;

      let count = 0;
      for (const handler of eventBus[event]) {
        try {
          if (typeof handler === 'function') {
            handler(data);
            count++;
          }
        } catch (e) {
          // Ignore errors in handlers
        }
      }
      return count;
    }
  });

  registry.register({
    name: 'event_once',
    module: 'integration',
    executor: (args) => {
      const event = String(args[0]);
      const handler = args[1];
      if (typeof handler !== 'function') return false;

      const wrapper = (data) => {
        handler(data);
        const index = eventBus[event].indexOf(wrapper);
        if (index > -1) eventBus[event].splice(index, 1);
      };

      if (!eventBus[event]) eventBus[event] = [];
      eventBus[event].push(wrapper);
      return true;
    }
  });

  registry.register({
    name: 'event_listeners',
    module: 'integration',
    executor: (args) => {
      const event = String(args[0]);
      return eventBus[event] ? eventBus[event].length : 0;
    }
  });

  registry.register({
    name: 'event_clear',
    module: 'integration',
    executor: (args) => {
      const event = String(args[0]);
      if (eventBus[event]) {
        eventBus[event] = [];
        return true;
      }
      return false;
    }
  });

  registry.register({
    name: 'event_list_all',
    module: 'integration',
    executor: (args) => {
      return Object.keys(eventBus);
    }
  });

  registry.register({
    name: 'event_pause',
    module: 'integration',
    executor: (args) => {
      const event = String(args[0]);
      if (!eventBus[event]) return false;
      eventBus[event]._paused = true;
      return true;
    }
  });

  registry.register({
    name: 'event_resume',
    module: 'integration',
    executor: (args) => {
      const event = String(args[0]);
      if (!eventBus[event]) return false;
      eventBus[event]._paused = false;
      return true;
    }
  });

  registry.register({
    name: 'event_namespace',
    module: 'integration',
    executor: (args) => {
      const namespace = String(args[0]);
      return {
        on: (event, handler) => {
          const fullEvent = `${namespace}:${event}`;
          if (!eventBus[fullEvent]) eventBus[fullEvent] = [];
          eventBus[fullEvent].push(handler);
        },
        emit: (event, data) => {
          const fullEvent = `${namespace}:${event}`;
          if (!eventBus[fullEvent]) return 0;
          let count = 0;
          for (const handler of eventBus[fullEvent]) {
            if (typeof handler === 'function') {
              handler(data);
              count++;
            }
          }
          return count;
        }
      };
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Queue/Pub-Sub System (10 functions)
  // ─────────────────────────────────────────────────────────────

  const queues = {};

  registry.register({
    name: 'queue_create',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      if (!queues[name]) {
        queues[name] = {
          items: [],
          subscribers: []
        };
        return true;
      }
      return false;
    }
  });

  registry.register({
    name: 'queue_push',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      const data = args[1];
      if (!queues[name]) queues[name] = { items: [], subscribers: [] };

      queues[name].items.push({
        data: data,
        timestamp: Date.now(),
        id: Math.random().toString(36)
      });

      // Notify subscribers
      for (const subscriber of queues[name].subscribers) {
        if (typeof subscriber === 'function') {
          subscriber(data);
        }
      }

      return queues[name].items.length;
    }
  });

  registry.register({
    name: 'queue_pop',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      if (!queues[name] || queues[name].items.length === 0) return null;
      return queues[name].items.shift().data;
    }
  });

  registry.register({
    name: 'queue_peek',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      if (!queues[name] || queues[name].items.length === 0) return null;
      return queues[name].items[0].data;
    }
  });

  registry.register({
    name: 'queue_size',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      return queues[name] ? queues[name].items.length : 0;
    }
  });

  registry.register({
    name: 'queue_clear',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      if (!queues[name]) return false;
      queues[name].items = [];
      return true;
    }
  });

  registry.register({
    name: 'queue_subscribe',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      const handler = args[1];
      if (typeof handler !== 'function') return false;
      if (!queues[name]) queues[name] = { items: [], subscribers: [] };

      queues[name].subscribers.push(handler);
      return queues[name].subscribers.length;
    }
  });

  registry.register({
    name: 'queue_unsubscribe',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      const handler = args[1];
      if (!queues[name]) return false;

      const index = queues[name].subscribers.indexOf(handler);
      if (index > -1) {
        queues[name].subscribers.splice(index, 1);
        return true;
      }
      return false;
    }
  });

  registry.register({
    name: 'queue_batch_pop',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      const size = Math.floor(Number(args[1]) || 10);
      if (!queues[name]) return [];

      const batch = [];
      for (let i = 0; i < size && queues[name].items.length > 0; i++) {
        batch.push(queues[name].items.shift().data);
      }
      return batch;
    }
  });

  registry.register({
    name: 'queue_get_all',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      if (!queues[name]) return [];
      return queues[name].items.map(item => item.data);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Cache System (8 functions)
  // ─────────────────────────────────────────────────────────────

  const caches = {};

  registry.register({
    name: 'cache_create',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      const ttl = Math.floor(Number(args[1]) || 3600000); // 1 hour default
      if (!caches[name]) {
        caches[name] = {
          data: {},
          ttl: ttl
        };
        return true;
      }
      return false;
    }
  });

  registry.register({
    name: 'cache_set',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      const key = String(args[1]);
      const value = args[2];
      const ttl = Math.floor(Number(args[3]) || (caches[name] ? caches[name].ttl : 3600000));

      if (!caches[name]) caches[name] = { data: {}, ttl: ttl };

      caches[name].data[key] = {
        value: value,
        expiresAt: Date.now() + ttl
      };
      return true;
    }
  });

  registry.register({
    name: 'cache_get',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      const key = String(args[1]);
      if (!caches[name] || !caches[name].data[key]) return null;

      const item = caches[name].data[key];
      if (Date.now() > item.expiresAt) {
        delete caches[name].data[key];
        return null;
      }
      return item.value;
    }
  });

  registry.register({
    name: 'cache_delete',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      const key = String(args[1]);
      if (!caches[name]) return false;

      if (key in caches[name].data) {
        delete caches[name].data[key];
        return true;
      }
      return false;
    }
  });

  registry.register({
    name: 'cache_clear',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      if (!caches[name]) return false;
      caches[name].data = {};
      return true;
    }
  });

  registry.register({
    name: 'cache_size',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      return caches[name] ? Object.keys(caches[name].data).length : 0;
    }
  });

  registry.register({
    name: 'cache_has',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      const key = String(args[1]);
      if (!caches[name] || !caches[name].data[key]) return false;

      const item = caches[name].data[key];
      if (Date.now() > item.expiresAt) {
        delete caches[name].data[key];
        return false;
      }
      return true;
    }
  });

  registry.register({
    name: 'cache_cleanup_expired',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      if (!caches[name]) return 0;

      let count = 0;
      const now = Date.now();
      for (const key in caches[name].data) {
        if (now > caches[name].data[key].expiresAt) {
          delete caches[name].data[key];
          count++;
        }
      }
      return count;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Rate Limiting & Throttling (6 functions)
  // ─────────────────────────────────────────────────────────────

  const rateLimiters = {};

  registry.register({
    name: 'rate_limit_create',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      const limit = Math.floor(Number(args[1]) || 100);
      const window = Math.floor(Number(args[2]) || 1000);

      if (!rateLimiters[name]) {
        rateLimiters[name] = {
          limit: limit,
          window: window,
          requests: []
        };
        return true;
      }
      return false;
    }
  });

  registry.register({
    name: 'rate_limit_check',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      const key = String(args[1] || 'default');
      if (!rateLimiters[name]) return true;

      const now = Date.now();
      const limiter = rateLimiters[name];

      // Clean old requests
      limiter.requests = limiter.requests.filter(req => now - req.timestamp < limiter.window);

      // Count requests for this key
      const requestsForKey = limiter.requests.filter(req => req.key === key);
      if (requestsForKey.length >= limiter.limit) {
        return false;
      }

      limiter.requests.push({ key: key, timestamp: now });
      return true;
    }
  });

  registry.register({
    name: 'rate_limit_reset',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      if (!rateLimiters[name]) return false;
      rateLimiters[name].requests = [];
      return true;
    }
  });

  registry.register({
    name: 'rate_limit_status',
    module: 'integration',
    executor: (args) => {
      const name = String(args[0]);
      const key = String(args[1] || 'default');
      if (!rateLimiters[name]) return { remaining: -1, resetAt: 0 };

      const now = Date.now();
      const limiter = rateLimiters[name];

      limiter.requests = limiter.requests.filter(req => now - req.timestamp < limiter.window);
      const requestsForKey = limiter.requests.filter(req => req.key === key);
      const remaining = Math.max(0, limiter.limit - requestsForKey.length);
      const resetAt = requestsForKey.length > 0 ? requestsForKey[0].timestamp + limiter.window : now;

      return { remaining: remaining, resetAt: resetAt };
    }
  });

  registry.register({
    name: 'throttle',
    module: 'integration',
    executor: (args) => {
      const handler = args[0];
      const delay = Math.floor(Number(args[1]) || 100);
      let lastCall = 0;

      return function throttled(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
          lastCall = now;
          return typeof handler === 'function' ? handler(...args) : null;
        }
        return null;
      };
    }
  });

  registry.register({
    name: 'debounce',
    module: 'integration',
    executor: (args) => {
      const handler = args[0];
      const delay = Math.floor(Number(args[1]) || 100);
      let timeout = null;

      return function debounced(...args) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          if (typeof handler === 'function') handler(...args);
          timeout = null;
        }, delay);
      };
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Webhook & Hook System (6 functions)
  // ─────────────────────────────────────────────────────────────

  const hooks = {};

  registry.register({
    name: 'hook_add',
    module: 'integration',
    executor: (args) => {
      const hookName = String(args[0]);
      const priority = Math.floor(Number(args[1]) || 10);
      const handler = args[2];

      if (typeof handler !== 'function') return false;
      if (!hooks[hookName]) hooks[hookName] = [];

      hooks[hookName].push({ handler: handler, priority: priority });
      hooks[hookName].sort((a, b) => b.priority - a.priority);
      return true;
    }
  });

  registry.register({
    name: 'hook_remove',
    module: 'integration',
    executor: (args) => {
      const hookName = String(args[0]);
      const handler = args[1];

      if (!hooks[hookName]) return false;
      const initialLength = hooks[hookName].length;
      hooks[hookName] = hooks[hookName].filter(h => h.handler !== handler);
      return hooks[hookName].length < initialLength;
    }
  });

  registry.register({
    name: 'hook_execute',
    module: 'integration',
    executor: (args) => {
      const hookName = String(args[0]);
      const data = args[1];

      if (!hooks[hookName]) return [];
      const results = [];

      for (const hook of hooks[hookName]) {
        try {
          const result = hook.handler(data);
          results.push(result);
        } catch (e) {
          // Ignore errors
        }
      }

      return results;
    }
  });

  registry.register({
    name: 'hook_list',
    module: 'integration',
    executor: (args) => {
      const hookName = String(args[0]);
      return hooks[hookName] ? hooks[hookName].length : 0;
    }
  });

  registry.register({
    name: 'webhook_register',
    module: 'integration',
    executor: (args) => {
      const event = String(args[0]);
      const url = String(args[1]);
      const handler = args[2];

      if (!hooks[event]) hooks[event] = [];
      hooks[event].push({
        handler: () => {
          // Simulate webhook POST
          if (typeof handler === 'function') {
            return handler({ url: url });
          }
        },
        priority: 10
      });
      return true;
    }
  });

  registry.register({
    name: 'webhook_trigger',
    module: 'integration',
    executor: (args) => {
      const event = String(args[0]);
      const payload = args[1];

      if (!hooks[event]) return 0;
      let count = 0;

      for (const hook of hooks[event]) {
        try {
          hook.handler(payload);
          count++;
        } catch (e) {
          // Ignore errors
        }
      }

      return count;
    }
  });
}
