// create-users.js
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "smart_hostel",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

async function seedUsers() {
  try {
    const saltRounds = 10;

    // Define all students and staff here
    const usersToCreate = [
      // Students (₹1000 balance each)
      { username: "student1", password: "student123", role: "student", balance: 1000.00 },
      { username: "student2", password: "student123", role: "student", balance: 1000.00 },
      { username: "student3", password: "student123", role: "student", balance: 1000.00 },
      { username: "student4", password: "student123", role: "student", balance: 1000.00 },

      // Laundry Staff Desk
      { username: "staff1", password: "staff123", role: "laundry_staff", balance: 0.00 },

      // Store Counter Desk
      { username: "store1", password: "staff123", role: "store_staff", balance: 0.00 },
    ];

    for (const user of usersToCreate) {
      const hashedPassword = await bcrypt.hash(user.password, saltRounds);

      await pool.query(
        `INSERT INTO users (username, password_hash, role, balance)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (username) 
         DO UPDATE SET password_hash = $2, role = $3, balance = $4;`,
        [user.username, hashedPassword, user.role, user.balance]
      );

      console.log(`Created/Updated: ${user.username} [Role: ${user.role}]`);
    }

    console.log("\nAll users seeded successfully!");
  } catch (err) {
    console.error("Error creating users:", err);
  } finally {
    await pool.end();
  }
}

seedUsers();