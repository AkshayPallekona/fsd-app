/* eslint-disable no-console */
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB } = require('../server/config/db');
const { PORT } = require('../server/config/env');
const app = require('../server/app');
const User = require('../server/models/User');
const Property = require('../server/models/Property');
const Inquiry = require('../server/models/Inquiry');
const Favorite = require('../server/models/Favorite');
const { ROLES } = require('../server/constants/roles');

async function startDevServerWithMemoryMongo() {
  try {
    console.log('Starting local in-memory MongoDB instance...');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;

    await connectDB(uri);
    console.log('Connected to in-memory MongoDB.');

    // Seed development data
    const [, ownerUser, seekerUser] = await Promise.all([
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

    const seededProps = await Property.create([
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
        owner: ownerUser._id,
        status: 'published',
        availability: { isAvailable: true, availableFrom: new Date() },
        moderation: { status: 'approved', note: 'Seed listing' },
        images: [
          {
            url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80',
            publicId: 'seed_img_apt_1',
            order: 0
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
        owner: ownerUser._id,
        status: 'published',
        availability: { isAvailable: true, availableFrom: new Date() },
        moderation: { status: 'approved', note: 'Seed listing' },
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
        owner: ownerUser._id,
        status: 'published',
        availability: { isAvailable: true, availableFrom: new Date() },
        moderation: { status: 'approved', note: 'Seed listing' },
        images: [
          {
            url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
            publicId: 'seed_img_studio_1',
            order: 0
          }
        ]
      }
    ]);

    await Inquiry.create({
      property: seededProps[0]._id,
      seeker: seekerUser._id,
      owner: ownerUser._id,
      type: 'inquiry',
      message: 'Hello, is this property available for move-in next month?',
      status: 'pending'
    });

    await Favorite.create({
      user: seekerUser._id,
      property: seededProps[0]._id
    });

    console.log('Pre-loaded test data with accounts:');
    console.log(' - Admin:  admin@example.com / Password123!');
    console.log(' - Owner:  owner@example.com / Password123!');
    console.log(' - Seeker: seeker@example.com / Password123!');

    const port = PORT || 5000;
    const server = app.listen(port, () => {
      console.log(`\n Rental Portal running at: http://localhost:${port}`);
      console.log('Press Ctrl+C to stop.\n');
    });

    const cleanup = async () => {
      console.log('\nShutting down server and in-memory database...');
      server.close();
      await mongod.stop();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    console.error('Failed to start development server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startDevServerWithMemoryMongo();
}

module.exports = startDevServerWithMemoryMongo;
