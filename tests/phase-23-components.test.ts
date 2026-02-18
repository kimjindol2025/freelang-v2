/**
 * Phase 23: Cloud-Native Patterns - Component Tests
 * Tests for API Gateway, Deployment, Configuration, and Service Mesh
 */

import {
  APIGateway,
  RateLimiter,
  RequestInterceptor,
  Route,
  RateLimitConfig,
  GatewayRequest,
} from '../src/phase-23/api-gateway/api-gateway';
import {
  RollingDeployment,
  BlueGreenDeployment,
  CanaryDeployment,
  DeploymentManager,
  DeploymentConfig,
  Replica,
} from '../src/phase-23/deployment/deployment-patterns';
import {
  ConfigMap,
  SecretsManager,
  ConfigurationManager,
} from '../src/phase-23/config/configuration-management';
import {
  VirtualService,
  DestinationRule,
  ServiceMesh,
  TrafficPolicy,
} from '../src/phase-23/mesh/service-mesh';

describe('Phase 23: Cloud-Native Patterns', () => {
  describe('API Gateway - RateLimiter', () => {
    test('FIXED_WINDOW strategy limits requests', () => {
      const config: RateLimitConfig = {
        strategy: 'FIXED_WINDOW',
        max_requests: 5,
        window_ms: 1000,
      };
      const limiter = new RateLimiter(config);

      const client = 'client-1';

      // First 5 requests should pass
      expect(limiter.checkLimit(client)).toBe(true);
      expect(limiter.checkLimit(client)).toBe(true);
      expect(limiter.checkLimit(client)).toBe(true);
      expect(limiter.checkLimit(client)).toBe(true);
      expect(limiter.checkLimit(client)).toBe(true);

      // 6th request should fail
      expect(limiter.checkLimit(client)).toBe(false);

      limiter.stop();
    });

    test('TOKEN_BUCKET strategy refills tokens', () => {
      const config: RateLimitConfig = {
        strategy: 'TOKEN_BUCKET',
        max_requests: 3,
        window_ms: 1000,
      };
      const limiter = new RateLimiter(config);

      const client = 'client-2';

      // Consume all tokens
      expect(limiter.checkLimit(client)).toBe(true);
      expect(limiter.checkLimit(client)).toBe(true);
      expect(limiter.checkLimit(client)).toBe(true);
      expect(limiter.checkLimit(client)).toBe(false);

      const stats = limiter.getStats(client);
      expect(stats?.tokens_remaining).toBe(0);

      limiter.stop();
    });

    test('Per-client rate limiting', () => {
      const config: RateLimitConfig = {
        strategy: 'FIXED_WINDOW',
        max_requests: 2,
        window_ms: 1000,
        per_client: true,
      };
      const limiter = new RateLimiter(config);

      // Client 1: 2 requests
      expect(limiter.checkLimit('client-1')).toBe(true);
      expect(limiter.checkLimit('client-1')).toBe(true);
      expect(limiter.checkLimit('client-1')).toBe(false);

      // Client 2: independent limit
      expect(limiter.checkLimit('client-2')).toBe(true);
      expect(limiter.checkLimit('client-2')).toBe(true);
      expect(limiter.checkLimit('client-2')).toBe(false);

      limiter.stop();
    });
  });

  describe('API Gateway - RequestInterceptor', () => {
    test('NONE auth type allows all requests', () => {
      const interceptor = new RequestInterceptor('NONE');

      const request: GatewayRequest = {
        method: 'GET',
        path: '/api/data',
        headers: {},
      };

      expect(interceptor.intercept(request)).toBe(true);
    });

    test('API_KEY auth requires x-api-key header', () => {
      const interceptor = new RequestInterceptor('API_KEY');

      const without_key: GatewayRequest = {
        method: 'GET',
        path: '/api/data',
        headers: {},
      };
      expect(interceptor.intercept(without_key)).toBe(false);

      const with_key: GatewayRequest = {
        method: 'GET',
        path: '/api/data',
        headers: { 'x-api-key': 'secret-key' },
      };
      expect(interceptor.intercept(with_key)).toBe(true);
    });
  });

  describe('API Gateway - Gateway', () => {
    test('Routes requests to matching service', async () => {
      const gateway = new APIGateway();

      const route: Route = {
        path: '/users',
        pattern: /^\/users/,
        methods: ['GET', 'POST'],
        service: 'user-service',
        auth: 'NONE',
      };

      gateway.registerRoute(route);

      const request: GatewayRequest = {
        method: 'GET',
        path: '/users/123',
        headers: {},
      };

      const response = await gateway.handleRequest(request);
      expect(response.status).toBe(200);
      expect(response.body?.service).toBe('user-service');
    });

    test('Returns 404 for unmatched routes', async () => {
      const gateway = new APIGateway();

      const request: GatewayRequest = {
        method: 'GET',
        path: '/unknown',
        headers: {},
      };

      const response = await gateway.handleRequest(request);
      expect(response.status).toBe(404);
    });

    test('Enforces rate limiting', async () => {
      const gateway = new APIGateway();

      const route: Route = {
        path: '/limited',
        pattern: /^\/limited/,
        methods: ['GET'],
        service: 'limited-service',
        rate_limit: {
          strategy: 'FIXED_WINDOW',
          max_requests: 2,
          window_ms: 1000,
        },
      };

      gateway.registerRoute(route);

      const request: GatewayRequest = {
        method: 'GET',
        path: '/limited',
        headers: {},
        client_id: 'test-client',
      };

      // First 2 requests succeed
      expect((await gateway.handleRequest(request)).status).toBe(200);
      expect((await gateway.handleRequest(request)).status).toBe(200);

      // 3rd request is rate limited
      expect((await gateway.handleRequest(request)).status).toBe(429);
    });

    test('Collects gateway statistics', async () => {
      const gateway = new APIGateway();

      const route: Route = {
        path: '/stats',
        pattern: /^\/stats/,
        methods: ['GET'],
        service: 'stats-service',
      };

      gateway.registerRoute(route);

      const request: GatewayRequest = {
        method: 'GET',
        path: '/stats',
        headers: {},
      };

      await gateway.handleRequest(request);

      const stats = gateway.getStats();
      expect(stats.total_requests).toBe(1);
      expect(stats.total_errors).toBe(0);
      expect(stats.error_rate).toBe(0);
    });
  });

  describe('Deployment - RollingDeployment', () => {
    test('Rolls out new replicas gradually', async () => {
      const config: DeploymentConfig = {
        strategy: 'ROLLING',
        replicas: 3,
        max_surge: 1,
        termination_grace_period_ms: 100,
      };

      const deployment = new RollingDeployment('test-app', config);

      const old_replicas: Replica[] = [
        { id: 'old-1', version: 'v1', status: 'RUNNING', healthy: true, started_at: 0, ready_count: 1 },
        { id: 'old-2', version: 'v1', status: 'RUNNING', healthy: true, started_at: 0, ready_count: 1 },
        { id: 'old-3', version: 'v1', status: 'RUNNING', healthy: true, started_at: 0, ready_count: 1 },
      ];

      const result = await deployment.start('v1', 'v2', old_replicas);

      expect(result.status).toBe('SUCCESS');
      expect(result.progress).toBe(100);
      expect(result.new_version).toBe('v2');
    });
  });

  describe('Deployment - BlueGreenDeployment', () => {
    test('Switches traffic between environments', async () => {
      const config: DeploymentConfig = {
        strategy: 'BLUE_GREEN',
        replicas: 2,
      };

      const deployment = new BlueGreenDeployment('test-app', config);

      const old_replicas: Replica[] = [
        { id: 'blue-1', version: 'v1', status: 'RUNNING', healthy: true, started_at: 0, ready_count: 1 },
        { id: 'blue-2', version: 'v1', status: 'RUNNING', healthy: true, started_at: 0, ready_count: 1 },
      ];

      const result = await deployment.start('v1', 'v2', old_replicas);

      expect(result.status).toBe('SUCCESS');
      expect(result.new_replicas.length).toBe(2);

      const active_color = deployment.getActiveColor();
      expect(active_color).toMatch(/BLUE|GREEN/);
    });

    test('Can rollback quickly', async () => {
      const config: DeploymentConfig = {
        strategy: 'BLUE_GREEN',
        replicas: 2,
      };

      const deployment = new BlueGreenDeployment('test-app', config);

      const old_replicas: Replica[] = [
        { id: 'blue-1', version: 'v1', status: 'RUNNING', healthy: true, started_at: 0, ready_count: 1 },
      ];

      await deployment.start('v1', 'v2', old_replicas);
      const color_before = deployment.getActiveColor();

      await deployment.rollback();
      const color_after = deployment.getActiveColor();

      expect(color_before).not.toBe(color_after);
    });
  });

  describe('Deployment - CanaryDeployment', () => {
    test('Gradually shifts traffic to new version', async () => {
      const config: DeploymentConfig = {
        strategy: 'CANARY',
        replicas: 4,
      };

      const deployment = new CanaryDeployment('test-app', config);

      const old_replicas: Replica[] = [
        { id: 'old-1', version: 'v1', status: 'RUNNING', healthy: true, started_at: 0, ready_count: 1 },
        { id: 'old-2', version: 'v1', status: 'RUNNING', healthy: true, started_at: 0, ready_count: 1 },
      ];

      const result = await deployment.start('v1', 'v2', old_replicas);

      expect(result.status).toBe('SUCCESS');
      expect(deployment.getTrafficWeight()).toBe(100);
    });
  });

  describe('Configuration - ConfigMap', () => {
    test('Stores and retrieves configuration', () => {
      const config_map = new ConfigMap('app-config', 'production');

      config_map.set('database.host', 'localhost');
      config_map.set('database.port', 5432);

      expect(config_map.get('database.host')).toBe('localhost');
      expect(config_map.get('database.port')).toBe(5432);
    });

    test('Detects configuration changes', () => {
      const config_map = new ConfigMap('app-config');
      const changes: any[] = [];

      config_map.watch((change) => {
        changes.push(change);
      });

      config_map.set('key1', 'value1');
      config_map.set('key1', 'value2'); // Change

      expect(changes.length).toBe(2);
      expect(changes[1][0]?.value).toBe('value2');
    });

    test('Creates configuration snapshots', () => {
      const config_map = new ConfigMap('app-config');

      config_map.set('key1', 'value1');
      config_map.set('key2', 'value2');

      const snapshot = config_map.snapshot();

      expect(snapshot.entries.length).toBe(2);
      expect(snapshot.hash).toBeDefined();
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Configuration - SecretsManager', () => {
    test('Stores and retrieves secrets', () => {
      const secrets = new SecretsManager('app-secrets');

      secrets.set('database.password', 'secret123');
      secrets.set('api.key', 'key-abc', 'OPAQUE');

      expect(secrets.get('database.password')).toBe('secret123');
      expect(secrets.has('api.key')).toBe(true);
    });

    test('Validates secret types', () => {
      const secrets = new SecretsManager('app-secrets');

      secrets.set('tls.cert', 'cert-data', 'TLS');

      expect(secrets.getWithType('tls.cert', 'TLS')).toBe('cert-data');

      expect(() => {
        secrets.getWithType('tls.cert', 'OPAQUE');
      }).toThrow();
    });

    test('Rotates secrets', () => {
      const secrets = new SecretsManager('app-secrets');
      const changes: any[] = [];

      secrets.set('password', 'old-password');
      secrets.watch((change) => {
        changes.push(change);
      });

      secrets.rotate('password', 'new-password');

      expect(secrets.get('password')).toBe('new-password');
      expect(changes.length).toBe(1);
    });
  });

  describe('Configuration - ConfigurationManager', () => {
    test('Manages multiple environments', () => {
      const config_mgr = new ConfigurationManager('production');

      const prod_config = config_mgr.createConfigMap('app-config', 'prod');
      prod_config.set('log_level', 'ERROR');

      expect(config_mgr.getEnvironment()).toBe('production');

      config_mgr.setEnvironment('development');
      expect(config_mgr.getEnvironment()).toBe('development');
    });

    test('Applies environment overrides', () => {
      const config_mgr = new ConfigurationManager('production');
      const config = config_mgr.createConfigMap('app-config');

      config.set('timeout_ms', 5000);
      config.set('timeout_ms__development', 10000);

      const prod_value = config_mgr.get('timeout_ms', config);
      expect(prod_value).toBe(5000);

      config_mgr.setEnvironment('development');
      const dev_value = config_mgr.get('timeout_ms', config);
      expect(dev_value).toBe(10000);
    });

    test('Validates configuration schema', () => {
      const config_mgr = new ConfigurationManager();
      const config = config_mgr.createConfigMap('app-config');

      config.set('port', 8080);
      config.set('host', 'localhost');

      const schema = {
        port: { required: true, type: 'number' },
        host: { required: true, type: 'string' },
      };

      expect(config_mgr.validate(schema, config)).toBe(true);
    });

    test('Imports and exports configuration', () => {
      const config_mgr = new ConfigurationManager();

      const data = {
        debug: true,
        timeout: 3000,
        retries: 5,
      };

      config_mgr.import(data, 'imported-config');

      const exported = config_mgr.export();
      expect(exported.debug).toBe(true);
      expect(exported.timeout).toBe(3000);
    });
  });

  describe('Service Mesh - VirtualService', () => {
    test('Routes traffic to destinations', () => {
      const vs = new VirtualService('user-service');

      vs.addHost('user-api-v1', 8080, 'HTTP', 90);
      vs.addHost('user-api-v2', 8081, 'HTTP', 10);
      vs.addRoute('user-api-v1', 90);
      vs.addRoute('user-api-v2', 10);

      const destination = vs.selectDestination('/api/users');
      expect(destination).toBeDefined();
      expect(destination?.port).toMatch(/8080|8081/);
    });
  });

  describe('Service Mesh - DestinationRule', () => {
    test('Configures load balancing', () => {
      const rule = new DestinationRule('user-lb', 'user-service');

      rule.setLoadBalancingStrategy('LEAST_REQUEST');

      expect(rule.getLoadBalancingStrategy()).toBe('LEAST_REQUEST');
    });
  });

  describe('Service Mesh - ServiceMesh', () => {
    test('Registers virtual services and rules', () => {
      const mesh = new ServiceMesh();

      const vs = new VirtualService('auth-service');
      vs.addHost('auth-api', 8000, 'HTTPS');

      mesh.registerVirtualService(vs, 'auth-service');

      const stats = mesh.getStats();
      expect(stats.virtual_services).toBe(1);
    });

    test('Enforces traffic policies', () => {
      const mesh = new ServiceMesh();

      const allow_policy: TrafficPolicy = {
        source_service: 'frontend',
        destination_service: 'backend',
        policy: 'ALLOW',
        protocols: ['HTTP', 'HTTPS'],
      };

      mesh.addTrafficPolicy(allow_policy);

      const authorized = mesh.authorizeRequest('frontend', 'backend', 'GET', '/api/data');
      expect(authorized).toBe(true);

      const unauthorized = mesh.authorizeRequest('unknown', 'backend', 'GET', '/api/data');
      expect(unauthorized).toBe(true); // Default allow
    });

    test('Enables mTLS', () => {
      const mesh = new ServiceMesh();

      mesh.enableMTLS('STRICT');

      const stats = mesh.getStats();
      expect(stats.mtls_enabled).toBe(true);
      expect(stats.mtls_mode).toBe('STRICT');
    });

    test('Watches mesh events', (done) => {
      const mesh = new ServiceMesh();
      const events: any[] = [];

      mesh.watch((event) => {
        events.push(event);
        if (events.length === 1) {
          expect(events[0].type).toBe('VIRTUAL_SERVICE_REGISTERED');
          done();
        }
      });

      const vs = new VirtualService('test');
      mesh.registerVirtualService(vs, 'test');
    });
  });

  describe('Integration Tests', () => {
    test('API Gateway + Configuration', async () => {
      const gateway = new APIGateway();
      const config_mgr = new ConfigurationManager();
      const config = config_mgr.createConfigMap('gateway-config');

      config.set('rate_limit.enabled', true);
      config.set('rate_limit.requests', 100);

      const route: Route = {
        path: '/api',
        pattern: /^\/api/,
        methods: ['GET', 'POST'],
        service: 'api-service',
        rate_limit: {
          strategy: 'FIXED_WINDOW',
          max_requests: 100,
          window_ms: 60000,
        },
      };

      gateway.registerRoute(route);

      const request: GatewayRequest = {
        method: 'GET',
        path: '/api/health',
        headers: {},
      };

      const response = await gateway.handleRequest(request);
      expect(response.status).toBe(200);
    });

    test('Deployment + Service Mesh', async () => {
      const deploy_mgr = new DeploymentManager();
      const mesh = new ServiceMesh();

      const deploy_config: DeploymentConfig = {
        strategy: 'CANARY',
        replicas: 3,
      };

      const old_replicas: Replica[] = [
        { id: 'pod-1', version: 'v1', status: 'RUNNING', healthy: true, started_at: 0, ready_count: 1 },
      ];

      const deployment = await deploy_mgr.deploy('myapp', 'v1', 'v2', deploy_config, old_replicas);

      expect(deployment.status).toBe('SUCCESS');

      const vs = new VirtualService('myapp');
      vs.addHost('myapp-v2', 8080);
      mesh.registerVirtualService(vs, 'myapp');

      const routed = mesh.routeRequest('client', 'myapp', 'GET', '/api');
      expect(routed).toBeDefined();
    });
  });
});
