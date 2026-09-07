const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "smart_hostel",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

pool.query("SELECT NOW()", (err) => {
  if (err) {
    console.error("Database connection failure:", err.stack);
  } else {
    console.log("PostgreSQL connected successfully!");
  }
});

// Authentication API
app.post("/api/login", async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid username or password" });
    }

    const user = result.rows[0];

    // Role verification: student vs staff variants
    if (role === "student" && user.role !== "student") {
      return res.status(400).json({ success: false, message: "User is not a student" });
    }
    if (role === "staff" && user.role !== "laundry_staff" && user.role !== "store_staff" && user.role !== "staff") {
      return res.status(400).json({ success: false, message: "User is not authorized as staff" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ success: false, message: "Invalid username or password" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login API error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Student Profile API
app.get("/api/student/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      "SELECT id, username, role, balance FROM users WHERE username = $1 AND role = 'student'",
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Student account not found" });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Student Info API error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Student Transactions History
app.get("/api/transactions/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const userRes = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const txRes = await pool.query(
      "SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC",
      [userRes.rows[0].id]
    );
    res.json({ success: true, transactions: txRes.rows });
  } catch (err) {
    console.error("History fetch error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ----------------- LAUNDRY SERVICE -----------------

// Student creates laundry request (Ironing: pieces, Wash: kg)
app.post("/api/laundry/request", async (req, res) => {
  const { username, service, weight, cloth_type, quantity, amount } = req.body;
  const numAmount = parseFloat(amount);

  try {
    const userRes = await pool.query("SELECT id, balance FROM users WHERE username = $1", [username]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const user = userRes.rows[0];
    if (parseFloat(user.balance) < numAmount) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
    }

    const tokenNumber = "TK-" + Math.floor(1000 + Math.random() * 9000);

    // If Ironing, weight is null and quantity is parsed.
    // If Wash, quantity and cloth_type are null.
    const isIroning = service === "Ironing";
    const weightVal = isIroning ? null : (parseInt(weight) || 5);
    const clothVal = isIroning ? (cloth_type || "Shirt") : null;
    const qtyVal = isIroning ? (parseInt(quantity) || 1) : null;

    await pool.query(
      `INSERT INTO laundry_requests 
        (token_number, user_id, username, service_type, weight_kg, cloth_type, quantity, amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING')`,
      [tokenNumber, user.id, username, service, weightVal, clothVal, qtyVal, numAmount]
    );

    res.json({
      success: true,
      tokenNumber: tokenNumber,
      message: "Laundry token generated! Submit clothes to laundry desk."
    });
  } catch (err) {
    console.error("Laundry request error:", err);
    res.status(500).json({ success: false, message: "Failed to submit laundry request: " + err.message });
  }
});

// Laundry Staff: Fetch pending laundry requests
app.get("/api/staff/laundry-requests", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM laundry_requests WHERE status = 'PENDING' ORDER BY created_at DESC"
    );
    res.json({ success: true, requests: result.rows });
  } catch (err) {
    console.error("Fetch laundry requests error:", err);
    res.status(500).json({ success: false, message: "Could not fetch requests" });
  }
});

// Laundry Staff: Approve & Debit
app.post("/api/staff/laundry-approve", async (req, res) => {
  const { requestId } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reqRes = await client.query(
      "SELECT * FROM laundry_requests WHERE id = $1 FOR UPDATE",
      [requestId]
    );

    if (reqRes.rows.length === 0 || reqRes.rows[0].status !== 'PENDING') {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Request not found or already processed" });
    }

    const request = reqRes.rows[0];
    const deductAmount = parseFloat(request.amount);

    const userRes = await client.query("SELECT id, balance FROM users WHERE id = $1 FOR UPDATE", [request.user_id]);
    const user = userRes.rows[0];
    const currentBalance = parseFloat(user.balance);

    if (currentBalance < deductAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Student has insufficient balance to approve" });
    }

    const newBalance = currentBalance - deductAmount;
    await client.query("UPDATE users SET balance = $1 WHERE id = $2", [newBalance, user.id]);

    let desc = `Laundry (${request.token_number}): ${request.service_type}`;
    if (request.service_type === "Ironing") {
      desc += ` - ${request.quantity}x ${request.cloth_type}`;
    } else {
      desc += ` - ${request.weight_kg}kg`;
    }

    await client.query(
      `INSERT INTO transactions (user_id, transaction_type, description, amount, balance_after)
       VALUES ($1, 'LAUNDRY', $2, $3, $4)`,
      [user.id, desc, deductAmount, newBalance]
    );

    await client.query("UPDATE laundry_requests SET status = 'APPROVED' WHERE id = $1", [requestId]);
    await client.query("COMMIT");

    res.json({ success: true, message: `Token ${request.token_number} approved and ₹${deductAmount} debited.` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Laundry approval error:", err);
    res.status(500).json({ success: false, message: "Error approving laundry request" });
  } finally {
    client.release();
  }
});

// ----------------- STORE SERVICE -----------------

// Student creates store order
app.post("/api/store/order", async (req, res) => {
  const { username, item_name, quantity, total_amount } = req.body;
  const numAmount = parseFloat(total_amount);

  try {
    const userRes = await pool.query("SELECT id, balance FROM users WHERE username = $1", [username]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const user = userRes.rows[0];
    if (parseFloat(user.balance) < numAmount) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
    }

    const orderToken = "ST-" + Math.floor(1000 + Math.random() * 9000);

    await pool.query(
      `INSERT INTO store_orders (order_token, user_id, username, item_name, quantity, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')`,
      [orderToken, user.id, username, item_name, parseInt(quantity), numAmount]
    );

    res.json({
      success: true,
      orderToken: orderToken,
      message: "Order placed! Show order token to store counter staff."
    });
  } catch (err) {
    console.error("Store order error:", err);
    res.status(500).json({ success: false, message: "Failed to place store order" });
  }
});

// Store Staff: Fetch pending orders
app.get("/api/staff/store-orders", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM store_orders WHERE status = 'PENDING' ORDER BY created_at DESC"
    );
    res.json({ success: true, orders: result.rows });
  } catch (err) {
    console.error("Store orders fetch error:", err);
    res.status(500).json({ success: false, message: "Could not fetch orders" });
  }
});

