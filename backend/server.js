const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const app = express();

/* ================= ENVIRONMENT CONFIG ================= */

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/libshare_final";
const JWT_SECRET = process.env.JWT_SECRET || "libshare_secret";
const NODE_ENV = process.env.NODE_ENV || "development";

/* ================= PRODUCTION CORS CONFIGURATION ================= */

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [
      "http://localhost:3000",
      "http://localhost:5000",
      "http://127.0.0.1:5500",
      "http://localhost:5500",
      "http://localhost:8080",
      "http://127.0.0.1:8080"
    ];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests, same-origin, or local file:// (origin is null or undefined)
    if (!origin || origin === "null") return callback(null, true);

    // In development mode, allow localhost origins
    if (NODE_ENV !== "production") {
      return callback(null, true);
    }

    // In production mode, strictly enforce whitelist
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      const err = new Error(`CORS policy violation: Origin '${origin}' is not allowed`);
      err.status = 403;
      return callback(err);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

/* ================= DATABASE CONNECTION & AUTO-SEED ================= */

let dbConnected = false;

mongoose.connect(MONGO_URI)
  .then(async () => {
    dbConnected = true;
    console.log("MongoDB Connected successfully");
    await ensureIndexes();
    await seedBooksIfEmpty();
  })
  .catch(err => {
    console.error("MongoDB Connection Error:", err.message);
  });

/* ================= SCHEMAS & MODELS ================= */

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "student"],
    default: "student"
  }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  author: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  totalCopies: { type: Number, required: true, min: 1 },
  availableCopies: { type: Number, required: true, min: 0 },
  location: { type: String, default: "General Shelf", trim: true, maxlength: 100 }
}, { timestamps: true });

const Book = mongoose.model("Book", bookSchema);

const borrowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  bookTitle: { type: String, required: true },
  borrowDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returned: { type: Boolean, default: false },
  returnDate: { type: Date }
}, { timestamps: true });

// Partial unique index: A user cannot have multiple ACTIVE (unreturned) loans for the same book simultaneously
// This provides database-level race protection against simultaneous borrow requests by the same user
borrowSchema.index(
  { userId: 1, bookId: 1 },
  {
    unique: true,
    partialFilterExpression: { returned: false },
    name: "unique_active_user_book_borrow"
  }
);

const Borrow = mongoose.model("Borrow", borrowSchema);

async function ensureIndexes() {
  try {
    await User.syncIndexes();
    await Borrow.syncIndexes();
  } catch (err) {
    console.error("Index sync warning:", err.message);
  }
}

async function seedBooksIfEmpty() {
  try {
    const count = await Book.countDocuments();
    if (count === 0) {
      const seedFile = path.join(__dirname, "..", "books.json");
      if (fs.existsSync(seedFile)) {
        const raw = fs.readFileSync(seedFile, "utf-8");
        const books = JSON.parse(raw);
        if (Array.isArray(books) && books.length > 0) {
          await Book.insertMany(books);
          console.log(`Auto-seeded ${books.length} initial books from books.json`);
        }
      }
    }
  } catch (err) {
    console.error("Auto-seed error:", err.message);
  }
}

/* ================= VALIDATION & UTILITY HELPERS ================= */

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
}

function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
}

/* ================= AUTH MIDDLEWARE ================= */

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: "Authorization token required" });
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();

  if (!token) {
    return res.status(401).json({ success: false, message: "Authorization token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Session expired or invalid token. Please log in again." });
  }
}

/* ================= AUTH ROUTES ================= */

app.post("/register", async (req, res, next) => {
  try {
    let { name, email, password, role } = req.body || {};

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Name must be at least 2 characters long" });
    }

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address" });
    }

    if (!password || typeof password !== "string" || password.length < 4) {
      return res.status(400).json({ success: false, message: "Password must be at least 4 characters long" });
    }

    name = name.trim();
    email = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = role === "admin" ? "admin" : "student";

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: assignedRole
    });

    await user.save();
    return res.status(201).json({ success: true, message: "User registered successfully" });
  } catch (err) {
    next(err);
  }
});

app.post("/login", async (req, res, next) => {
  try {
    let { email, password } = req.body || {};

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    email = email.trim().toLowerCase();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      role: user.role,
      name: user.name,
      email: user.email
    });
  } catch (err) {
    next(err);
  }
});

/* ================= BOOK ROUTES WITH PAGINATION ================= */

app.get("/books", async (req, res, next) => {
  try {
    const rawSearch = (req.query.search || "").trim();

    // Input validation for pagination parameters
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const skip = (page - 1) * limit;

    let query = {};
    if (rawSearch) {
      const safeSearch = escapeRegex(rawSearch);
      query = {
        $or: [
          { title: { $regex: safeSearch, $options: "i" } },
          { author: { $regex: safeSearch, $options: "i" } },
          { location: { $regex: safeSearch, $options: "i" } }
        ]
      };
    }

    const [totalBooks, books] = await Promise.all([
      Book.countDocuments(query),
      Book.find(query).sort({ title: 1 }).skip(skip).limit(limit)
    ]);

    const totalPages = Math.ceil(totalBooks / limit) || 1;

    return res.json({
      success: true,
      books,
      pagination: {
        totalBooks,
        currentPage: page,
        totalPages,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    next(err);
  }
});

app.post("/books", authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admin privileges required." });
    }

    let { title, author, totalCopies, location } = req.body || {};

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Valid book title is required" });
    }

    if (!author || typeof author !== "string" || author.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Valid book author is required" });
    }

    const copies = parseInt(totalCopies, 10);
    if (isNaN(copies) || copies <= 0) {
      return res.status(400).json({ success: false, message: "Total copies must be a positive number (at least 1)" });
    }

    const book = new Book({
      title: title.trim(),
      author: author.trim(),
      totalCopies: copies,
      availableCopies: copies,
      location: location && typeof location === "string" ? location.trim() : "General Shelf"
    });

    await book.save();
    return res.status(201).json({ success: true, message: "Book added successfully", book });
  } catch (err) {
    next(err);
  }
});

