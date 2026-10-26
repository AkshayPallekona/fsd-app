/* eslint-disable no-console */
const readline = require('readline');
const { connectDB, disconnectDB } = require('../server/config/db');
const User = require('../server/models/User');
const { ROLES } = require('../server/constants/roles');
const { validateEnv } = require('../server/config/env');

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function createAdmin() {
  try {
    validateEnv();
    await connectDB();

    let name = process.env.ADMIN_NAME;
    let email = process.env.ADMIN_EMAIL;
    let password = process.env.ADMIN_PASSWORD;

    if (!name) {
      name = await prompt('Enter Admin Name: ');
    }
    if (!email) {
      email = await prompt('Enter Admin Email: ');
    }
    if (!password) {
      password = await prompt('Enter Admin Password (min 8 chars, 1 uppercase, 1 lowercase, 1 digit): ');
    }

    if (!name || name.length < 2) {
      throw new Error('Admin name must be at least 2 characters long.');
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error('Valid admin email is required.');
    }

    if (!password || !passwordRegex.test(password)) {
      throw new Error(
        'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number.'
      );
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      if (existingUser.role === ROLES.ADMIN) {
        console.log(`Admin account with email "${email}" already exists.`);
        await disconnectDB();
        process.exit(0);
      } else {
        existingUser.role = ROLES.ADMIN;
        existingUser.status = 'active';
        existingUser.password = password;
        await existingUser.save();
        console.log(`User "${email}" elevated to Admin successfully.`);
        await disconnectDB();
        process.exit(0);
      }
    }

    const admin = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: ROLES.ADMIN,
      status: 'active',
      emailVerified: true
    });

    await admin.save();
    console.log(`Admin user "${email}" created successfully.`);
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    await disconnectDB();
    process.exit(1);
  }
}

if (require.main === module) {
  createAdmin();
}

module.exports = createAdmin;
