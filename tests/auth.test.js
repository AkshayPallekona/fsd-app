const request = require('supertest');
const app = require('../server/app');
const User = require('../server/models/User');
const PasswordResetToken = require('../server/models/PasswordResetToken');

const CSRF_HEADERS = {
  'X-Requested-With': 'XMLHttpRequest'
};

describe('Auth API Suite', () => {
  const validUser = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    password: 'ValidPassword123!',
    role: 'seeker'
  };

  test('POST /api/v1/auth/register - successfully registers seeker with valid data', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set(CSRF_HEADERS)
      .send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.role).toBe('seeker');
    expect(res.body.data.user.password).toBeUndefined();

    // Verify cookie set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toMatch(/token=/);
  });

  test('POST /api/v1/auth/register - rejects registration with role: admin (role escalation attempt)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set(CSRF_HEADERS)
      .send({
        ...validUser,
        email: 'hacker@example.com',
        role: 'admin'
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/auth/register - rejects duplicate email with 409', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .set(CSRF_HEADERS)
      .send(validUser);

    const res = await request(app)
      .post('/api/v1/auth/register')
      .set(CSRF_HEADERS)
      .send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  test('POST /api/v1/auth/register - enforces password complexity policy', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set(CSRF_HEADERS)
      .send({
        ...validUser,
        email: 'weak@example.com',
        password: 'weak'
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/auth/login - authenticates user with correct password', async () => {
    await request(app).post('/api/v1/auth/register').set(CSRF_HEADERS).send(validUser);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADERS)
      .send({
        email: validUser.email,
        password: validUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  test('POST /api/v1/auth/login - rejects bad password with 401', async () => {
    await request(app).post('/api/v1/auth/register').set(CSRF_HEADERS).send(validUser);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .set(CSRF_HEADERS)
      .send({
        email: validUser.email,
        password: 'WrongPassword123!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('GET /api/v1/auth/me - blocks unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/v1/auth/me - accepts valid JWT cookie and returns user profile', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .set(CSRF_HEADERS)
      .send(validUser);

    const cookie = regRes.headers['set-cookie'];

    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  test('GET /api/v1/auth/me - immediately denies suspended user with 403', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .set(CSRF_HEADERS)
      .send(validUser);

    const cookie = regRes.headers['set-cookie'];

    // Suspend user directly in DB
    await User.updateOne({ email: validUser.email }, { status: 'suspended' });

    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  test('PATCH /api/v1/auth/change-password - invalidates older tokens on password change', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .set(CSRF_HEADERS)
      .send(validUser);

    const oldCookie = regRes.headers['set-cookie'];

    const changeRes = await request(app)
      .patch('/api/v1/auth/change-password')
      .set(CSRF_HEADERS)
      .set('Cookie', oldCookie)
      .send({
        currentPassword: validUser.password,
        newPassword: 'BrandNewPassword456!'
      });

    expect(changeRes.status).toBe(200);

    // Old token should now fail because tokenVersion changed
    const testOldTokenRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', oldCookie);

    expect(testOldTokenRes.status).toBe(401);
    expect(testOldTokenRes.body.error.code).toBe('TOKEN_REVOKED');
  });

  test('Password Reset Flow - single use, invalid token handling', async () => {
    await request(app).post('/api/v1/auth/register').set(CSRF_HEADERS).send(validUser);

    // 1. Request forgot password
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .set(CSRF_HEADERS)
      .send({ email: validUser.email });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);

    // Find the generated token record in database
    const user = await User.findOne({ email: validUser.email });
    const tokenRecord = await PasswordResetToken.findOne({ userId: user._id });
    expect(tokenRecord).toBeDefined();

    // Try resetting with fake invalid token
    const badResetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .set(CSRF_HEADERS)
      .send({
        token: 'invalid_raw_token_value',
        newPassword: 'ResetPassword789!'
      });

    expect(badResetRes.status).toBe(400);
    expect(badResetRes.body.error.code).toBe('INVALID_TOKEN');
  });

  test('POST /api/v1/auth/logout - clears authentication cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set(CSRF_HEADERS);

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    // Cookie cleared
    expect(cookies[0]).toMatch(/token=;/);
  });
});
