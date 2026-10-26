/* eslint-disable no-console */
const { connectDB, disconnectDB } = require('../server/config/db');
const User = require('../server/models/User');
const Property = require('../server/models/Property');
const Inquiry = require('../server/models/Inquiry');
const Favorite = require('../server/models/Favorite');
const { ROLES } = require('../server/constants/roles');
const { NODE_ENV, validateEnv } = require('../server/config/env');

async function seedDatabase() {
  if (NODE_ENV === 'production') {
    console.error('CRITICAL: Seed script refused to run in production mode (NODE_ENV=production).');
    process.exit(1);
  }

  try {
    validateEnv();
    await connectDB();
    console.log('Connected to database for development seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Property.deleteMany({}),
      Inquiry.deleteMany({}),
      Favorite.deleteMany({})
    ]);
    console.log('Cleared existing collections.');

    // 1. Create development users
    const [adminUser, ownerUser, seekerUser] = await Promise.all([
      User.create({
        name: 'Portal Administrator',
        email: 'admin@example.com',
        password: 'Password123!',
        role: ROLES.ADMIN,
        status: 'active',
        emailVerified: true
      }),
      User.create({
        name: 'Sarah Owner',
        email: 'owner@example.com',
        password: 'Password123!',
        role: ROLES.OWNER,
        phone: '+1 555-0199',
        status: 'active',
        emailVerified: true
      }),
      User.create({
        name: 'John Seeker',
        email: 'seeker@example.com',
        password: 'Password123!',
        role: ROLES.SEEKER,
        phone: '+1 555-0144',
        status: 'active',
        emailVerified: true
      })
    ]);
    console.log('Created dev users: admin, owner, seeker.');

    // 2. Create sample published properties
    const propertiesData = [
      {
        title: 'Modern Highrise Luxury Apartment with Ocean View',
        publicId: 'PROP-1001',
        description: 'Spectacular sunlit 2-bedroom luxury residence featuring floor-to-ceiling windows, modern kitchen with quartz countertops, central HVAC, and full building concierge services.',
        propertyType: 'apartment',
        purpose: 'rent',
        price: 3200,
        deposit: 6400,
        bedrooms: 2,
        bathrooms: 2,
        area: 1250,
        areaUnit: 'sqft',
        furnishing: 'fully_furnished',
        amenities: ['parking', 'gym', 'swimming_pool', 'elevator', 'security', 'power_backup', 'wifi', 'air_conditioning', 'balcony'],
        address: '742 Evergreen Terrace, Suite 14B',
        locality: 'Downtown Waterfront',
        city: 'seattle',
        state: 'WA',
        postalCode: '98101',
        coordinates: { lat: 47.6062, lng: -122.3321 },
        owner: ownerUser._id,
        status: 'published',
        availability: { isAvailable: true, availableFrom: new Date() },
        moderation: { status: 'approved', note: 'Initial seed approval', reviewedBy: adminUser._id, reviewedAt: new Date() },
        images: [
          {
            url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
            publicId: 'seed_img_apt_1',
            order: 0
          },
          {
            url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80',
            publicId: 'seed_img_apt_2',
            order: 1
          }
        ]
      },
      {
        title: 'Spacious Suburban Family Villa with Private Garden',
        publicId: 'PROP-1002',
        description: 'Charming 4-bedroom detached family residence in a secure gated community with a landscaped private backyard, barbecue patio, and two-car covered garage.',
        propertyType: 'villa',
        purpose: 'sale',
        price: 850000,
        deposit: 0,
        bedrooms: 4,
        bathrooms: 3,
        area: 3100,
        areaUnit: 'sqft',
        furnishing: 'semi_furnished',
        amenities: ['parking', 'security', 'garden', 'gated_community', 'balcony'],
        address: '104 Pine Valley Boulevard',
        locality: 'West Hills',
        city: 'austin',
        state: 'TX',
        postalCode: '78701',
        coordinates: { lat: 30.2672, lng: -97.7431 },
        owner: ownerUser._id,
        status: 'published',
        availability: { isAvailable: true, availableFrom: new Date() },
        moderation: { status: 'approved', note: 'Initial seed approval', reviewedBy: adminUser._id, reviewedAt: new Date() },
        images: [
          {
            url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
            publicId: 'seed_img_villa_1',
            order: 0
          }
        ]
      },
      {
        title: 'Cozy Urban Studio Loft Near Metro',
        publicId: 'PROP-1003',
        description: 'Efficient contemporary studio loft with industrial accents, exposed brick, high ceilings, custom storage cabinets, and walking distance to transit station.',
        propertyType: 'studio',
        purpose: 'rent',
        price: 1650,
        deposit: 1650,
        bedrooms: 0,
        bathrooms: 1,
        area: 550,
        areaUnit: 'sqft',
        furnishing: 'fully_furnished',
        amenities: ['elevator', 'security', 'power_backup', 'wifi', 'air_conditioning'],
        address: '22 Elm Street, Flat 3C',
        locality: 'Arts District',
        city: 'chicago',
        state: 'IL',
        postalCode: '60601',
        coordinates: { lat: 41.8781, lng: -87.6298 },
        owner: ownerUser._id,
        status: 'published',
        availability: { isAvailable: true, availableFrom: new Date() },
        moderation: { status: 'approved', note: 'Initial seed approval', reviewedBy: adminUser._id, reviewedAt: new Date() },
        images: [
          {
            url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
            publicId: 'seed_img_studio_1',
            order: 0
          }
        ]
      },
      {
        title: 'Commercial Office Space in Business Park',
        publicId: 'PROP-1004',
        description: 'Prime grade-A commercial office space with open plan layout, executive conference room, reception area, and high-speed fiber internet connectivity.',
        propertyType: 'commercial',
        purpose: 'rent',
        price: 5400,
        deposit: 10800,
        bedrooms: 0,
        bathrooms: 2,
        area: 2200,
        areaUnit: 'sqft',
        furnishing: 'unfurnished',
        amenities: ['parking', 'elevator', 'security', 'power_backup', 'cctv'],
        address: '500 Tech Parkway, 4th Floor',
        locality: 'Innovation Park',
        city: 'seattle',
        state: 'WA',
        postalCode: '98109',
        coordinates: { lat: 47.6205, lng: -122.3493 },
        owner: ownerUser._id,
        status: 'published',
        availability: { isAvailable: true, availableFrom: new Date() },
        moderation: { status: 'approved', note: 'Initial seed approval', reviewedBy: adminUser._id, reviewedAt: new Date() },
        images: [
          {
            url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
            publicId: 'seed_img_comm_1',
            order: 0
          }
        ]
      }
    ];

    const seededProps = await Property.create(propertiesData);
    console.log(`Created ${seededProps.length} sample published properties.`);

    // 3. Create sample inquiry
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days in future
    await Inquiry.create({
      property: seededProps[0]._id,
      seeker: seekerUser._id,
      owner: ownerUser._id,
      type: 'viewing',
      message: 'Hello, I would like to schedule a viewing for this Saturday morning.',
      viewingDate: futureDate,
      status: 'pending'
    });
    console.log('Created sample viewing inquiry.');

    // 4. Create sample favorite
    await Favorite.create({
      user: seekerUser._id,
      property: seededProps[0]._id
    });
    console.log('Created sample favorite.');

    console.log('\nSeeding completed successfully!');
    console.log('Test Accounts:');
    console.log(' - Admin:  admin@example.com / Password123!');
    console.log(' - Owner:  owner@example.com / Password123!');
    console.log(' - Seeker: seeker@example.com / Password123!\n');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
