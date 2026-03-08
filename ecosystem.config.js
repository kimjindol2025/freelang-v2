/**
 * PM2 Ecosystem Configuration - FreeLang v2.6.0
 * Production deployment configuration
 */

module.exports = {
  apps: [{
    name: 'freelang-v2',
    script: 'dist/cli/index.js',
    cwd: '/home/kimjin/Desktop/kim/v2-freelang-ai',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: '35600',
      VERSION: '2.6.0',
      LEVEL: '3',
      COMPLETENESS: '95%'
    },
    
    // Instance Configuration
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    ignore_watch: ['node_modules', 'dist'],
    
    // Memory Management
    max_memory_restart: '512M',
    
    // Logging
    output: '/home/kimjin/.pm2/logs/freelang-v2-out.log',
    error: '/home/kimjin/.pm2/logs/freelang-v2-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Restart Policy
    max_restarts: 10,
    min_uptime: '60s',
    
    // Health Check
    listen_timeout: 3000,
    kill_timeout: 5000,
    
    // Additional
    merge_logs: true,
    combine_logs: true
  }],
  
  // Deploy Configuration
  deploy: {
    production: {
      user: 'kimjin',
      host: '192.168.45.73',
      ref: 'origin/master',
      repo: 'https://gogs.dclub.kr/kim/v2-freelang-ai.git',
      path: '/home/kimjin/apps/freelang-v2',
      'post-deploy': 'npm install && npm run build && pm2 startOrRestart ecosystem.config.js --env production'
    }
  }
};
