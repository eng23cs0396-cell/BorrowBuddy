require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || 'smart_library_peer_exchange',
    });

    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@smartlibrary.com' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    const adminEmail = 'admin@smartlibrary.com';
    const adminPassword = 'AdminPass123!';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const admin = await User.create({
      name: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      status: 'active',
    });

    console.log('\n✅ Admin user created successfully!\n');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('\nUsage: Login with these credentials on the frontend.');
    console.log('Once logged in, go to Admin Dashboard to verify new users.\n');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seedAdmin();