/* ================= BORROW & RETURN ROUTES ================= */

/**
 * Borrow a book
 * Concurrency & Edge Cases Handled:
 * 1. Multi-user concurrency: Atomic findOneAndUpdate prevents race conditions on the last copy.
 * 2. Same-user simultaneous borrow: Checks active loans + partial unique index on {userId, bookId, returned: false}.
 *    If simultaneous requests hit, MongoDB unique constraint rejects the duplicate and rolls back copy decrement.
 * 3. Input validation: Ensures ObjectId is valid before processing.
 */
app.post("/borrow/:id", authMiddleware, async (req, res, next) => {
  const bookId = req.params.id;

  if (!isValidObjectId(bookId)) {
    return res.status(400).json({ success: false, message: "Invalid book ID format" });
  }

  try {
    // Check if user already has an active loan for this book
    const existingBorrow = await Borrow.findOne({
      userId: req.user.id,
      bookId: bookId,
      returned: false
    });

    if (existingBorrow) {
      return res.status(400).json({
        success: false,
        message: "You already have an active loan for this book. Please return it before borrowing again."
      });
    }

    // Atomic decrement of availableCopies
    const book = await Book.findOneAndUpdate(
      { _id: bookId, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { new: true }
    );

    if (!book) {
      const bookExists = await Book.findById(bookId);
      if (!bookExists) {
        return res.status(404).json({ success: false, message: "Book not found" });
      }
      return res.status(400).json({ success: false, message: "Sorry, this book is currently out of stock!" });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    try {
      const borrow = await Borrow.create({
        userId: req.user.id,
        bookId: book._id,
        bookTitle: book.title,
        dueDate,
        borrowDate: new Date(),
        returned: false
      });

      return res.status(200).json({
        success: true,
        message: `Successfully borrowed "${book.title}"!`,
        dueDate,
        borrow,
        availableCopies: book.availableCopies
      });
    } catch (createErr) {
      // Rollback copy decrement if borrow record insertion failed (e.g. unique constraint from same-user concurrent request)
      await Book.findByIdAndUpdate(bookId, { $inc: { availableCopies: 1 } });

      if (createErr.code === 11000) {
        return res.status(400).json({
          success: false,
          message: "You already have an active loan for this book. Please return it before borrowing again."
        });
      }
      throw createErr;
    }
  } catch (err) {
    next(err);
  }
});

/**
 * Return a borrowed book
 * Concurrency & Edge Cases Handled:
 * 1. Double-Return Protection: Uses atomic findOneAndUpdate with `{ returned: false }`.
 *    Simultaneous or consecutive return requests can only succeed ONCE.
 * 2. Clamped copy count: Copies are never incremented beyond totalCopies.
 * 3. Supports lookup by borrow ID or book ID for client flexibility.
 */
app.post("/return/:id", authMiddleware, async (req, res, next) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }

  try {
    // Atomic transition from returned: false -> returned: true
    // If already returned, findOneAndUpdate returns null, preventing double-return race conditions
    let borrow = await Borrow.findOneAndUpdate(
      { _id: id, userId: req.user.id, returned: false },
      { $set: { returned: true, returnDate: new Date() } },
      { new: true }
    );

    // If not found by borrow ID, check by bookId for active loan
    if (!borrow) {
      borrow = await Borrow.findOneAndUpdate(
        { bookId: id, userId: req.user.id, returned: false },
        { $set: { returned: true, returnDate: new Date() } },
        { new: true }
      );
    }

    if (!borrow) {
      return res.status(400).json({
        success: false,
        message: "Active loan record not found or book has already been returned."
      });
    }

    // Safely increment availableCopies without exceeding totalCopies
    const updatedBook = await Book.findOneAndUpdate(
      { _id: borrow.bookId, $expr: { $lt: ["$availableCopies", "$totalCopies"] } },
      { $inc: { availableCopies: 1 } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: `"${borrow.bookTitle}" returned successfully!`,
      bookId: borrow.bookId,
      availableCopies: updatedBook ? updatedBook.availableCopies : null
    });
  } catch (err) {
    next(err);
  }
});

/* ================= USER BORROW HISTORY ================= */

app.get("/my-borrows", authMiddleware, async (req, res, next) => {
  try {
    const borrows = await Borrow.find({ userId: req.user.id })
      .sort({ returned: 1, dueDate: 1 });

    return res.json({ success: true, borrows });
  } catch (err) {
    next(err);
  }
});

/* ================= CENTRALIZED ERROR HANDLING MIDDLEWARE ================= */

// 404 Route Not Found Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Centralized Error Handler caught:", err.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(NODE_ENV === "development" ? { stack: err.stack } : {})
  });
});

/* ================= SERVER STARTUP ================= */

let server = null;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { app, server, mongoose, User, Book, Borrow };