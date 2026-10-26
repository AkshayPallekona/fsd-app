const request = require('supertest');
const app = require('../server/app');
const User = require('../server/models/User');
const Property = require('../server/models/Property');
const AuditLog = require('../server/models/AuditLog');
const { generateJwt } = require('../server/services/auth.service');

const CSRF_HEADERS = {
  'X-Requested-With': 'XMLHttpRequest'
};

describe('Favorites and Admin API Suite', () => {
  let seeker;
  let owner;
  let admin;
  let anotherAdmin;
  let seekerCookie;
  let ownerCookie;
  let adminCookie;
  let testProperty;

  beforeEach(async () => {
    seeker = await User.create({
      name: 'Seeker One',
      email: 'seeker1@example.com',
      password: 'Password123!',
      role: 'seeker',
      status: 'active'
    });

    owner = await User.create({
      name: 'Owner One',
      email: 'owner1@example.com',
      password: 'Password123!',
      role: 'owner',
      status: 'active'
    });

    admin = await User.create({
      name: 'Admin One',
      email: 'admin1@example.com',
      password: 'Password123!',
      role: 'admin',
      status: 'active'
    });

    anotherAdmin = await User.create({
      name: 'Admin Two',
      email: 'admin2@example.com',
      password: 'Password123!',
      role: 'admin',
      status: 'active'
    });

    seekerCookie = `token=${generateJwt(seeker)}`;
    ownerCookie = `token=${generateJwt(owner)}`;
    adminCookie = `token=${generateJwt(admin)}`;

    testProperty = await Property.create({
      title: 'Modern Loft In Capitol Hill',
      description: 'Charming city loft featuring exposed timber beams and hardwood floors.',
      propertyType: 'apartment',
      purpose: 'rent',
      price: 2200,
      bedrooms: 1,
      bathrooms: 1,
      area: 850,
      address: '789 Broadway',
      locality: 'Capitol Hill',
      city: 'seattle',
      state: 'WA',
      postalCode: '98102',
      owner: owner._id,
      status: 'published',
      images: [{ url: '/img.jpg', publicId: 'img1', order: 0 }]
    });
  });

  test('Favorites - Add, Duplicate check (409), and Remove', async () => {
    // 1. Add to favorites
    const addRes = await request(app)
      .post(`/api/v1/properties/${testProperty._id}/favorite`)
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie);

    expect(addRes.status).toBe(201);
    expect(addRes.body.success).toBe(true);

    // 2. Duplicate favorite attempt returns 409
    const dupRes = await request(app)
      .post(`/api/v1/properties/${testProperty._id}/favorite`)
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie);

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('DUPLICATE_FAVORITE');

    // 3. User can fetch their favorites
    const listRes = await request(app)
      .get('/api/v1/users/me/favorites')
      .set('Cookie', seekerCookie);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.items.length).toBe(1);

    // 4. Remove favorite
    const removeRes = await request(app)
      .delete(`/api/v1/properties/${testProperty._id}/favorite`)
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie);

    expect(removeRes.status).toBe(200);

    // Verify list is now empty
    const emptyListRes = await request(app)
      .get('/api/v1/users/me/favorites')
      .set('Cookie', seekerCookie);

    expect(emptyListRes.body.data.items.length).toBe(0);
  });

  test('Admin-only routes block non-admin users with 403', async () => {
    const seekerRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', seekerCookie);
    expect(seekerRes.status).toBe(403);

    const ownerRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', ownerCookie);
    expect(ownerRes.status).toBe(403);

    const adminRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', adminCookie);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.stats).toBeDefined();
  });

  test('Admin moderation flow - approve and reject listing with notes and audit log', async () => {
    const pendingProp = await Property.create({
      title: 'Pending Review Villa In Suburbs',
      description: 'Luxury villa pending review by system administrators.',
      propertyType: 'villa',
      purpose: 'sale',
      price: 900000,
      bedrooms: 4,
      bathrooms: 4,
      area: 4000,
      address: '100 Sunset Blvd',
      locality: 'Suburbs',
      city: 'seattle',
      state: 'WA',
      postalCode: '98103',
      owner: owner._id,
      status: 'pending_review',
      images: [{ url: '/img.jpg', publicId: 'img1', order: 0 }]
    });

    // Admin rejects with note
    const rejectRes = await request(app)
      .patch(`/api/v1/admin/properties/${pendingProp._id}/moderation`)
      .set(CSRF_HEADERS)
      .set('Cookie', adminCookie)
      .send({
        status: 'rejected',
        note: 'High-resolution exterior photo required.'
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.property.status).toBe('rejected');

    // Verify audit log written
    const auditRecord = await AuditLog.findOne({
      targetId: pendingProp._id,
      action: 'LISTING_REJECTED'
    });
    expect(auditRecord).toBeDefined();
    expect(auditRecord.admin.toString()).toBe(admin._id.toString());
  });

  test('Admin user management - suspend user and protect against self/admin suspension', async () => {
    // 1. Admin suspends regular seeker
    const suspendRes = await request(app)
      .patch(`/api/v1/admin/users/${seeker._id}/status`)
      .set(CSRF_HEADERS)
      .set('Cookie', adminCookie)
      .send({ status: 'suspended' });

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.user.status).toBe('suspended');

    // 2. Admin cannot suspend self (returns 403)
    const selfSuspendRes = await request(app)
      .patch(`/api/v1/admin/users/${admin._id}/status`)
      .set(CSRF_HEADERS)
      .set('Cookie', adminCookie)
      .send({ status: 'suspended' });

    expect(selfSuspendRes.status).toBe(403);
    expect(selfSuspendRes.body.error.code).toBe('CANNOT_SUSPEND_SELF');

    // 3. Admin cannot suspend another admin (returns 403)
    const otherAdminSuspendRes = await request(app)
      .patch(`/api/v1/admin/users/${anotherAdmin._id}/status`)
      .set(CSRF_HEADERS)
      .set('Cookie', adminCookie)
      .send({ status: 'suspended' });

    expect(otherAdminSuspendRes.status).toBe(403);
    expect(otherAdminSuspendRes.body.error.code).toBe('CANNOT_SUSPEND_ADMIN');
  });

  test('Role-escalation attempt prevention via PATCH /api/v1/users/me', async () => {
    // Seeker attempts to change role to admin via profile update
    const patchRes = await request(app)
      .patch('/api/v1/users/me')
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie)
      .send({
        name: 'Hacker Seeker',
        role: 'admin',
        status: 'suspended'
      });

    expect(patchRes.status).toBe(200);
    // Name updated, but role is STILL seeker!
    expect(patchRes.body.data.user.name).toBe('Hacker Seeker');
    expect(patchRes.body.data.user.role).toBe('seeker');
    expect(patchRes.body.data.user.status).toBe('active');

    // Verify directly in MongoDB
    const userInDb = await User.findById(seeker._id);
    expect(userInDb.role).toBe('seeker');
    expect(userInDb.status).toBe('active');
  });

  test('GET /api/v1/admin/audit-logs - lists audit trail', async () => {
    const res = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });
});
