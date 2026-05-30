require('dotenv').config();
const mongoose = require('mongoose');
const LibraryBook = require('./src/models/LibraryBook');
const ListedBook = require('./src/models/ListedBook');
const User = require('./src/models/User');

const seedBooks = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME || 'smart_library_peer_exchange',
    });

    console.log('Connected to MongoDB');

    // Get admin user for ListedBook owner
    let owner = await User.findOne({ email: 'admin@smartlibrary.com' });
    if (!owner) {
      console.log('Admin user not found. Creating a test user...');
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('TestUser123!', salt);
      owner = await User.create({
        name: 'Test User',
        email: 'testuser@smartlibrary.com',
        password: hashedPassword,
        isVerified: true,
        status: 'active',
      });
    }

    const libraryBooksData = [
      {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        isbn: '978-0-06-112008-4',
        rackLocation: 'A1-501',
        description: 'A classic novel about racial injustice and childhood innocence.',
        categories: ['Classic', 'Fiction', 'American Literature'],
        totalCopies: 5,
        availableCopies: 3,
      },
      {
        title: '1984',
        author: 'George Orwell',
        isbn: '978-0-452-26423-6',
        rackLocation: 'A2-302',
        description: 'A dystopian novel about totalitarianism.',
        categories: ['Dystopian', 'Fiction', 'Science Fiction'],
        totalCopies: 4,
        availableCopies: 2,
      },
      {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        isbn: '978-0-7432-7356-5',
        rackLocation: 'B1-401',
        description: 'A tale of wealth, love, and the American Dream.',
        categories: ['Classic', 'Fiction', 'Romance'],
        totalCopies: 6,
        availableCopies: 4,
      },
      {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        isbn: '978-0-141-43951-8',
        rackLocation: 'B2-203',
        description: 'A romantic novel about manners and marriage.',
        categories: ['Classic', 'Fiction', 'Romance'],
        totalCopies: 5,
        availableCopies: 3,
      },
      {
        title: 'The Catcher in the Rye',
        author: 'J.D. Salinger',
        isbn: '978-0-316-76948-0',
        rackLocation: 'C1-105',
        description: 'A coming-of-age novel about teenage angst.',
        categories: ['Classic', 'Fiction', 'Young Adult'],
        totalCopies: 3,
        availableCopies: 1,
      },
      {
        title: 'Brave New World',
        author: 'Aldous Huxley',
        isbn: '978-0-06-085052-4',
        rackLocation: 'A3-220',
        description: 'A dystopian novel about a future society.',
        categories: ['Dystopian', 'Fiction', 'Science Fiction'],
        totalCopies: 4,
        availableCopies: 3,
      },
      {
        title: 'The Lord of the Rings',
        author: 'J.R.R. Tolkien',
        isbn: '978-0-544-00532-8',
        rackLocation: 'D1-600',
        description: 'An epic fantasy trilogy.',
        categories: ['Fantasy', 'Adventure', 'Epic'],
        totalCopies: 7,
        availableCopies: 5,
      },
      {
        title: 'Harry Potter and the Philosopher\'s Stone',
        author: 'J.K. Rowling',
        isbn: '978-0-747-53269-9',
        rackLocation: 'E1-310',
        description: 'A magical adventure at Hogwarts School.',
        categories: ['Fantasy', 'Young Adult', 'Magic'],
        totalCopies: 8,
        availableCopies: 6,
      },
      {
        title: 'The Hobbit',
        author: 'J.R.R. Tolkien',
        isbn: '978-0-547-92807-2',
        rackLocation: 'D2-550',
        description: 'A fantasy adventure of Bilbo Baggins.',
        categories: ['Fantasy', 'Adventure', 'Classic'],
        totalCopies: 5,
        availableCopies: 4,
      },
      {
        title: 'Dune',
        author: 'Frank Herbert',
        isbn: '978-0-441-17271-9',
        rackLocation: 'F1-420',
        description: 'An epic science fiction novel about politics and ecology.',
        categories: ['Science Fiction', 'Epic', 'Adventure'],
        totalCopies: 4,
        availableCopies: 2,
      },
    ];

    const listedBooksData = [
      {
        title: 'Atomic Habits',
        author: 'James Clear',
        isbn: '978-0-735-21913-5',
        listingType: 'sell',
        condition: 'like_new',
        price: 30,
        description: 'A guide to building good habits and breaking bad ones.',
        owner: owner._id,
      },
      {
        title: 'Deep Work',
        author: 'Cal Newport',
        isbn: '978-1-400-08808-6',
        listingType: 'exchange',
        condition: 'good',
        price: 0,
        description: 'Rules for focused success in a distracted world.',
        owner: owner._id,
      },
      {
        title: 'The Clean Coder',
        author: 'Robert C. Martin',
        isbn: '978-0-132-75396-4',
        listingType: 'borrow',
        condition: 'good',
        price: 0,
        description: 'A code of conduct for professional programmers.',
        owner: owner._id,
      },
      {
        title: 'You Don\'t Know JS Yet',
        author: 'Kyle Simpson',
        isbn: '978-1-491-99330-4',
        listingType: 'sell',
        condition: 'new',
        price: 20,
        description: 'A deep dive into JavaScript fundamentals.',
        owner: owner._id,
      },
      {
        title: 'Eloquent JavaScript',
        author: 'Marijn Haverbeke',
        isbn: '978-1-593-27121-4',
        listingType: 'borrow',
        condition: 'like_new',
        price: 0,
        description: 'A modern introduction to programming.',
        owner: owner._id,
      },
      {
        title: 'Think Like a Programmer',
        author: 'V. Anton Spraul',
        isbn: '978-1-593-27484-0',
        listingType: 'exchange',
        condition: 'good',
        price: 0,
        description: 'An introduction to creative problem solving.',
        owner: owner._id,
      },
      {
        title: 'Grokking Algorithms',
        author: 'Aditya Bhargava',
        isbn: '978-1-617-29078-1',
        listingType: 'sell',
        condition: 'fair',
        price: 18,
        description: 'Illustrated examples for core algorithms.',
        owner: owner._id,
      },
      {
        title: 'The Design of Everyday Things',
        author: 'Don Norman',
        isbn: '978-0-465-05065-9',
        listingType: 'borrow',
        condition: 'good',
        price: 0,
        description: 'A classic book on design and usability.',
        owner: owner._id,
      },
      {
        title: 'Start with Why',
        author: 'Simon Sinek',
        isbn: '978-1-591-84459-3',
        listingType: 'exchange',
        condition: 'like_new',
        price: 0,
        description: 'How great leaders inspire action.',
        owner: owner._id,
      },
      {
        title: 'Rich Dad Poor Dad',
        author: 'Robert T. Kiyosaki',
        isbn: '978-0-446-67745-5',
        listingType: 'sell',
        condition: 'good',
        price: 14,
        description: 'What the rich teach their kids about money.',
        owner: owner._id,
      },
    ];

    // Clear existing books
    await LibraryBook.deleteMany({});
    await ListedBook.deleteMany({});

    // Seed library books
    const libraryBooks = await LibraryBook.insertMany(libraryBooksData);
    console.log(`\n✅ Added ${libraryBooks.length} library books`);

    // Seed listed books
    const listedBooks = await ListedBook.insertMany(listedBooksData);
    console.log(`✅ Added ${listedBooks.length} listed books\n`);

    console.log('Sample Books Added:');
    console.log('\n📚 Library Books (Borrowing):');
    libraryBooks.slice(0, 3).forEach((book, i) => {
      console.log(`  ${i + 1}. ${book.title} by ${book.author}`);
    });
    console.log(`  ... and 7 more\n`);

    console.log('📖 Listed Books (Peer Exchange):');
    listedBooks.slice(0, 3).forEach((book, i) => {
      console.log(`  ${i + 1}. ${book.title} by ${book.author} (${book.listingType})`);
    });
    console.log(`  ... and 7 more\n`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seedBooks();
