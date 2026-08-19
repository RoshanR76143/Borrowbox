/**
 * Seed script for BorrowBox.
 *
 * Populates the database with demo books and (optionally) a first admin
 * account. Safe to re-run: it skips books/users that already exist
 * (matched by ISBN / email).
 *
 * Usage:
 *   npm run seed
 */
require('dotenv').config();
const connectDB = require('../config/db');
const Book = require('../models/Book');
const User = require('../models/User');

const demoBooks = [
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    description:
      'A practical guide to building good habits and breaking bad ones through small, consistent changes.',
    category: 'Self Development',
    isbn: '9780735211292',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg',
    totalCopies: 6,
    availableCopies: 6,
  },
  {
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    description:
      'A shepherd boy travels from Spain to Egypt in search of a treasure, discovering the meaning of destiny along the way.',
    category: 'Fiction',
    isbn: '9780061122415',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780061122415-L.jpg',
    totalCopies: 5,
    availableCopies: 5,
  },
  {
    title: 'Deep Work',
    author: 'Cal Newport',
    description:
      'Rules for focused success in a distracted world, and why the ability to concentrate is a superpower.',
    category: 'Business',
    isbn: '9781455586691',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9781455586691-L.jpg',
    totalCopies: 4,
    availableCopies: 4,
  },
  {
    title: 'Ikigai',
    author: 'Héctor García',
    description:
      'The Japanese secret to a long and happy life, explored through the habits of the world\u2019s longest-living people.',
    category: 'Self Development',
    isbn: '9780143130727',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780143130727-L.jpg',
    totalCopies: 5,
    availableCopies: 5,
  },
  {
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    description:
      'Timeless lessons on wealth, greed, and happiness, and how our behavior shapes our financial outcomes.',
    category: 'Business',
    isbn: '9780857197689',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780857197689-L.jpg',
    totalCopies: 4,
    availableCopies: 4,
  },
  {
    title: 'Rich Dad Poor Dad',
    author: 'Robert Kiyosaki',
    description:
      'What the rich teach their kids about money that the poor and middle class do not.',
    category: 'Business',
    isbn: '9781612680194',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9781612680194-L.jpg',
    totalCopies: 3,
    availableCopies: 3,
  },
  {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    description:
      'A handbook of agile software craftsmanship, teaching principles and practices for writing clean, maintainable code.',
    category: 'Technology',
    isbn: '9780132350884',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg',
    totalCopies: 4,
    availableCopies: 4,
  },
  {
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt',
    description:
      'Your journey to mastery: timeless tips and tricks to help you become a more effective and adaptable programmer.',
    category: 'Technology',
    isbn: '9780135957059',
    coverImage: 'https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg',
    totalCopies: 3,
    availableCopies: 3,
  },
];

const run = async () => {
  await connectDB();

  let created = 0;
  let skipped = 0;

  for (const bookData of demoBooks) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await Book.findOne({ isbn: bookData.isbn });
    if (existing) {
      skipped += 1;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await Book.create(bookData);
    created += 1;
  }

  console.log(`Seed complete: ${created} book(s) created, ${skipped} already existed.`);

  // Optionally create a default admin account if ADMIN_EMAIL / ADMIN_PASSWORD
  // are provided as environment variables when running the script, e.g.:
  //   ADMIN_EMAIL=admin@borrowbox.com ADMIN_PASSWORD=admin123456 npm run seed
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingAdmin) {
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log(`Existing user ${adminEmail} promoted to admin.`);
    } else {
      await User.create({
        name: 'BorrowBox Admin',
        email: adminEmail.toLowerCase(),
        password: adminPassword,
        role: 'admin',
      });
      console.log(`Admin account created: ${adminEmail}`);
    }
  } else {
    console.log('No ADMIN_EMAIL / ADMIN_PASSWORD provided \u2014 skipping admin account creation.');
  }

  process.exit(0);
};

run().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
