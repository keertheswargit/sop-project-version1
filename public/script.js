let selectedRole = "student";
let activeService = "Ironing"; // Default matches the photo
let ironingCount = 8; // Default count matches the photo

document.addEventListener("DOMContentLoaded", () => {
  const currentUser = JSON.parse(sessionStorage.getItem("smart_hostel_user"));
  if (currentUser) {
    showDashboard(currentUser);
  } else {
    showLogin();
  }
});

function selectRole(role) {
  selectedRole = role;
  document.getElementById("btn-student").classList.toggle("active", role === "student");
  document.getElementById("btn-staff").classList.toggle("active", role === "staff");
}

function showLogin() {
  sessionStorage.removeItem("smart_hostel_user");

  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("login-error").textContent = "";

  document.getElementById("display-username").textContent = "";
  document.getElementById("display-id").textContent = "";
  document.getElementById("display-role").textContent = "";

  document.getElementById("wallet-balance").textContent = "0.00";
  document.getElementById("token-display").classList.add("hidden");
  document.getElementById("store-order-display").classList.add("hidden");

  selectRole("student");
  document.getElementById("dashboard-container").classList.add("hidden");
  document.getElementById("login-container").classList.remove("hidden");
}

function handleLogout() {
  showLogin();
}

// Authentication
async function handleLogin(event) {
  event.preventDefault();
  const usernameInput = document.getElementById("username").value.trim();
  const passwordInput = document.getElementById("password").value.trim();
  const errorElement = document.getElementById("login-error");

  errorElement.textContent = "";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameInput,
        password: passwordInput,
        role: selectedRole
      }),
    });

    const data = await response.json();

    if (data.success) {
      sessionStorage.setItem("smart_hostel_user", JSON.stringify(data.user));
      showDashboard(data.user);
    } else {
      errorElement.textContent = data.message || "Login failed";
    }
  } catch (err) {
    console.error("Login fetch error:", err);
    errorElement.textContent = "Server communication error";
  }
}

// Dashboard router based on authenticated user's role
function showDashboard(user) {
  document.getElementById("login-container").classList.add("hidden");
  document.getElementById("dashboard-container").classList.remove("hidden");

  document.getElementById("display-username").textContent = `Welcome, ${user.username}`;
  document.getElementById("display-id").textContent = user.id ? `ID: #${user.id}` : "";
  document.getElementById("display-role").textContent = user.role.toUpperCase();

  const walletSec = document.getElementById("wallet-card-section");
  const laundrySec = document.getElementById("laundry-card-section");
  const storeSec = document.getElementById("store-card-section");
  const txSec = document.getElementById("tx-card-section");
  const laundryStaffSec = document.getElementById("laundry-staff-section");
  const storeStaffSec = document.getElementById("store-staff-section");

  // Hide all sections first
  walletSec.classList.add("hidden");
  laundrySec.classList.add("hidden");
  storeSec.classList.add("hidden");
  txSec.classList.add("hidden");
  laundryStaffSec.classList.add("hidden");
  storeStaffSec.classList.add("hidden");

  if (user.role === "laundry_staff") {
    laundryStaffSec.classList.remove("hidden");
    fetchLaundryRequests();
  } else if (user.role === "store_staff") {
    storeStaffSec.classList.remove("hidden");
    fetchStoreOrders();
  } else if (user.role === "staff") {
    // General staff sees both
    laundryStaffSec.classList.remove("hidden");
    storeStaffSec.classList.remove("hidden");
    fetchLaundryRequests();
    fetchStoreOrders();
  } else {
    // Student View
    walletSec.classList.remove("hidden");
    laundrySec.classList.remove("hidden");
    storeSec.classList.remove("hidden");
    txSec.classList.remove("hidden");

    setLaundryService("Ironing");
    calculateStorePrice();
    fetchStudentData(user.username);
    fetchTransactionHistory(user.username);
  }
}