// Store Staff: Approve & Debit
app.post("/api/staff/store-approve", async (req, res) => {
  const { orderId } = req.body;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderRes = await client.query("SELECT * FROM store_orders WHERE id = $1 FOR UPDATE", [orderId]);
    if (orderRes.rows.length === 0 || orderRes.rows[0].status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Order not found or already processed" });
    }

    const order = orderRes.rows[0];
    const deductAmount = parseFloat(order.total_amount);

    const userRes = await client.query("SELECT id, balance FROM users WHERE id = $1 FOR UPDATE", [order.user_id]);
    const user = userRes.rows[0];
    const currentBalance = parseFloat(user.balance);

    if (currentBalance < deductAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Student balance is insufficient" });
    }

    const newBalance = currentBalance - deductAmount;
    await client.query("UPDATE users SET balance = $1 WHERE id = $2", [newBalance, user.id]);

    const desc = `Store (${order.order_token}): ${order.quantity}x ${order.item_name}`;
    await client.query(
      `INSERT INTO transactions (user_id, transaction_type, description, amount, balance_after)
       VALUES ($1, 'STORE', $2, $3, $4)`,
      [user.id, desc, deductAmount, newBalance]
    );

    await client.query("UPDATE store_orders SET status = 'APPROVED' WHERE id = $1", [orderId]);
    await client.query("COMMIT");

    res.json({ success: true, message: `Order ${order.order_token} approved and debited ₹${deductAmount}.` });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Store approval error:", err);
    res.status(500).json({ success: false, message: "Failed to approve store order" });
  } finally {
    client.release();
  }
});

// Store Staff: Reject / Out of Stock
app.post("/api/staff/store-reject", async (req, res) => {
  const { orderId } = req.body;

  try {
    const result = await pool.query(
      "UPDATE store_orders SET status = 'REJECTED' WHERE id = $1 AND status = 'PENDING' RETURNING order_token",
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Order not found or already processed" });
    }

    res.json({
      success: true,
      message: `Order ${result.rows[0].order_token} rejected (Out of Stock). No money debited.`
    });
  } catch (err) {
    console.error("Store rejection error:", err);
    res.status(500).json({ success: false, message: "Failed to reject store order" });
  }
});

app.listen(PORT, () => {
  console.log(`Smart Hostel App running at http://localhost:${PORT}`);
});