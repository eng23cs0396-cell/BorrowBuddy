const http = require("http");
const assert = require("assert");
const { app, mongoose, User, Book, Borrow } = require("../server");

let testServer;
let port;
let baseUrl;

// Helper to make HTTP requests against the test server
function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: "127.0.0.1",
      port: port,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": token } : {}),
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {})
      }
    }, res => {
      let resBody = "";
      res.on("data", chunk => resBody += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resBody) });
        } catch (e) {
          resolve({ status: res.statusCode, body: resBody });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runAllTests() {
  console.log("=================================================");
  console.log("      LIBSHARE AUTOMATED TEST SUITE              ");
  console.log("=================================================\n");

  // 1. Start ephemeral HTTP server on random free port
  await new Promise((resolve) => {
    testServer = app.listen(0, "127.0.0.1", () => {
      port = testServer.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[SETUP] Test server running on port ${port}`);
      resolve();
    });
  });

  // Wait for MongoDB connection if not ready
  if (mongoose.connection.readyState !== 1) {
    console.log("[SETUP] Waiting for MongoDB connection...");
    await new Promise(r => mongoose.connection.once("connected", r));
  }
  console.log("[SETUP] MongoDB connected.\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    process.stdout.write(`• ${name}... `);
    try {
      await fn();
      console.log("\x1b[32mPASSED\x1b[0m");
      passed++;
    } catch (err) {
      console.log("\x1b[31mFAILED\x1b[0m");
      console.error("  Error:", err.message);
      if (err.actual !== undefined && err.expected !== undefined) {
        console.error(`  Expected: ${err.expected}, Actual: ${err.actual}`);
      }
      failed++;
    }
  }

  const timestamp = Date.now();
  const studentEmail = `student_${timestamp}@test.com`;
  const adminEmail = `admin_${timestamp}@test.com`;
  let studentToken = "";
  let adminToken = "";
  let sampleBookId = "";

  try {
    /* ------------------------------------------------------------------ */
    /* 1. INPUT VALIDATION TESTS                                          */
    /* ------------------------------------------------------------------ */

    await test("Registration rejects invalid email format", async () => {
      const res = await apiRequest("POST", "/register", {
        name: "Test User",
        email: "notanemail",
        password: "password123"
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    await test("Registration rejects short password (< 4 chars)", async () => {
      const res = await apiRequest("POST", "/register", {
        name: "Test User",
        email: `shortpass_${timestamp}@test.com`,
        password: "123"
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    await test("Registration successfully creates student account", async () => {
      const res = await apiRequest("POST", "/register", {
        name: "Alice Student",
        email: studentEmail,
        password: "securepassword",
        role: "student"
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
    });

    await test("Registration rejects duplicate email", async () => {
      const res = await apiRequest("POST", "/register", {
        name: "Duplicate Alice",
        email: studentEmail,
        password: "securepassword"
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    await test("Login with wrong password returns 400 Bad Request", async () => {
      const res = await apiRequest("POST", "/login", {
        email: studentEmail,
        password: "incorrect_password"
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    await test("Login with correct credentials returns 200 OK and JWT", async () => {
      const res = await apiRequest("POST", "/login", {
        email: studentEmail,
        password: "securepassword"
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.token, "Token should be present in response");
      studentToken = res.body.token;
    });

    // Create an admin user for admin endpoints
    await apiRequest("POST", "/register", {
      name: "Admin User",
      email: adminEmail,
      password: "adminpassword",
      role: "admin"
    });
    const adminLogin = await apiRequest("POST", "/login", {
      email: adminEmail,
      password: "adminpassword"
    });
    adminToken = adminLogin.body.token;

    /* ------------------------------------------------------------------ */
    /* 2. PAGINATION & CATALOG SEARCH TESTS                              */
    /* ------------------------------------------------------------------ */

    await test("GET /books returns paginated structure with metadata", async () => {
      const res = await apiRequest("GET", "/books?page=1&limit=5");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.books), "books must be an array");
      assert.ok(res.body.pagination, "pagination metadata must be present");
      assert.strictEqual(res.body.pagination.currentPage, 1);
      assert.strictEqual(res.body.pagination.limit, 5);
      assert.ok(typeof res.body.pagination.totalBooks === "number");
    });

    await test("GET /books search handles regex special characters safely", async () => {
      const res = await apiRequest("GET", "/books?search=(C++|Java)[*+?\\");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.books));
    });

    /* ------------------------------------------------------------------ */
    /* 3. MULTI-USER CONCURRENCY (Race Condition on Last Remaining Copy)   */
    /* ------------------------------------------------------------------ */

    await test("Multi-user concurrent borrow on last copy: exactly 1 succeeds, copies = 0", async () => {
      // 1. Create a book with availableCopies = 1
      const book = await Book.create({
        title: `Concurrency Test Book ${timestamp}`,
        author: "Concurrency Author",
        totalCopies: 1,
        availableCopies: 1,
        location: "Test Shelf"
      });

      // 2. Create second user
      const user2Email = `user2_${timestamp}@test.com`;
      await apiRequest("POST", "/register", { name: "User Two", email: user2Email, password: "password123" });
      const user2Login = await apiRequest("POST", "/login", { email: user2Email, password: "password123" });
      const user2Token = user2Login.body.token;

      // 3. Fire simultaneous borrow requests
      const [res1, res2] = await Promise.all([
        apiRequest("POST", `/borrow/${book._id}`, null, studentToken),
        apiRequest("POST", `/borrow/${book._id}`, null, user2Token)
      ]);

      const successCount = [res1, res2].filter(r => r.status === 200).length;
      const failCount = [res1, res2].filter(r => r.status === 400).length;

      assert.strictEqual(successCount, 1, "Exactly one user must succeed in borrowing");
      assert.strictEqual(failCount, 1, "The other user must receive 400 out of stock");

      const bookInDb = await Book.findById(book._id);
      assert.strictEqual(bookInDb.availableCopies, 0, "availableCopies must be exactly 0, never negative");

      // Cleanup
      await Book.deleteOne({ _id: book._id });
      await Borrow.deleteMany({ bookId: book._id });
      await User.deleteOne({ email: user2Email });
    });

    /* ------------------------------------------------------------------ */
    /* 4. SAME-USER SIMULTANEOUS BORROW TEST                             */
    /* ------------------------------------------------------------------ */

    await test("Same-user simultaneous borrow: user cannot double-borrow via concurrent requests", async () => {
      // Create book with plenty of copies (5 copies)
      const book = await Book.create({
        title: `Same User Concurrency Book ${timestamp}`,
        author: "Author Multi",
        totalCopies: 5,
        availableCopies: 5,
        location: "Shelf Concurrency"
      });

      // Fire 2 simultaneous borrow requests from the EXACT SAME USER
      const [req1, req2] = await Promise.all([
        apiRequest("POST", `/borrow/${book._id}`, null, studentToken),
        apiRequest("POST", `/borrow/${book._id}`, null, studentToken)
      ]);

      const successCount = [req1, req2].filter(r => r.status === 200).length;
      const rejectCount = [req1, req2].filter(r => r.status === 400).length;

      assert.strictEqual(successCount, 1, "Only 1 borrow request from the same user may succeed");
      assert.strictEqual(rejectCount, 1, "Duplicate simultaneous borrow must be rejected");

      // Verify that availableCopies in DB decreased by exactly 1 (from 5 to 4)
      const bookInDb = await Book.findById(book._id);
      assert.strictEqual(bookInDb.availableCopies, 4, "Copies must only decrement once for the single approved loan");

      // Verify only 1 active borrow document exists in database
      const activeLoans = await Borrow.countDocuments({ bookId: book._id, userId: (await User.findOne({ email: studentEmail }))._id, returned: false });
      assert.strictEqual(activeLoans, 1, "Exactly 1 active borrow document should exist");

      // Cleanup
      await Book.deleteOne({ _id: book._id });
      await Borrow.deleteMany({ bookId: book._id });
    });

    /* ------------------------------------------------------------------ */
    /* 5. DOUBLE-RETURN TEST                                              */
    /* ------------------------------------------------------------------ */

    await test("Double-return test: returning already returned book fails and does not double-increment copies", async () => {
      // 1. Create a test book with total=3, available=2
      const book = await Book.create({
        title: `Double Return Book ${timestamp}`,
        author: "Return Author",
        totalCopies: 3,
        availableCopies: 2,
        location: "Shelf Return"
      });

      // 2. Student borrows the book (available becomes 1)
      const borrowRes = await apiRequest("POST", `/borrow/${book._id}`, null, studentToken);
      assert.strictEqual(borrowRes.status, 200);
      const borrowId = borrowRes.body.borrow._id;

      const bookAfterBorrow = await Book.findById(book._id);
      assert.strictEqual(bookAfterBorrow.availableCopies, 1);

      // 3. First return request (must succeed)
      const returnRes1 = await apiRequest("POST", `/return/${borrowId}`, null, studentToken);
      assert.strictEqual(returnRes1.status, 200);
      assert.strictEqual(returnRes1.body.success, true);

      const bookAfterReturn1 = await Book.findById(book._id);
      assert.strictEqual(bookAfterReturn1.availableCopies, 2, "Copies must increment to 2");

      // 4. Second return request for the SAME borrow (must fail)
      const returnRes2 = await apiRequest("POST", `/return/${borrowId}`, null, studentToken);
      assert.strictEqual(returnRes2.status, 400, "Second return must return 400 Bad Request");
      assert.strictEqual(returnRes2.body.success, false);

      // 5. Verify copy count did NOT increment a second time
      const bookAfterReturn2 = await Book.findById(book._id);
      assert.strictEqual(bookAfterReturn2.availableCopies, 2, "availableCopies must remain 2 and not double-increment");

      // Cleanup
      await Book.deleteOne({ _id: book._id });
      await Borrow.deleteMany({ bookId: book._id });
    });

    /* ------------------------------------------------------------------ */
    /* 6. BORROW -> RETURN -> BORROW LIFECYCLE TEST                       */
    /* ------------------------------------------------------------------ */

    await test("Borrow -> Return -> Borrow: user can borrow again after returning previous loan", async () => {
      // 1. Create test book
      const book = await Book.create({
        title: `Lifecycle Test Book ${timestamp}`,
        author: "Lifecycle Author",
        totalCopies: 2,
        availableCopies: 2,
        location: "Shelf Lifecycle"
      });

      // Step A: First Borrow
      const borrow1 = await apiRequest("POST", `/borrow/${book._id}`, null, studentToken);
      assert.strictEqual(borrow1.status, 200, "Step A: Initial borrow should succeed");
      let bookCheck = await Book.findById(book._id);
      assert.strictEqual(bookCheck.availableCopies, 1, "Available copies should drop to 1");

      // Step B: Return
      const return1 = await apiRequest("POST", `/return/${borrow1.body.borrow._id}`, null, studentToken);
      assert.strictEqual(return1.status, 200, "Step B: Return should succeed");
      bookCheck = await Book.findById(book._id);
      assert.strictEqual(bookCheck.availableCopies, 2, "Available copies should restore to 2");

      // Step C: Second Borrow of same book by same user
      const borrow2 = await apiRequest("POST", `/borrow/${book._id}`, null, studentToken);
      assert.strictEqual(borrow2.status, 200, "Step C: Subsequent borrow after return should succeed");
      bookCheck = await Book.findById(book._id);
      assert.strictEqual(bookCheck.availableCopies, 1, "Available copies should drop to 1 again");

      // Verify history contains 2 borrows: 1 returned, 1 active
      const historyRes = await apiRequest("GET", "/my-borrows", null, studentToken);
      assert.strictEqual(historyRes.status, 200);
      const userBorrows = historyRes.body.borrows.filter(b => String(b.bookId) === String(book._id));
      assert.strictEqual(userBorrows.length, 2, "History must show both loan records");
      assert.strictEqual(userBorrows.filter(b => b.returned).length, 1, "One borrow returned");
      assert.strictEqual(userBorrows.filter(b => !b.returned).length, 1, "One borrow currently active");

      // Cleanup
      await Book.deleteOne({ _id: book._id });
      await Borrow.deleteMany({ bookId: book._id });
    });

    /* ------------------------------------------------------------------ */
    /* 7. CENTRALIZED ERROR MIDDLEWARE & ROUTE HANDLING TESTS             */
    /* ------------------------------------------------------------------ */

    await test("404 handler returns structured JSON on non-existent route", async () => {
      const res = await apiRequest("GET", "/api/route-does-not-exist");
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.message.includes("not found"));
    });

    await test("Borrow with invalid ObjectId format returns 400 Bad Request", async () => {
      const res = await apiRequest("POST", "/borrow/invalid-mongodb-id-123", null, studentToken);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.message.includes("Invalid"));
    });

    await test("Return with invalid ObjectId format returns 400 Bad Request", async () => {
      const res = await apiRequest("POST", "/return/invalid-mongodb-id-456", null, studentToken);
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.ok(res.body.message.includes("Invalid"));
    });

  } finally {
    // Clean up test accounts
    await User.deleteMany({ email: { $in: [studentEmail, adminEmail] } });

    // Stop test server
    await new Promise(r => testServer.close(r));
    await mongoose.connection.close();
  }

  console.log("\n-------------------------------------------------");
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log("-------------------------------------------------");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("\x1b[32m✔ All automated tests passed successfully!\x1b[0m\n");
    process.exit(0);
  }
}

runAllTests().catch(err => {
  console.error("Test execution failed unexpectedly:", err);
  process.exit(1);
});