// Student Data
async function fetchStudentData(username) {
  try {
    const res = await fetch(`/api/student/${username}`);
    const data = await res.json();
    if (data.success) {
      document.getElementById("wallet-balance").textContent = parseFloat(data.user.balance).toFixed(2);
    }
  } catch (err) {
    console.error("Balance fetch error:", err);
  }
}

async function fetchTransactionHistory(username) {
  try {
    const res = await fetch(`/api/transactions/${username}`);
    const data = await res.json();
    const tbody = document.getElementById("tx-history-body");
    tbody.innerHTML = "";

    if (data.success && data.transactions.length > 0) {
      data.transactions.forEach((tx) => {
        const row = document.createElement("tr");
        const date = new Date(tx.created_at).toLocaleString();
        row.innerHTML = `
          <td>${date}</td>
          <td><strong>${tx.transaction_type}</strong></td>
          <td>${tx.description}</td>
          <td style="color: #e74c3c;">-₹${parseFloat(tx.amount).toFixed(2)}</td>
          <td>₹${parseFloat(tx.balance_after).toFixed(2)}</td>
        `;
        tbody.appendChild(row);
      });
    } else {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No transactions found.</td></tr>`;
    }
  } catch (err) {
    console.error("History fetch error:", err);
  }
}

// ----------------- LAUNDRY SERVICE UI -----------------

function setLaundryService(service) {
  activeService = service;

  document.querySelectorAll(".service-pill-group .pill-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.textContent.trim() === service);
  });

  const weightGroup = document.getElementById("weight-group");
  const clothGroup = document.getElementById("cloth-type-group");
  const quantityGroup = document.getElementById("quantity-group");

  if (service === "Ironing") {
    weightGroup.classList.add("hidden");
    clothGroup.classList.remove("hidden");
    quantityGroup.classList.remove("hidden");
  } else {
    // Wash Only or Wash & Dry
    weightGroup.classList.remove("hidden");
    clothGroup.classList.add("hidden");
    quantityGroup.classList.add("hidden");
  }

  calculateLaundryPrice();
}

function adjustCount(delta) {
  ironingCount = Math.max(1, ironingCount + delta);
  document.getElementById("stepper-count").textContent = ironingCount;
  calculateLaundryPrice();
}

function calculateLaundryPrice() {
  let total = 0;

  if (activeService === "Ironing") {
    const clothSelect = document.getElementById("cloth-type");
    const rate = parseFloat(clothSelect.options[clothSelect.selectedIndex].getAttribute("data-rate")) || 10;
    total = rate * ironingCount;
  } else if (activeService === "Wash Only") {
    const weight = parseInt(document.getElementById("laundry-weight").value);
    total = weight === 5 ? 50 : 80;
  } else if (activeService === "Wash & Dry") {
    const weight = parseInt(document.getElementById("laundry-weight").value);
    total = weight === 5 ? 75 : 120;
  }

  document.getElementById("laundry-price").textContent = total;
}

// Student submits laundry token
async function processLaundryRequest(event) {
  event.preventDefault();
  const user = JSON.parse(sessionStorage.getItem("smart_hostel_user"));
  const amount = parseFloat(document.getElementById("laundry-price").textContent);
  const weight = document.getElementById("laundry-weight").value;
  const clothType = document.getElementById("cloth-type").value;

  try {
    const res = await fetch("/api/laundry/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username,
        service: activeService,
        weight: weight,
        cloth_type: clothType,
        quantity: ironingCount,
        amount: amount
      }),
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById("token-number").textContent = data.tokenNumber;
      document.getElementById("token-display").classList.remove("hidden");
      alert(data.message);
    } else {
      alert("Error: " + data.message);
    }
  } catch (err) {
    console.error("Laundry error:", err);
    alert("Could not generate laundry token");
  }
}

// ----------------- STORE SERVICE UI -----------------

function calculateStorePrice() {
  const itemSelect = document.getElementById("store-item");
  const unitPrice = parseFloat(itemSelect.options[itemSelect.selectedIndex].getAttribute("data-price"));
  const qty = parseInt(document.getElementById("store-qty").value) || 1;
  document.getElementById("store-price").textContent = unitPrice * qty;
}

async function processStoreOrder(event) {
  event.preventDefault();
  const user = JSON.parse(sessionStorage.getItem("smart_hostel_user"));
  const itemSelect = document.getElementById("store-item");
  const itemName = itemSelect.value;
  const qty = parseInt(document.getElementById("store-qty").value) || 1;
  const total = parseFloat(document.getElementById("store-price").textContent);

  try {
    const res = await fetch("/api/store/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username,
        item_name: itemName,
        quantity: qty,
        total_amount: total
      }),
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById("store-order-token").textContent = data.orderToken;
      document.getElementById("store-order-display").classList.remove("hidden");
      alert(data.message);
    } else {
      alert("Error: " + data.message);
    }
  } catch (err) {
    console.error("Store error:", err);
    alert("Could not place store order");
  }
}

// ----------------- STAFF ACTION HANDLERS -----------------

// Laundry Staff: View & Approve
async function fetchLaundryRequests() {
  try {
    const res = await fetch("/api/staff/laundry-requests");
    const data = await res.json();
    const tbody = document.getElementById("laundry-requests-body");
    tbody.innerHTML = "";

    if (data.success && data.requests.length > 0) {
      data.requests.forEach((req) => {
        const details = req.service_type === "Ironing" 
          ? `${req.quantity}x ${req.cloth_type}` 
          : `${req.weight_kg} kg`;
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${req.token_number}</strong></td>
          <td>${req.username}</td>
          <td>${req.service_type}</td>
          <td>${details}</td>
          <td>₹${parseFloat(req.amount).toFixed(2)}</td>
          <td>
            <button class="btn-approve" onclick="approveLaundry(${req.id})">Approve & Debit</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    } else {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No pending laundry requests.</td></tr>`;
    }
  } catch (err) {
    console.error("Staff laundry error:", err);
  }
}

