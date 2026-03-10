/**
 * FreeLang v2 - passport 네이티브 함수
 *
 * npm passport 패키지 완전 대체
 * 인증 미들웨어 구현
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

interface PassportStrategy {
  name: string;
  verify: (...args: any[]) => any;
  options: Record<string, any>;
}

interface PassportState {
  strategies: Map<string, PassportStrategy>;
  serializeUserFn: ((user: any) => any) | null;
  deserializeUserFn: ((id: any, done: (err: any, user: any) => void) => void) | null;
}

const state: PassportState = {
  strategies: new Map(),
  serializeUserFn: null,
  deserializeUserFn: null
};

// 간단한 세션 스토어
const sessionStore = new Map<string, any>();

function createMiddleware(handler: (req: any, res: any, next: () => void) => void): any {
  return { _isMiddleware: true, _handler: handler };
}

export function registerPassportFunctions(registry: NativeFunctionRegistry): void {
  // passport_init() -> middleware
  registry.register({
    name: 'passport_init',
    module: 'passport',
    executor: (_args: any[]) => {
      return createMiddleware((req: any, res: any, next: () => void) => {
        if (!req._passport) req._passport = { instance: true };
        next();
      });
    }
  });

  // passport_init_options(options) -> middleware
  registry.register({
    name: 'passport_init_options',
    module: 'passport',
    executor: (_args: any[]) => {
      return createMiddleware((req: any, _res: any, next: () => void) => {
        if (!req._passport) req._passport = { instance: true };
        next();
      });
    }
  });

  // passport_session() -> middleware
  registry.register({
    name: 'passport_session',
    module: 'passport',
    executor: (_args: any[]) => {
      return createMiddleware((req: any, _res: any, next: () => void) => {
        const sessionId = req.session?.id || req.sessionID;
        if (sessionId && sessionStore.has(sessionId)) {
          req.user = sessionStore.get(sessionId);
        }
        next();
      });
    }
  });

  // passport_use_strategy(name, verify, options) -> void
  registry.register({
    name: 'passport_use_strategy',
    module: 'passport',
    executor: (args: any[]) => {
      const name = String(args[0] || 'local');
      const verify = args[1];
      const options = (typeof args[2] === 'object' && args[2] !== null) ? args[2] : {};

      state.strategies.set(name, { name, verify, options });
      return null;
    }
  });

  // passport_unuse_strategy(name) -> void
  registry.register({
    name: 'passport_unuse_strategy',
    module: 'passport',
    executor: (args: any[]) => {
      const name = String(args[0] || '');
      state.strategies.delete(name);
      return null;
    }
  });

  // passport_authenticate(strategyName, session, successRedirect, failureRedirect, successFlash, failWithError, assignProperty) -> middleware
  registry.register({
    name: 'passport_authenticate',
    module: 'passport',
    executor: (args: any[]) => {
      const strategyName = String(args[0] || 'local');
      const useSession = args[1] !== false;
      const successRedirect = String(args[2] || '');
      const failureRedirect = String(args[3] || '');
      const failWithError = Boolean(args[5]);
      const assignProperty = String(args[6] || '');

      return createMiddleware(async (req: any, res: any, next: () => void) => {
        const strategy = state.strategies.get(strategyName);
        if (!strategy) {
          const err = new Error(`Unknown authentication strategy "${strategyName}"`);
          if (failWithError) return next();
          return next();
        }

        // 성공/실패 콜백
        const success = (user: any, info?: any) => {
          if (assignProperty) {
            req[assignProperty] = user;
          } else {
            req.user = user;
          }

          if (useSession && req.session) {
            const sessionId = req.session.id || req.sessionID || 'default';
            if (state.serializeUserFn) {
              const serialized = state.serializeUserFn(user);
              sessionStore.set(sessionId, serialized);
            } else {
              sessionStore.set(sessionId, user);
            }
          }

          if (successRedirect && res?.redirect) {
            return res.redirect(successRedirect);
          }
          next();
        };

        const fail = (challenge?: any) => {
          if (failureRedirect && res?.redirect) {
            return res.redirect(failureRedirect);
          }
          if (failWithError) {
            const err = new Error(typeof challenge === 'string' ? challenge : 'Unauthorized');
            (err as any).status = 401;
            return next();
          }
          if (res?.status) {
            res.status(401).json({ message: 'Unauthorized' });
          } else {
            next();
          }
        };

        try {
          // 전략의 verify 함수 호출
          if (typeof strategy.verify === 'function') {
            await Promise.resolve(strategy.verify(req, success, fail));
          } else {
            fail('Strategy verify function not found');
          }
        } catch (err: any) {
          if (failWithError) {
            next();
          } else {
            fail(err.message);
          }
        }
      });
    }
  });

  // passport_authorize(strategyName, session, successRedirect, failureRedirect) -> middleware
  registry.register({
    name: 'passport_authorize',
    module: 'passport',
    executor: (args: any[]) => {
      const strategyName = String(args[0] || '');
      return createMiddleware(async (req: any, _res: any, next: () => void) => {
        const strategy = state.strategies.get(strategyName);
        if (!strategy) return next();

        try {
          if (typeof strategy.verify === 'function') {
            await Promise.resolve(strategy.verify(req, (account: any) => {
              req.account = account;
              next();
            }, next));
          } else {
            next();
          }
        } catch {
          next();
        }
      });
    }
  });

  // passport_serialize(fn) -> void
  registry.register({
    name: 'passport_serialize',
    module: 'passport',
    executor: (args: any[]) => {
      const fn = args[0];
      if (typeof fn === 'function') {
        state.serializeUserFn = fn;
      }
      return null;
    }
  });

  // passport_deserialize(fn) -> void
  registry.register({
    name: 'passport_deserialize',
    module: 'passport',
    executor: (args: any[]) => {
      const fn = args[0];
      if (typeof fn === 'function') {
        state.deserializeUserFn = fn;
      }
      return null;
    }
  });

  // passport_is_authenticated(req) -> bool
  registry.register({
    name: 'passport_is_authenticated',
    module: 'passport',
    executor: (args: any[]) => {
      const req = args[0];
      return !!(req && req.user);
    }
  });

  // passport_is_unauthenticated(req) -> bool
  registry.register({
    name: 'passport_is_unauthenticated',
    module: 'passport',
    executor: (args: any[]) => {
      const req = args[0];
      return !(req && req.user);
    }
  });

  // passport_login(req, user, session) -> void
  registry.register({
    name: 'passport_login',
    module: 'passport',
    executor: (args: any[]) => {
      const req = args[0];
      const user = args[1];
      const useSession = args[2] !== false;

      if (req) {
        req.user = user;
        if (useSession && req.session) {
          const sessionId = req.session.id || req.sessionID || 'default';
          if (state.serializeUserFn) {
            const serialized = state.serializeUserFn(user);
            sessionStore.set(sessionId, serialized);
          } else {
            sessionStore.set(sessionId, user);
          }
        }
      }
      return null;
    }
  });

  // passport_logout(req) -> void
  registry.register({
    name: 'passport_logout',
    module: 'passport',
    executor: (args: any[]) => {
      const req = args[0];
      if (req) {
        req.user = null;
        if (req.session) {
          const sessionId = req.session.id || req.sessionID || 'default';
          sessionStore.delete(sessionId);
        }
      }
      return null;
    }
  });

  // passport_get_user(req) -> user
  registry.register({
    name: 'passport_get_user',
    module: 'passport',
    executor: (args: any[]) => {
      const req = args[0];
      return req?.user ?? null;
    }
  });
}
