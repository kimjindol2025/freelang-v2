# FreeLang Native Libraries - 통합 가이드

여러 @freelang/* 패키지를 함께 사용하는 풀스택 웹 애플리케이션 구축 가이드입니다.

## 📚 목차

1. [아키텍처 개요](#아키텍처-개요)
2. [설치 & 설정](#설치--설정)
3. [예제 프로젝트](#예제-프로젝트)
4. [실제 사용 사례](#실제-사용-사례)
5. [성능 최적화](#성능-최적화)
6. [보안 체크리스트](#보안-체크리스트)

## 아키텍처 개요

### 패키지 역할

```
┌─────────────────────────────────────┐
│     Client (Browser/Mobile)         │
└────────────┬────────────────────────┘
             │ HTTP/HTTPS
┌────────────▼────────────────────────┐
│   @freelang/security Middleware     │ ← CORS, CSP, Rate-limiting
├─────────────────────────────────────┤
│   @freelang/http Client             │ ← Outbound API calls
│   (internal microservices)          │
├─────────────────────────────────────┤
│   @freelang/auth                    │ ← JWT Token verify
│   @freelang/validator               │ ← Input validation
├─────────────────────────────────────┤
│   @freelang/orm                     │ ← Database queries
└─────────────────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   Database (PostgreSQL/MySQL)       │
└─────────────────────────────────────┘

Optional:
┌─────────────────────────────────────┐
│   @freelang/web-forge               │ ← SSG/SSR rendering
│   (static pages, email templates)   │
└─────────────────────────────────────┘
```

## 설치 & 설정

### npm 설치

```bash
npm install @freelang/auth \
            @freelang/validator \
            @freelang/security \
            @freelang/orm \
            @freelang/http \
            @freelang/web-forge
```

### 환경 설정

```bash
# .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=app_db
DB_USER=postgres
DB_PASSWORD=secure_password

AUTH_SECRET=your-very-secret-key-32-chars-minimum
AUTH_EXPIRY=3600

API_TIMEOUT=30000
API_MAX_RETRIES=3

CORS_ORIGINS=https://example.com,https://app.example.com
```

## 예제 프로젝트

### 프로젝트 구조

```
my-app/
├── src/
│   ├── middleware/
│   │   ├── auth.js          # @freelang/auth
│   │   ├── validate.js      # @freelang/validator
│   │   ├── security.js      # @freelang/security
│   │   └── errorHandler.js  # Global error handler
│   ├── services/
│   │   ├── userService.js   # Business logic + @freelang/orm
│   │   ├── apiClient.js     # @freelang/http
│   │   └── emailService.js  # @freelang/web-forge templates
│   ├── routes/
│   │   ├── auth.js          # Login, Register
│   │   ├── users.js         # User CRUD
│   │   └── profile.js       # Profile management
│   ├── templates/
│   │   ├── email-verify.html
│   │   ├── welcome.html
│   │   └── password-reset.html
│   └── app.js               # Main application
├── .env
├── package.json
└── README.md
```

### 1. 보안 미들웨어 설정

```javascript
// src/middleware/security.js
const {
  corsMiddleware,
  rateLimitMiddleware,
  securityHeadersMiddleware
} = require('@freelang/security');

const cors = corsMiddleware({
  allowedOrigins: process.env.CORS_ORIGINS.split(','),
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  maxAge: 3600
});

const rateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000,    // 15 minutes
  maxRequests: 100,
  keyGenerator: (req) => req.ip
});

const headers = securityHeadersMiddleware({
  contentSecurityPolicy: true,
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  }
});

module.exports = { cors, rateLimit, headers };
```

### 2. 인증 미들웨어

```javascript
// src/middleware/auth.js
const { tokenVerify, tokenSign } = require('@freelang/auth');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);
  const claims = tokenVerify(token, process.env.AUTH_SECRET);

  if (!claims) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = claims;
  next();
};

const generateToken = (userData) => {
  return tokenSign(
    {
      id: userData.id,
      email: userData.email,
      role: userData.role
    },
    process.env.AUTH_SECRET,
    parseInt(process.env.AUTH_EXPIRY)
  );
};

module.exports = { authMiddleware, generateToken };
```

### 3. 검증 스키마

```javascript
// src/middleware/validate.js
const { validateSchema } = require('@freelang/validator');

const userRegistrationSchema = {
  email: { type: 'email', required: true },
  password: { type: 'string', min: 8, max: 128 },
  username: { type: 'string', min: 3, max: 50 },
  age: { type: 'number', min: 18, max: 150 }
};

const loginSchema = {
  email: { type: 'email', required: true },
  password: { type: 'string', required: true }
};

const updateProfileSchema = {
  username: { type: 'string', min: 3, max: 50, required: false },
  bio: { type: 'string', max: 500, required: false },
  avatar_url: { type: 'url', required: false }
};

const validateRequest = (schema) => {
  return (req, res, next) => {
    const validation = validateSchema(schema, req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    req.validatedData = validation.data;
    next();
  };
};

module.exports = {
  userRegistrationSchema,
  loginSchema,
  updateProfileSchema,
  validateRequest
};
```

### 4. 데이터베이스 모델

```javascript
// src/services/userService.js
const { createConnection, defineModel, DataTypes } = require('@freelang/orm');

const db = createConnection({
  dialect: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const User = defineModel(db, 'user', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    notNull: true
  },
  username: {
    type: DataTypes.STRING,
    notNull: true
  },
  password: {
    type: DataTypes.STRING,
    notNull: true
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user'
  },
  profile: {
    type: DataTypes.JSON
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: () => new Date()
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: () => new Date()
  }
});

const createUser = async (userData) => {
  return await User.create({
    email: userData.email,
    username: userData.username,
    password: userData.password, // Should be hashed!
    role: 'user'
  });
};

const findUserByEmail = async (email) => {
  return await User.findOne({
    where: { email }
  });
};

const updateUser = async (id, updates) => {
  return await User.update(updates, {
    where: { id }
  });
};

module.exports = { db, User, createUser, findUserByEmail, updateUser };
```

### 5. API 클라이언트

```javascript
// src/services/apiClient.js
const { HttpClient } = require('@freelang/http');

const client = new HttpClient({
  baseURL: process.env.API_BASE_URL,
  timeout: parseInt(process.env.API_TIMEOUT),
  maxRetries: parseInt(process.env.API_MAX_RETRIES),
  pool: {
    maxSockets: 50,
    maxFreeSockets: 10
  }
});

const notificationService = {
  sendEmail: async (to, template, data) => {
    try {
      const response = await client.post('/notifications/email', {
        to,
        template,
        data
      });
      return response.data;
    } catch (error) {
      console.error('Email send failed:', error);
      throw error;
    }
  },

  sendSMS: async (phone, message) => {
    try {
      const response = await client.post('/notifications/sms', {
        phone,
        message
      });
      return response.data;
    } catch (error) {
      console.error('SMS send failed:', error);
      throw error;
    }
  }
};

module.exports = { client, notificationService };
```

### 6. 웹 렌더링 (이메일 템플릿)

```javascript
// src/services/emailService.js
const { createRenderer } = require('@freelang/web-forge');

const renderer = createRenderer({
  layoutsDir: './src/templates/layouts',
  componentsDir: './src/templates/components',
  cacheTemplates: true
});

const emailTemplates = {
  welcome: async (user) => {
    return await renderer.render('email/welcome.html', {
      username: user.username,
      email: user.email,
      confirmUrl: `https://app.example.com/verify?token=${user.verifyToken}`
    });
  },

  passwordReset: async (user, resetToken) => {
    return await renderer.render('email/password-reset.html', {
      username: user.username,
      resetUrl: `https://app.example.com/reset?token=${resetToken}`
    });
  },

  notification: async (user, content) => {
    return await renderer.render('email/notification.html', {
      username: user.username,
      content: content,
      unsubscribeUrl: `https://app.example.com/unsubscribe?id=${user.id}`
    });
  }
};

module.exports = { renderer, emailTemplates };
```

### 7. 라우트 예제 - 회원가입

```javascript
// src/routes/auth.js
const express = require('express');
const { validateRequest, userRegistrationSchema } = require('../middleware/validate');
const { generateToken } = require('../middleware/auth');
const { createUser, findUserByEmail } = require('../services/userService');
const { notificationService } = require('../services/apiClient');
const { emailTemplates } = require('../services/emailService');

const router = express.Router();

router.post(
  '/register',
  validateRequest(userRegistrationSchema),
  async (req, res) => {
    try {
      // ✅ 1. 이미 존재하는 이메일 확인 (@freelang/orm)
      const existingUser = await findUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // ✅ 2. 데이터 저장 (@freelang/orm)
      const user = await createUser(req.body);

      // ✅ 3. JWT 토큰 생성 (@freelang/auth)
      const token = generateToken(user);

      // ✅ 4. 이메일 템플릿 렌더링 (@freelang/web-forge)
      const verifyToken = generateToken({ id: user.id, type: 'email_verify' });
      const emailContent = await emailTemplates.welcome({
        ...user,
        verifyToken
      });

      // ✅ 5. 이메일 전송 (@freelang/http)
      await notificationService.sendEmail(
        user.email,
        'welcome',
        { html: emailContent }
      );

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: { id: user.id, email: user.email }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

module.exports = router;
```

### 8. 라우트 예제 - 로그인

```javascript
// src/routes/auth.js (continued)
const bcrypt = require('bcrypt');
const { loginSchema } = require('../middleware/validate');

router.post(
  '/login',
  validateRequest(loginSchema),
  async (req, res) => {
    try {
      // ✅ 1. 사용자 찾기 (@freelang/orm)
      const user = await findUserByEmail(req.body.email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // ✅ 2. 비밀번호 확인 (bcrypt)
      const passwordMatch = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // ✅ 3. 토큰 발급 (@freelang/auth)
      const token = generateToken(user);

      // ✅ 4. 로그인 기록 저장 (@freelang/orm)
      await Log.create({
        userId: user.id,
        action: 'login',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date()
      });

      res.json({
        token,
        user: { id: user.id, email: user.email, role: user.role }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

module.exports = router;
```

### 9. 메인 애플리케이션 설정

```javascript
// src/app.js
const express = require('express');
const { cors, rateLimit, headers } = require('./middleware/security');
const { authMiddleware } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profile');

const app = express();

// ✅ 보안 미들웨어 적용 (@freelang/security)
app.use(headers);
app.use(cors);
app.use(rateLimit);

// JSON body parser
app.use(express.json());

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Protected routes (인증 필수)
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
```

## 실제 사용 사례

### 사용 사례 1: 전자상거래 플랫폼

```javascript
// 상품 주문 처리 (모든 패키지 활용)

async function placeOrder(req, res) {
  try {
    // 1️⃣ 입력 검증 (@freelang/validator)
    const validation = validateSchema(orderSchema, req.body);
    if (!validation.isValid) {
      return res.status(400).json({ errors: validation.errors });
    }

    // 2️⃣ 인증 확인 (req.user는 authMiddleware에서 설정)
    const user = await findUserById(req.user.id);

    // 3️⃣ 데이터베이스 트랜잭션 (@freelang/orm)
    const transaction = await db.transaction();
    try {
      // 주문 생성
      const order = await Order.create({
        userId: user.id,
        items: req.body.items,
        totalPrice: req.body.totalPrice,
        status: 'pending'
      }, { transaction });

      // 재고 감소
      for (const item of req.body.items) {
        await Product.update(
          { stock: sequelize.literal('stock - ' + item.quantity) },
          { where: { id: item.productId }, transaction }
        );
      }

      await transaction.commit();

      // 4️⃣ 외부 결제 API 호출 (@freelang/http)
      const paymentResponse = await client.post('/payments/charge', {
        orderId: order.id,
        amount: order.totalPrice,
        customerId: user.id
      }, {
        maxRetries: 3,
        retryDelay: 1000
      });

      // 5️⃣ 주문 확인 이메일 (@freelang/web-forge + @freelang/http)
      const emailHtml = await emailTemplates.orderConfirmation({
        order,
        user,
        paymentStatus: paymentResponse.data.status
      });

      await notificationService.sendEmail(
        user.email,
        'order-confirmation',
        { html: emailHtml }
      );

      res.json({
        message: 'Order placed successfully',
        order: order,
        paymentStatus: paymentResponse.data.status
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: 'Order processing failed' });
  }
}
```

### 사용 사례 2: 실시간 알림 시스템

```javascript
// 사용자 활동 알림 (모든 패키지 조합)

async function notifyUserActivity(userId, activityType, activityData) {
  try {
    // 1️⃣ 사용자 설정 조회 (@freelang/orm)
    const user = await User.findByPk(userId);
    const notification_prefs = user.profile.notification_preferences;

    // 2️⃣ 알림 대상 검증 (@freelang/validator)
    if (!notification_prefs.enabled) return;

    // 3️⃣ 알림 메시지 렌더링 (@freelang/web-forge)
    const notificationHtml = await emailTemplates.notification(
      user,
      activityData
    );

    // 4️⃣ 여러 채널로 전송 (@freelang/http)
    const promises = [];

    if (notification_prefs.email) {
      promises.push(
        notificationService.sendEmail(user.email, 'activity-notification', {
          html: notificationHtml
        })
      );
    }

    if (notification_prefs.sms) {
      promises.push(
        notificationService.sendSMS(
          user.profile.phone,
          `New notification: ${activityData.title}`
        )
      );
    }

    // 5️⃣ 알림 기록 저장 (@freelang/orm)
    promises.push(
      Notification.create({
        userId,
        type: activityType,
        data: activityData,
        read: false,
        createdAt: new Date()
      })
    );

    await Promise.all(promises);
  } catch (error) {
    console.error('Notification failed:', error);
  }
}
```

## 성능 최적화

### 데이터베이스 쿼리 최적화

```javascript
// ❌ N+1 쿼리 문제
const users = await User.findAll();
for (const user of users) {
  const posts = await Post.findAll({ where: { userId: user.id } });
  // 쿼리 100번 실행!
}

// ✅ Eager loading 사용
const users = await User.findAll({
  include: [{
    model: Post,
    attributes: ['id', 'title', 'createdAt']
  }]
});
// 쿼리 1번!
```

### 연결 풀링 설정

```javascript
const db = createConnection({
  // ... 기본 설정
  pool: {
    maxSockets: 50,        // 최대 연결 수
    maxFreeSockets: 10,    // 유휴 연결 수
    timeout: 60000,        // 연결 타임아웃
    keepAliveTimeout: 30000 // Keep-alive
  }
});
```

### HTTP 클라이언트 캐싱

```javascript
const client = new HttpClient({
  baseURL: process.env.API_BASE_URL,
  caching: {
    ttl: 300,              // 5분
    key: 'api_response'
  }
});
```

### Rate limiting 미세조정

```javascript
// API 엔드포인트별로 다른 rate limit 설정

const publicRateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100
});

const strictRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 5           // 로그인: 매분 5회
});

app.post('/api/auth/login', strictRateLimit, loginHandler);
app.get('/api/public/posts', publicRateLimit, getPostsHandler);
```

## 보안 체크리스트

### 배포 전 확인사항

- [ ] **@freelang/auth**
  - [ ] AUTH_SECRET은 최소 32자 이상
  - [ ] 토큰 만료 시간은 적절하게 설정 (너무 길지 않게)
  - [ ] 비밀번호는 bcrypt로 해시 저장

- [ ] **@freelang/validator**
  - [ ] 모든 사용자 입력 검증
  - [ ] 파일 업로드 크기 제한
  - [ ] SQL injection 방지 (parametrized queries 사용)

- [ ] **@freelang/security**
  - [ ] CORS는 신뢰할 수 있는 도메인만 허용
  - [ ] CSP 정책은 엄격하게 설정
  - [ ] Rate limiting은 서버 용량에 맞게 조정
  - [ ] HTTPS는 필수 (production)

- [ ] **@freelang/orm**
  - [ ] 데이터베이스 암호는 환경 변수로 관리
  - [ ] DB 백업 정책 수립
  - [ ] 민감 정보는 암호화 저장
  - [ ] 정기적인 성능 모니터링

- [ ] **@freelang/http**
  - [ ] API 호출 타임아웃 설정
  - [ ] 재시도 정책 확인 (무한 반복 방지)
  - [ ] SSL 인증서 검증 활성화

- [ ] **@freelang/web-forge**
  - [ ] 템플릿 주입 공격 방지
  - [ ] XSS 방지 (HTML escaping)
  - [ ] 생성된 HTML 크기 모니터링

### 모니터링

```javascript
// 로그 및 모니터링
const logger = {
  auth: (event, user, ip) => {
    console.log(`[AUTH] ${event} - User: ${user} - IP: ${ip}`);
  },
  error: (service, error) => {
    console.error(`[ERROR] ${service} - ${error.message}`);
  },
  performance: (operation, duration) => {
    console.log(`[PERF] ${operation} - ${duration}ms`);
  }
};
```

## 트러블슈팅

### 문제: "토큰 만료 오류"
```javascript
// 원인: 클라이언트와 서버 시간 불일치
// 해결: NTP 동기화, 토큰 갱신 엔드포인트 구현

router.post('/refresh-token', authMiddleware, (req, res) => {
  const newToken = generateToken(req.user);
  res.json({ token: newToken });
});
```

### 문제: "Database 연결 풀 고갈"
```javascript
// 원인: 연결 누수
// 해결: 항상 정리(cleanup) 코드 작성

try {
  const result = await User.findAll();
} finally {
  // 자동으로 정리됨 (하지만 명시적으로 하는 것이 좋음)
}
```

### 문제: "Rate limiting 오작동"
```javascript
// 원인: 프록시 뒤에 있을 때 모든 요청이 같은 IP로 보임
// 해결: X-Forwarded-For 헤더 사용

const rateLimit = rateLimitMiddleware({
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip
});
```

## 추가 리소스

- [@freelang/auth 문서](https://npmjs.com/package/@freelang/auth)
- [@freelang/validator 문서](https://npmjs.com/package/@freelang/validator)
- [@freelang/security 문서](https://npmjs.com/package/@freelang/security)
- [@freelang/orm 문서](https://npmjs.com/package/@freelang/orm)
- [@freelang/http 문서](https://npmjs.com/package/@freelang/http)
- [@freelang/web-forge 문서](https://npmjs.com/package/@freelang/web-forge)

---

**작성**: Claude AI
**버전**: 1.0.0
**마지막 업데이트**: 2026-03-08
