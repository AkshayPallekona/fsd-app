const request = require('supertest');
const app = require('../server/app');
const User = require('../server/models/User');
const Property = require('../server/models/Property');
const { generateJwt } = require('../server/services/auth.service');

const CSRF_HEADERS = {
  'X-Requested-With': 'XMLHttpRequest'
};

describe('Inquiries & Viewings API Suite', () => {
  let owner;
  let otherOwner;
  let seeker;
  let ownerCookie;
  let otherOwnerCookie;
  let seekerCookie;
  let publishedProperty;
  let draftProperty;

  beforeEach(async () => {
    owner = await User.create({
      name: 'Property Owner',
      email: 'owner@example.com',
      password: 'Password123!',
      role: 'owner',
      status: 'active'
    });

    otherOwner = await User.create({
      name: 'Unrelated Owner',
      email: 'other@example.com',
      password: 'Password123!',
      role: 'owner',
      status: 'active'
    });

    seeker = await User.create({
      name: 'Prospective Seeker',
      email: 'seeker@example.com',
      password: 'Password123!',
      role: 'seeker',
      status: 'active'
    });

    ownerCookie = `token=${generateJwt(owner)}`;
    otherOwnerCookie = `token=${generateJwt(otherOwner)}`;
    seekerCookie = `token=${generateJwt(seeker)}`;

    publishedProperty = await Property.create({
      title: 'Sunny Studio In Heart Of Town',
      description: 'Charming and fully furnished studio apartment with natural lighting throughout.',
      propertyType: 'studio',
      purpose: 'rent',
      price: 1800,
      bedrooms: 0,
      bathrooms: 1,
      area: 500,
      address: '123 Market St',
      locality: 'Midtown',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      owner: owner._id,
      status: 'published',
      images: [{ url: '/img1.jpg', publicId: 'img1', order: 0 }]
    });

    draftProperty = await Property.create({
      title: 'Unpublished Draft Villa In Suburbs',
      description: 'Under construction villa with spacious interiors and a private garden.',
      propertyType: 'villa',
      purpose: 'rent',
      price: 4000,
      bedrooms: 3,
      bathrooms: 3,
      area: 2500,
      address: '456 Hill Rd',
      locality: 'Suburbs',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98102',
      owner: owner._id,
      status: 'draft'
    });
  });

  test('POST /api/v1/properties/:id/inquiries - Seeker submits valid inquiry', async () => {
    const res = await request(app)
      .post(`/api/v1/properties/${publishedProperty._id}/inquiries`)
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie)
      .send({
        type: 'inquiry',
        message: 'Hello, is this studio currently available for immediate move-in?'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.inquiry.status).toBe('pending');
  });

  test('POST /api/v1/properties/:id/inquiries - Unpublished property rejected with 400', async () => {
    const res = await request(app)
      .post(`/api/v1/properties/${draftProperty._id}/inquiries`)
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie)
      .send({
        type: 'inquiry',
        message: 'Can I view this draft listing?'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PROPERTY_NOT_PUBLISHED');
  });

  test('POST /api/v1/properties/:id/inquiries - Owner cannot submit inquiry on their own property', async () => {
    const res = await request(app)
      .post(`/api/v1/properties/${publishedProperty._id}/inquiries`)
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie)
      .send({
        type: 'inquiry',
        message: 'Inquiring on my own listing'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_INQUIRE_OWN_LISTING');
  });

  test('POST /api/v1/properties/:id/inquiries - Duplicate pending inquiry rejected with 409', async () => {
    await request(app)
      .post(`/api/v1/properties/${publishedProperty._id}/inquiries`)
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie)
      .send({
        type: 'inquiry',
        message: 'First inquiry message'
      });

    const res = await request(app)
      .post(`/api/v1/properties/${publishedProperty._id}/inquiries`)
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie)
      .send({
        type: 'inquiry',
        message: 'Second pending inquiry on the exact same property'
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_PENDING_INQUIRY');
  });

  test('PATCH /api/v1/owner/inquiries/:id/status - Owner accept/reject; unrelated owner blocked with 403', async () => {
    const createRes = await request(app)
      .post(`/api/v1/properties/${publishedProperty._id}/inquiries`)
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie)
      .send({
        type: 'inquiry',
        message: 'Inquiry waiting for owner review'
      });

    const inquiryId = createRes.body.data.inquiry._id;

    // Unrelated owner blocked
    const unauthRes = await request(app)
      .patch(`/api/v1/owner/inquiries/${inquiryId}/status`)
      .set(CSRF_HEADERS)
      .set('Cookie', otherOwnerCookie)
      .send({ status: 'accepted' });

    expect(unauthRes.status).toBe(403);

    // Legitimate owner accepts
    const acceptRes = await request(app)
      .patch(`/api/v1/owner/inquiries/${inquiryId}/status`)
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie)
      .send({
        status: 'accepted',
        responseMessage: 'Thank you! Yes, move-in is open.'
      });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.inquiry.status).toBe('accepted');

    // Transition from accepted to completed
    const completeRes = await request(app)
      .patch(`/api/v1/owner/inquiries/${inquiryId}/status`)
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie)
      .send({ status: 'completed' });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.inquiry.status).toBe('completed');
  });

  test('PATCH /api/v1/users/me/inquiries/:id/cancel - Seeker cancels pending inquiry; non-pending fails', async () => {
    const createRes = await request(app)
      .post(`/api/v1/properties/${publishedProperty._id}/inquiries`)
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie)
      .send({
        type: 'inquiry',
        message: 'Inquiry to be cancelled'
      });

    const inquiryId = createRes.body.data.inquiry._id;

    // Seeker cancels pending
    const cancelRes = await request(app)
      .patch(`/api/v1/users/me/inquiries/${inquiryId}/cancel`)
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.inquiry.status).toBe('cancelled');

    // Cancelling already cancelled returns 400
    const cancelAgainRes = await request(app)
      .patch(`/api/v1/users/me/inquiries/${inquiryId}/cancel`)
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie);

    expect(cancelAgainRes.status).toBe(400);
    expect(cancelAgainRes.body.error.code).toBe('INVALID_INQUIRY_TRANSITION');
  });

  test('Viewing Slot Conflict - rejects accepting viewing with ±60 min collision returning 409', async () => {
    const baseDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow at current hour
    const dateSlot1 = new Date(baseDate.getTime());
    const dateSlot2 = new Date(baseDate.getTime() + 30 * 60 * 1000); // 30 minutes later (within ±60 min!)

    const seeker2 = await User.create({
      name: 'Seeker 2',
      email: 'seeker2@example.com',
      password: 'Password123!',
      role: 'seeker',
      status: 'active'
    });
    const seeker2Cookie = `token=${generateJwt(seeker2)}`;

    // Viewing 1 by seeker 1
    const inq1Res = await request(app)
      .post(`/api/v1/properties/${publishedProperty._id}/inquiries`)
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie)
      .send({
        type: 'viewing',
        message: 'Viewing request 1',
        viewingDate: dateSlot1.toISOString()
      });

    // Viewing 2 by seeker 2
    const inq2Res = await request(app)
      .post(`/api/v1/properties/${publishedProperty._id}/inquiries`)
      .set(CSRF_HEADERS)
      .set('Cookie', seeker2Cookie)
      .send({
        type: 'viewing',
        message: 'Viewing request 2',
        viewingDate: dateSlot2.toISOString()
      });

    const id1 = inq1Res.body.data.inquiry._id;
    const id2 = inq2Res.body.data.inquiry._id;

    // Owner accepts Viewing 1
    const accept1Res = await request(app)
      .patch(`/api/v1/owner/inquiries/${id1}/status`)
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie)
      .send({ status: 'accepted' });

    expect(accept1Res.status).toBe(200);

    // Owner attempts to accept Viewing 2 (conflicts within 30 min of slot 1!)
    const conflictRes = await request(app)
      .patch(`/api/v1/owner/inquiries/${id2}/status`)
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie)
      .send({ status: 'accepted' });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error.code).toBe('VIEWING_SLOT_CONFLICT');
  });
});
