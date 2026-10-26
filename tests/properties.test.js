const request = require('supertest');
const app = require('../server/app');
const User = require('../server/models/User');
const Property = require('../server/models/Property');
const { generateJwt } = require('../server/services/auth.service');

const CSRF_HEADERS = {
  'X-Requested-With': 'XMLHttpRequest'
};

describe('Properties API Suite', () => {
  let ownerUser;
  let otherOwnerUser;
  let seekerUser;
  let ownerCookie;
  let otherOwnerCookie;
  let seekerCookie;

  beforeEach(async () => {
    ownerUser = await User.create({
      name: 'Owner User',
      email: 'owner@example.com',
      password: 'Password123!',
      role: 'owner',
      status: 'active'
    });

    otherOwnerUser = await User.create({
      name: 'Other Owner',
      email: 'other_owner@example.com',
      password: 'Password123!',
      role: 'owner',
      status: 'active'
    });

    seekerUser = await User.create({
      name: 'Seeker User',
      email: 'seeker@example.com',
      password: 'Password123!',
      role: 'seeker',
      status: 'active'
    });


    ownerCookie = `token=${generateJwt(ownerUser)}`;
    otherOwnerCookie = `token=${generateJwt(otherOwnerUser)}`;
    seekerCookie = `token=${generateJwt(seekerUser)}`;
  });

  const sampleListing = {
    title: 'Downtown Modern Luxury Apartment',
    description: 'Stunning 2-bedroom corner unit with panoramic city views and high-end finishes.',
    propertyType: 'apartment',
    purpose: 'rent',
    price: 2500,
    deposit: 5000,
    bedrooms: 2,
    bathrooms: 2,
    area: 1100,
    areaUnit: 'sqft',
    furnishing: 'fully_furnished',
    amenities: ['parking', 'gym', 'elevator'],
    address: '100 Main Street',
    locality: 'Downtown',
    city: 'Seattle',
    state: 'WA',
    postalCode: '98101'
  };

  test('POST /api/v1/properties - Owner can create draft listing', async () => {
    const res = await request(app)
      .post('/api/v1/properties')
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie)
      .send(sampleListing);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.property.title).toBe(sampleListing.title);
    expect(res.body.data.property.status).toBe('draft');
    expect(res.body.data.property.owner.toString()).toBe(ownerUser._id.toString());
  });

  test('POST /api/v1/properties - Seeker cannot create listings (role check)', async () => {
    const res = await request(app)
      .post('/api/v1/properties')
      .set(CSRF_HEADERS)
      .set('Cookie', seekerCookie)
      .send(sampleListing);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/properties - Validation rejects invalid property data', async () => {
    const res = await request(app)
      .post('/api/v1/properties')
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie)
      .send({
        ...sampleListing,
        title: 'Tiny', // < 5 chars
        price: -100 // negative price
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('PATCH /api/v1/properties/:id - Owner can update; unrelated owner blocked with 403', async () => {
    const createRes = await request(app)
      .post('/api/v1/properties')
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie)
      .send(sampleListing);

    const propId = createRes.body.data.property._id;

    // Unrelated owner blocked
    const unauthRes = await request(app)
      .patch(`/api/v1/properties/${propId}`)
      .set(CSRF_HEADERS)
      .set('Cookie', otherOwnerCookie)
      .send({ title: 'Hacked Title By Other Owner' });

    expect(unauthRes.status).toBe(403);

    // Legitimate owner updates
    const updateRes = await request(app)
      .patch(`/api/v1/properties/${propId}`)
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie)
      .send({ price: 2800 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.property.price).toBe(2800);
  });

  test('DELETE /api/v1/properties/:id - Performs soft archive', async () => {
    const createRes = await request(app)
      .post('/api/v1/properties')
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie)
      .send(sampleListing);

    const propId = createRes.body.data.property._id;

    const delRes = await request(app)
      .delete(`/api/v1/properties/${propId}`)
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie);

    expect(delRes.status).toBe(200);

    const archivedProp = await Property.findById(propId);
    expect(archivedProp.status).toBe('archived');
  });

  test('Status transitions and publishing validation', async () => {
    // Listing without images cannot be published
    const prop = await Property.create({
      ...sampleListing,
      owner: ownerUser._id,
      status: 'draft',
      images: []
    });

    const pubFailRes = await request(app)
      .post(`/api/v1/properties/${prop._id}/publish`)
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie);

    expect(pubFailRes.status).toBe(400);
    expect(pubFailRes.body.error.code).toBe('NOT_PUBLISHABLE');

    // Add an image to make it publishable
    prop.images.push({
      url: '/uploads/test.jpg',
      publicId: 'test_id',
      order: 0
    });
    await prop.save();

    // Now publish succeeds
    const pubSuccessRes = await request(app)
      .post(`/api/v1/properties/${prop._id}/publish`)
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie);

    expect(pubSuccessRes.status).toBe(200);
    expect(pubSuccessRes.body.data.property.status).toBe('published');

    // Unpublish
    const unpubRes = await request(app)
      .post(`/api/v1/properties/${prop._id}/unpublish`)
      .set(CSRF_HEADERS)
      .set('Cookie', ownerCookie);

    expect(unpubRes.status).toBe(200);
    expect(unpubRes.body.data.property.status).toBe('unpublished');
  });

  test('Public Search - filters, pagination, and excludes rented/sold/draft listings', async () => {
    // 1. Published property in Seattle
    await Property.create({
      ...sampleListing,
      city: 'seattle',
      price: 2000,
      bedrooms: 2,
      owner: ownerUser._id,
      status: 'published',
      images: [{ url: '/img1.jpg', publicId: 'img1', order: 0 }]
    });

    // 2. Published property in Chicago
    await Property.create({
      ...sampleListing,
      title: 'Chicago Cozy Studio Flat',
      city: 'chicago',
      propertyType: 'studio',
      price: 1500,
      bedrooms: 0,
      owner: ownerUser._id,
      status: 'published',
      images: [{ url: '/img2.jpg', publicId: 'img2', order: 0 }]
    });

    // 3. Rented property (must be excluded from public search)
    await Property.create({
      ...sampleListing,
      title: 'Already Rented Penthouse',
      city: 'seattle',
      price: 4500,
      owner: ownerUser._id,
      status: 'rented',
      images: [{ url: '/img3.jpg', publicId: 'img3', order: 0 }]
    });

    // 4. Draft property (must be excluded)
    await Property.create({
      ...sampleListing,
      title: 'Draft Incomplete Villa',
      city: 'seattle',
      price: 5000,
      owner: ownerUser._id,
      status: 'draft'
    });

    // Query all published
    const allRes = await request(app).get('/api/v1/properties');
    expect(allRes.status).toBe(200);
    expect(allRes.body.data.total).toBe(2); // Only 2 published!

    // Filter by city=seattle
    const seattleRes = await request(app).get('/api/v1/properties?city=seattle');
    expect(seattleRes.status).toBe(200);
    expect(seattleRes.body.data.total).toBe(1);
    expect(seattleRes.body.data.items[0].city).toBe('seattle');

    // Filter by price range
    const priceRes = await request(app).get('/api/v1/properties?minPrice=1800&maxPrice=3000');
    expect(priceRes.status).toBe(200);
    expect(priceRes.body.data.total).toBe(1);
    expect(priceRes.body.data.items[0].price).toBe(2000);

    // Reject invalid price filter (minPrice > maxPrice)
    const badFilterRes = await request(app).get('/api/v1/properties?minPrice=5000&maxPrice=1000');
    expect(badFilterRes.status).toBe(400);

    // Pagination test
    const pageRes = await request(app).get('/api/v1/properties?limit=1&page=1');
    expect(pageRes.status).toBe(200);
    expect(pageRes.body.data.items.length).toBe(1);
    expect(pageRes.body.data.totalPages).toBe(2);
  });

  test('Public View exposes sanitized owner info without email or phone', async () => {
    const prop = await Property.create({
      ...sampleListing,
      owner: ownerUser._id,
      status: 'published',
      images: [{ url: '/img1.jpg', publicId: 'img1', order: 0 }]
    });

    const res = await request(app).get(`/api/v1/properties/${prop._id}`);
    expect(res.status).toBe(200);
    const item = res.body.data.property;
    expect(item.owner.name).toBe(ownerUser.name);
    expect(item.owner.createdAt).toBeDefined();
    expect(item.owner.email).toBeUndefined();
    expect(item.owner.phone).toBeUndefined();
    expect(item.moderation).toBeUndefined();
  });
});