async function approveLaundry(requestId) {
  try {
    const res = await fetch("/api/staff/laundry-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    const data = await res.json();
    alert(data.message);
    fetchLaundryRequests();
  } catch (err) {
    console.error("Approve error:", err);
  }
}

// Store Staff: View, Approve & Reject
async function fetchStoreOrders() {
  try {
    const res = await fetch("/api/staff/store-orders");
    const data = await res.json();
    const tbody = document.getElementById("store-orders-body");
    tbody.innerHTML = "";

    if (data.success && data.orders.length > 0) {
      data.orders.forEach((order) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${order.order_token}</strong></td>
          <td>${order.username}</td>
          <td>${order.item_name}</td>
          <td>${order.quantity}</td>
          <td>₹${parseFloat(order.total_amount).toFixed(2)}</td>
          <td>
            <button class="btn-approve" onclick="approveStoreOrder(${order.id})">Approve & Debit</button>
            <button class="btn-reject" onclick="rejectStoreOrder(${order.id})">Reject (Out of Stock)</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    } else {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No pending store orders.</td></tr>`;
    }
  } catch (err) {
    console.error("Staff store error:", err);
  }
}

async function approveStoreOrder(orderId) {
  try {
    const res = await fetch("/api/staff/store-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json();
    alert(data.message);
    fetchStoreOrders();
  } catch (err) {
    console.error("Store approve error:", err);
  }
}

async function rejectStoreOrder(orderId) {
  if (!confirm("Are you sure you want to reject this order? Student balance will NOT be charged.")) return;
  try {
    const res = await fetch("/api/staff/store-reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json();
    alert(data.message);
    fetchStoreOrders();
  } catch (err) {
    console.error("Store reject error:", err);
  }
}