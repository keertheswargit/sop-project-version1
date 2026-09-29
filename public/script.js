let selectedRole = "student";
let activeService = "Ironing";

// Catalog of dress items for ironing
const DRESS_ITEMS = [
  { id: "shirt", name: "Shirt", price: 10 },
  { id: "pants", name: "Pants / Trousers", price: 10 },
  { id: "tshirt", name: "T-Shirt", price: 10 },
  { id: "dress", name: "Dress / Kurti", price: 15 },
  { id: "saree", name: "Saree", price: 25 },
  { id: "bedsheet", name: "Bedsheet", price: 20 },
  { id: "towel", name: "Towel", price: 10 },
  { id: "other", name: "Other Clothes", price: 10 }
];

let dressQuantities = {};
DRESS_ITEMS.forEach(it => { dressQuantities[it.id] = 0; });

// Catalog of store items including user-requested items
const STORE_ITEMS = [
  { id: "chocosticks", name: "Choco Sticks", price: 2, category: "Treats" },
  { id: "chocofills", name: "Dark Fantasy Chocofills", price: 5, category: "Biscuits" },
  { id: "chocolates_5", name: "Chocolates (Perk / Munch / 5-Star)", price: 5, category: "Chocolates" },
  { id: "dairymilk", name: "Cadbury Dairy Milk", price: 10, category: "Chocolates" },
  { id: "kitkat", name: "KitKat Chocolate", price: 20, category: "Chocolates" },
  { id: "snacks", name: "Snacks Box / Potato Chips", price: 30, category: "Snacks" },
  { id: "cavin_choco", name: "Cavin's Milkshake (Chocolate)", price: 40, category: "Beverages" },
  { id: "cavin_straw", name: "Cavin's Milkshake (Strawberry)", price: 40, category: "Beverages" },
  { id: "cavin_vanilla", name: "Cavin's Milkshake (Vanilla)", price: 40, category: "Beverages" },
  { id: "cold_drink", name: "Cold Drink (Can)", price: 20, category: "Beverages" },
  { id: "water_bottle", name: "Mineral Water (1L)", price: 15, category: "Beverages" },
  { id: "stationery", name: "Stationery Pack", price: 50, category: "Stationery" }
];

let storeQuantities = {};
STORE_ITEMS.forEach(it => { storeQuantities[it.id] = 0; });

// Active state tracking
let hasActiveLaundry = false;
let hasActiveStore = false;

// Rejection modal context
let pendingRejectLaundryId = null;
let pendingRejectStoreId = null;

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
  document.getElementById("laundry-active-status-banner").classList.add("hidden");
  document.getElementById("store-active-status-banner").classList.add("hidden");

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

// Dashboard router
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
    const staffLabel = document.getElementById("laundry-staff-username-label");
    if (staffLabel) staffLabel.textContent = user.username;
    laundryStaffSec.classList.remove("hidden");
    fetchLaundryRequests();
    fetchLaundryHistory("today");
  } else if (user.role === "store_staff") {
    const storeLabel = document.getElementById("store-staff-username-label");
    if (storeLabel) storeLabel.textContent = user.username;
    storeStaffSec.classList.remove("hidden");
    fetchStoreOrders();
    fetchStoreHistory("today");
  } else if (user.role === "staff") {
    // General staff sees both
    const staffLabel = document.getElementById("laundry-staff-username-label");
    if (staffLabel) staffLabel.textContent = user.username;
    const storeLabel = document.getElementById("store-staff-username-label");
    if (storeLabel) storeLabel.textContent = user.username;
    laundryStaffSec.classList.remove("hidden");
    storeStaffSec.classList.remove("hidden");
    fetchLaundryRequests();
    fetchLaundryHistory("today");
    fetchStoreOrders();
    fetchStoreHistory("today");
  } else {
    // Student View
    walletSec.classList.remove("hidden");
    laundrySec.classList.remove("hidden");
    storeSec.classList.remove("hidden");
    txSec.classList.remove("hidden");

    initDressCollection();
    initStoreCatalog();
    setLaundryService("Ironing");
    fetchStudentData(user.username);
    fetchTransactionHistory(user.username);
    fetchStudentActiveStatus(user.username);
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
        const isCredit = tx.transaction_type === 'CREDIT';
        const amountColor = isCredit ? '#27ae60' : '#e74c3c';
        const amountPrefix = isCredit ? '+₹' : '-₹';
        row.innerHTML = `
          <td>${date}</td>
          <td><strong>${tx.transaction_type}</strong></td>
          <td>${tx.description}</td>
          <td style="color: ${amountColor}; font-weight: 600;">${amountPrefix}${parseFloat(tx.amount).toFixed(2)}</td>
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

// Fetch Active Status: handles "cannot order for laundry if already laundry takes place"
// and "in store after confirming order only we can place another order"
async function fetchStudentActiveStatus(username) {
  try {
    const res = await fetch(`/api/student/${username}/status`);
    const data = await res.json();
    if (!data.success) return;

    // --- LAUNDRY ACTIVE STATUS ---
    const laundryBanner = document.getElementById("laundry-active-status-banner");
    const laundrySubmitBtn = document.getElementById("laundry-submit-btn");

    if (data.pendingLaundry) {
      hasActiveLaundry = true;
      laundryBanner.className = "status-alert-box pending";
      laundryBanner.innerHTML = `
        <strong>⚠️ Active Laundry Request in Progress (Token: #${data.pendingLaundry.token_number})</strong><br>
        Service: <strong>${data.pendingLaundry.service_type}</strong> | 
        ${data.pendingLaundry.quantity ? 'Collection: ' + data.pendingLaundry.quantity + ' pcs (' + data.pendingLaundry.cloth_type + ')' : 'Weight: ' + (data.pendingLaundry.weight_kg || 5) + ' kg'} | 
        Amount: ₹${parseFloat(data.pendingLaundry.amount).toFixed(2)}<br>
        <span style="display:inline-block; margin-top:0.3rem;">Status: <span style="background:#f59e0b; color:white; padding:2px 8px; border-radius:10px; font-size:0.8rem; font-weight:bold;">PENDING</span> (Awaiting Laundry Desk action)</span><br>
        <small style="color: #92400e; font-weight: 600; display:inline-block; margin-top:0.3rem;">
          Notice: You cannot place a new laundry request while your current request is active.
        </small>
      `;
      laundryBanner.classList.remove("hidden");
      laundrySubmitBtn.disabled = true;
      laundrySubmitBtn.textContent = "Laundry Request Already Active";

      // Also populate the token display box
      const tokenDisplay = document.getElementById("token-display");
      document.getElementById("token-display-title").textContent = "Active Laundry Token";
      document.getElementById("token-number").textContent = data.pendingLaundry.token_number;
      document.getElementById("token-display-details").textContent = 
        `${data.pendingLaundry.service_type} - ${data.pendingLaundry.cloth_type || (data.pendingLaundry.weight_kg + ' kg')} (₹${parseFloat(data.pendingLaundry.amount).toFixed(2)})`;
      document.getElementById("token-display-help").textContent = "Submit clothes with this token to the laundry desk.";
      tokenDisplay.classList.remove("hidden");
    } else {
      hasActiveLaundry = false;
      laundrySubmitBtn.disabled = false;
      laundrySubmitBtn.textContent = "Generate Laundry Token";

      // Check if latest request was REJECTED with reasons text box
      if (data.latestLaundry && data.latestLaundry.status === "REJECTED") {
        laundryBanner.className = "status-alert-box rejected";
        laundryBanner.innerHTML = `
          <strong>❌ Previous Laundry Request #${data.latestLaundry.token_number} was REJECTED</strong><br>
          Reason: <strong>${data.latestLaundry.rejection_reason || "Not specified by staff"}</strong><br>
          <small>No amount was debited from your card. You may now submit a new laundry collection.</small>
        `;
        laundryBanner.classList.remove("hidden");
      } else {
        laundryBanner.classList.add("hidden");
      }
    }

    // --- STORE ACTIVE STATUS ---
    const storeBanner = document.getElementById("store-active-status-banner");
    const storeSubmitBtn = document.getElementById("store-submit-btn");

    if (data.pendingStore) {
      hasActiveStore = true;
      storeBanner.className = "status-alert-box pending";
      storeBanner.innerHTML = `
        <strong>⏳ Pending Store Order (Order: #${data.pendingStore.order_token})</strong><br>
        Items: <strong>${data.pendingStore.item_name}</strong> | 
        Total: ₹${parseFloat(data.pendingStore.total_amount).toFixed(2)}<br>
        <span style="display:inline-block; margin-top:0.3rem;">Status: <span style="background:#f59e0b; color:white; padding:2px 8px; border-radius:10px; font-size:0.8rem; font-weight:bold;">PENDING</span> (Awaiting Counter confirmation)</span><br>
        <small style="color: #92400e; font-weight: 600; display:inline-block; margin-top:0.3rem;">
          Notice: You can place another store order only after this order is confirmed by store staff.
        </small>
      `;
      storeBanner.classList.remove("hidden");
      storeSubmitBtn.disabled = true;
      storeSubmitBtn.textContent = "Awaiting Order Confirmation";

      // Also populate the store order display box
      const storeDisplay = document.getElementById("store-order-display");
      document.getElementById("store-order-title").textContent = "Pending Store Order";
      document.getElementById("store-order-token").textContent = data.pendingStore.order_token;
      document.getElementById("store-order-details").textContent = 
        `${data.pendingStore.item_name} (Total: ₹${parseFloat(data.pendingStore.total_amount).toFixed(2)})`;
      document.getElementById("store-order-help").textContent = "Show this token to store staff. Balance is debited upon order confirmation.";
      storeDisplay.classList.remove("hidden");
    } else {
      hasActiveStore = false;
      storeSubmitBtn.disabled = false;
      updateStoreCart();

      // Check if latest store order was REJECTED
      if (data.latestStore && data.latestStore.status === "REJECTED") {
        storeBanner.className = "status-alert-box rejected";
        storeBanner.innerHTML = `
          <strong>❌ Previous Store Order #${data.latestStore.order_token} was REJECTED</strong><br>
          Reason: <strong>${data.latestStore.rejection_reason || "Out of Stock"}</strong><br>
          <small>No amount was debited. You can now place a new store order.</small>
        `;
        storeBanner.classList.remove("hidden");
      } else {
        storeBanner.classList.add("hidden");
      }
    }

  } catch (err) {
    console.error("Fetch student active status error:", err);
  }
}

// ----------------- LAUNDRY DRESS COLLECTION UI -----------------

function initDressCollection() {
  const container = document.getElementById("ironing-dress-list");
  if (!container) return;
  container.innerHTML = "";

  DRESS_ITEMS.forEach(item => {
    const row = document.createElement("div");
    row.className = "collection-item-row";
    row.id = `dress-row-${item.id}`;
    if (dressQuantities[item.id] > 0) row.classList.add("selected");

    row.innerHTML = `
      <div class="collection-item-info">
        <span class="collection-item-name">${item.name}</span>
        <span class="collection-item-rate">₹${item.price} / pc</span>
      </div>
      <div class="collection-item-stepper">
        <button type="button" class="mini-stepper-btn" onclick="adjustDressQty('${item.id}', -1)">−</button>
        <span id="dress-qty-${item.id}" class="mini-stepper-val">${dressQuantities[item.id]}</span>
        <button type="button" class="mini-stepper-btn" onclick="adjustDressQty('${item.id}', 1)">+</button>
      </div>
    `;
    container.appendChild(row);
  });
}

function adjustDressQty(itemId, delta) {
  const current = dressQuantities[itemId] || 0;
  const updated = Math.max(0, current + delta);
  dressQuantities[itemId] = updated;

  const countSpan = document.getElementById(`dress-qty-${itemId}`);
  if (countSpan) countSpan.textContent = updated;

  const row = document.getElementById(`dress-row-${itemId}`);
  if (row) {
    row.classList.toggle("selected", updated > 0);
  }

  calculateLaundryPrice();
}

function setLaundryService(service) {
  activeService = service;

  document.querySelectorAll(".service-pill-group .pill-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.textContent.trim() === service);
  });

  const weightGroup = document.getElementById("weight-group");
  const clothGroup = document.getElementById("cloth-type-group");

  if (service === "Ironing") {
    weightGroup.classList.add("hidden");
    clothGroup.classList.remove("hidden");
  } else {
    // Wash Only or Wash & Dry
    weightGroup.classList.remove("hidden");
    clothGroup.classList.add("hidden");
  }

  calculateLaundryPrice();
}

function calculateLaundryPrice() {
  let total = 0;

  if (activeService === "Ironing") {
    let totalPcs = 0;
    const summaryParts = [];

    DRESS_ITEMS.forEach(item => {
      const qty = dressQuantities[item.id] || 0;
      if (qty > 0) {
        total += qty * item.price;
        totalPcs += qty;
        summaryParts.push(`${qty}x ${item.name}`);
      }
    });

    const summaryTextEl = document.getElementById("ironing-collection-summary-text");
    const totalPcsEl = document.getElementById("ironing-total-pcs");

    if (summaryTextEl) {
      summaryTextEl.textContent = summaryParts.length > 0 ? summaryParts.join(", ") : "None selected";
    }
    if (totalPcsEl) {
      totalPcsEl.textContent = `${totalPcs} pcs`;
    }
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

  // Check if laundry already takes place
  if (hasActiveLaundry) {
    alert("You already have an active laundry request in progress. Please wait until it is processed or rejected before placing a new one.");
    return;
  }

  const amount = parseFloat(document.getElementById("laundry-price").textContent);
  const weight = document.getElementById("laundry-weight").value;

  let clothTypeSummary = null;
  let totalQuantity = null;

  if (activeService === "Ironing") {
    const selectedItems = [];
    let count = 0;
    DRESS_ITEMS.forEach(it => {
      const q = dressQuantities[it.id] || 0;
      if (q > 0) {
        count += q;
        selectedItems.push(`${q}x ${it.name}`);
      }
    });

    if (count === 0) {
      alert("Please select at least 1 dress item for ironing.");
      return;
    }

    clothTypeSummary = selectedItems.join(", ");
    totalQuantity = count;
  }

  try {
    const res = await fetch("/api/laundry/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username,
        service: activeService,
        weight: activeService === "Ironing" ? null : weight,
        cloth_type: clothTypeSummary,
        quantity: totalQuantity,
        amount: amount
      }),
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById("token-display-title").textContent = "Token Generated Successfully!";
      document.getElementById("token-number").textContent = data.tokenNumber;
      document.getElementById("token-display-details").textContent = 
        `${activeService} - ${clothTypeSummary || (weight + ' kg')} (₹${amount.toFixed(2)})`;
      document.getElementById("token-display-help").textContent = "Submit clothes with this token. Amount will be debited on laundry staff approval.";
      document.getElementById("token-display").classList.remove("hidden");
      alert(data.message);

      // Reset dress quantities
      DRESS_ITEMS.forEach(it => { dressQuantities[it.id] = 0; });
      initDressCollection();
      calculateLaundryPrice();

      // Refresh active status
      fetchStudentActiveStatus(user.username);
    } else {
      alert("Error: " + data.message);
    }
  } catch (err) {
    console.error("Laundry error:", err);
    alert("Could not generate laundry token");
  }
}

// ----------------- STORE SERVICE & CART UI -----------------

function initStoreCatalog() {
  const grid = document.getElementById("store-catalog-grid");
  if (!grid) return;
  grid.innerHTML = "";

  STORE_ITEMS.forEach(item => {
    const card = document.createElement("div");
    card.className = "store-catalog-card";
    card.id = `store-card-${item.id}`;
    if (storeQuantities[item.id] > 0) card.classList.add("in-cart");

    card.innerHTML = `
      <div class="store-card-info">
        <span class="store-card-category">${item.category}</span>
        <span class="store-card-name">${item.name}</span>
        <span class="store-card-price">₹${item.price.toFixed(2)}</span>
      </div>
      <div class="store-card-stepper">
        <button type="button" class="mini-stepper-btn" onclick="adjustStoreQty('${item.id}', -1)">−</button>
        <span id="store-qty-${item.id}" class="mini-stepper-val">${storeQuantities[item.id] || 0}</span>
        <button type="button" class="mini-stepper-btn" onclick="adjustStoreQty('${item.id}', 1)">+</button>
      </div>
    `;
    grid.appendChild(card);
  });

  updateStoreCart();
}

function adjustStoreQty(itemId, delta) {
  const current = storeQuantities[itemId] || 0;
  const updated = Math.max(0, current + delta);
  storeQuantities[itemId] = updated;

  const countSpan = document.getElementById(`store-qty-${itemId}`);
  if (countSpan) countSpan.textContent = updated;

  const card = document.getElementById(`store-card-${itemId}`);
  if (card) {
    card.classList.toggle("in-cart", updated > 0);
  }

  updateStoreCart();
}

function updateStoreCart() {
  const cartList = document.getElementById("store-cart-items");
  const totalItemsBadge = document.getElementById("cart-total-items-badge");
  const priceDisplay = document.getElementById("store-price");
  const submitBtn = document.getElementById("store-submit-btn");

  if (!cartList) return;
  cartList.innerHTML = "";

  let totalCount = 0;
  let totalPrice = 0;

  STORE_ITEMS.forEach(item => {
    const qty = storeQuantities[item.id] || 0;
    if (qty > 0) {
      totalCount += qty;
      const subtotal = qty * item.price;
      totalPrice += subtotal;

      const itemRow = document.createElement("div");
      itemRow.className = "cart-item-row";
      itemRow.innerHTML = `
        <div class="cart-item-left">
          <span class="cart-item-qty">${qty}x</span>
          <span class="cart-item-name">${item.name}</span>
        </div>
        <span class="cart-item-price">₹${subtotal.toFixed(2)}</span>
      `;
      cartList.appendChild(itemRow);
    }
  });

  if (totalCount === 0) {
    cartList.innerHTML = `<p class="empty-cart-msg">No items added yet. Click (+) on any item above to add to your order.</p>`;
  }

  if (totalItemsBadge) totalItemsBadge.textContent = `${totalCount} items`;
  if (priceDisplay) priceDisplay.textContent = totalPrice.toFixed(2);

  if (!hasActiveStore && submitBtn) {
    submitBtn.textContent = totalCount > 0 ? `Place Store Order (${totalCount} items - ₹${totalPrice.toFixed(2)})` : "Place Store Order";
  }
}

// Student places store order (Multi-item)
async function processStoreOrder(event) {
  event.preventDefault();
  const user = JSON.parse(sessionStorage.getItem("smart_hostel_user"));

  // Check if store order already takes place
  if (hasActiveStore) {
    alert("You already have an order pending at the store counter. You can place another order only after this order is confirmed.");
    return;
  }

  const selectedItems = [];
  let totalCount = 0;
  let totalAmount = 0;

  STORE_ITEMS.forEach(it => {
    const q = storeQuantities[it.id] || 0;
    if (q > 0) {
      totalCount += q;
      totalAmount += q * it.price;
      selectedItems.push(`${q}x ${it.name}`);
    }
  });

  if (totalCount === 0) {
    alert("Please select at least 1 item from the store catalog to place an order.");
    return;
  }

  // Check balance
  const currentBalance = parseFloat(document.getElementById("wallet-balance").textContent) || 0;
  if (currentBalance < totalAmount) {
    alert(`Insufficient wallet balance. Total is ₹${totalAmount.toFixed(2)} but your balance is ₹${currentBalance.toFixed(2)}.`);
    return;
  }

  const itemSummary = selectedItems.join(", ");

  try {
    const res = await fetch("/api/store/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: user.username,
        item_name: itemSummary,
        quantity: totalCount,
        total_amount: totalAmount
      }),
    });

    const data = await res.json();

    if (data.success) {
      document.getElementById("store-order-title").textContent = "Store Order Placed!";
      document.getElementById("store-order-token").textContent = data.orderToken;
      document.getElementById("store-order-details").textContent = `${itemSummary} (Total: ₹${totalAmount.toFixed(2)})`;
      document.getElementById("store-order-help").textContent = "Show this token to store staff. Balance is debited upon order confirmation.";
      document.getElementById("store-order-display").classList.remove("hidden");
      alert(data.message);

      // Reset store quantities
      STORE_ITEMS.forEach(it => { storeQuantities[it.id] = 0; });
      initStoreCatalog();

      // Refresh active status
      fetchStudentActiveStatus(user.username);
    } else {
      alert("Error: " + data.message);
    }
  } catch (err) {
    console.error("Store error:", err);
    alert("Could not place store order");
  }
}

// ----------------- LAUNDRY STAFF DASHBOARD -----------------

async function fetchLaundryRequests() {
  try {
    const res = await fetch("/api/staff/laundry-requests");
    const data = await res.json();
    const tbody = document.getElementById("laundry-requests-body");
    tbody.innerHTML = "";

    if (data.success && data.requests.length > 0) {
      data.requests.forEach((req) => {
        const details = req.service_type === "Ironing" 
          ? `${req.quantity} pcs (${req.cloth_type})` 
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
            <button class="btn-reject" onclick="openLaundryRejectModal(${req.id}, '${req.token_number}', '${req.username}', '${encodeURIComponent(details)}')">Reject</button>
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
    fetchLaundryHistory();
  } catch (err) {
    console.error("Approve error:", err);
  }
}

// Laundry Reject Modal Functions
function openLaundryRejectModal(requestId, tokenNumber, username, encodedDetails) {
  pendingRejectLaundryId = requestId;
  document.getElementById("reject-modal-token").textContent = tokenNumber;
  document.getElementById("reject-modal-student").textContent = username;
  document.getElementById("reject-modal-details").textContent = decodeURIComponent(encodedDetails);
  document.getElementById("laundry-reject-reason-input").value = "";
  document.getElementById("laundry-reject-modal").classList.remove("hidden");
  document.getElementById("laundry-reject-reason-input").focus();
}

function closeLaundryRejectModal() {
  pendingRejectLaundryId = null;
  document.getElementById("laundry-reject-modal").classList.add("hidden");
}

function setLaundryRejectReason(reason) {
  document.getElementById("laundry-reject-reason-input").value = reason;
}

async function confirmLaundryReject() {
  if (!pendingRejectLaundryId) return;
  const reason = document.getElementById("laundry-reject-reason-input").value.trim();

  if (!reason) {
    alert("Please enter a reason for rejecting this laundry request.");
    return;
  }

  try {
    const res = await fetch("/api/staff/laundry-reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: pendingRejectLaundryId,
        reason: reason
      }),
    });

    const data = await res.json();
    closeLaundryRejectModal();

    if (data.success) {
      alert(data.message);
      fetchLaundryRequests();
      fetchLaundryHistory();
    } else {
      alert("Error: " + data.message);
    }
  } catch (err) {
    console.error("Laundry reject error:", err);
    alert("Failed to reject laundry request");
  }
}

// ----------------- STORE STAFF DASHBOARD -----------------

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
          <td>${order.quantity} pcs</td>
          <td>₹${parseFloat(order.total_amount).toFixed(2)}</td>
          <td>
            <button class="btn-approve" onclick="approveStoreOrder(${order.id})">Approve & Debit</button>
            <button class="btn-reject" onclick="openStoreRejectModal(${order.id}, '${order.order_token}', '${order.username}', '${encodeURIComponent(order.item_name)}')">Reject</button>
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
    fetchStoreHistory();
  } catch (err) {
    console.error("Store approve error:", err);
  }
}

// Store Reject Modal Functions
function openStoreRejectModal(orderId, orderToken, username, encodedDetails) {
  pendingRejectStoreId = orderId;
  document.getElementById("store-reject-modal-token").textContent = orderToken;
  document.getElementById("store-reject-modal-student").textContent = username;
  document.getElementById("store-reject-modal-details").textContent = decodeURIComponent(encodedDetails);
  document.getElementById("store-reject-reason-input").value = "";
  document.getElementById("store-reject-modal").classList.remove("hidden");
  document.getElementById("store-reject-reason-input").focus();
}

function closeStoreRejectModal() {
  pendingRejectStoreId = null;
  document.getElementById("store-reject-modal").classList.add("hidden");
}

function setStoreRejectReason(reason) {
  document.getElementById("store-reject-reason-input").value = reason;
}

async function confirmStoreReject() {
  if (!pendingRejectStoreId) return;
  const reason = document.getElementById("store-reject-reason-input").value.trim() || "Out of Stock";

  try {
    const res = await fetch("/api/staff/store-reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: pendingRejectStoreId,
        reason: reason
      }),
    });

    const data = await res.json();
    closeStoreRejectModal();

    if (data.success) {
      alert(data.message);
      fetchStoreOrders();
      fetchStoreHistory();
    } else {
      alert("Error: " + data.message);
    }
  } catch (err) {
    console.error("Store reject error:", err);
    alert("Failed to reject store order");
  }
}

// ----------------- STAFF TRANSACTION HISTORY (TODAY / ALL) -----------------

let currentLaundryFilter = "today";
let currentStoreFilter = "today";

async function fetchLaundryHistory(filter) {
  if (filter) currentLaundryFilter = filter;
  try {
    const res = await fetch(`/api/staff/laundry-history?filter=${currentLaundryFilter}`);
    const data = await res.json();
    const tbody = document.getElementById("laundry-history-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    // Update metrics
    if (data.summary) {
      document.getElementById("laundry-metric-total").textContent = data.summary.total_today || 0;
      document.getElementById("laundry-metric-approved").textContent = data.summary.approved_today || 0;
      document.getElementById("laundry-metric-rejected").textContent = data.summary.rejected_today || 0;
      document.getElementById("laundry-metric-revenue").textContent = parseFloat(data.summary.revenue_today || 0).toFixed(2);
    }

    if (data.success && data.history.length > 0) {
      data.history.forEach((tx) => {
        const date = new Date(tx.created_at).toLocaleString();
        const isApproved = tx.status === "APPROVED";
        const statusClass = isApproved ? "approved" : "rejected";
        const remarks = isApproved ? "Debit Confirmed" : `Rejected: ${tx.rejection_reason || "Not specified"}`;
        const details = tx.service_type === "Ironing" 
          ? `${tx.quantity || 1} pcs (${tx.cloth_type || "N/A"})` 
          : `${tx.weight_kg || 5} kg`;

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${date}</td>
          <td><strong>${tx.token_number}</strong></td>
          <td>${tx.username}</td>
          <td>${tx.service_type} - ${details}</td>
          <td>₹${parseFloat(tx.amount).toFixed(2)}</td>
          <td><span class="status-pill ${statusClass}">${tx.status}</span></td>
          <td style="color: ${isApproved ? '#2d6a4f' : '#b91c1c'}; font-size: 0.88rem;">${remarks}</td>
        `;
        tbody.appendChild(row);
      });
    } else {
      const msg = currentLaundryFilter === "today" 
        ? "No laundry transactions recorded today." 
        : "No laundry transactions found.";
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">${msg}</td></tr>`;
    }
  } catch (err) {
    console.error("Fetch laundry history error:", err);
  }
}

function switchLaundryHistoryFilter(filter) {
  currentLaundryFilter = filter;
  const todayBtn = document.getElementById("laundry-filter-today-btn");
  const allBtn = document.getElementById("laundry-filter-all-btn");
  const label = document.getElementById("laundry-history-title-label");

  if (todayBtn) todayBtn.classList.toggle("active", filter === "today");
  if (allBtn) allBtn.classList.toggle("active", filter === "all");
  if (label) label.textContent = filter === "today" ? "Today" : "All History";

  fetchLaundryHistory(filter);
}

async function fetchStoreHistory(filter) {
  if (filter) currentStoreFilter = filter;
  try {
    const res = await fetch(`/api/staff/store-history?filter=${currentStoreFilter}`);
    const data = await res.json();
    const tbody = document.getElementById("store-history-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    // Update metrics
    if (data.summary) {
      document.getElementById("store-metric-total").textContent = data.summary.total_today || 0;
      document.getElementById("store-metric-approved").textContent = data.summary.approved_today || 0;
      document.getElementById("store-metric-rejected").textContent = data.summary.rejected_today || 0;
      document.getElementById("store-metric-revenue").textContent = parseFloat(data.summary.revenue_today || 0).toFixed(2);
    }

    if (data.success && data.history.length > 0) {
      data.history.forEach((tx) => {
        const date = new Date(tx.created_at).toLocaleString();
        const isApproved = tx.status === "APPROVED";
        const statusClass = isApproved ? "approved" : "rejected";
        const remarks = isApproved ? "Debit Confirmed" : `Rejected: ${tx.rejection_reason || "Out of Stock"}`;

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${date}</td>
          <td><strong>${tx.order_token}</strong></td>
          <td>${tx.username}</td>
          <td>${tx.item_name}</td>
          <td>${tx.quantity} pcs</td>
          <td>₹${parseFloat(tx.total_amount).toFixed(2)}</td>
          <td><span class="status-pill ${statusClass}">${tx.status}</span></td>
          <td style="color: ${isApproved ? '#2d6a4f' : '#b91c1c'}; font-size: 0.88rem;">${remarks}</td>
        `;
        tbody.appendChild(row);
      });
    } else {
      const msg = currentStoreFilter === "today" 
        ? "No store transactions recorded today." 
        : "No store transactions found.";
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">${msg}</td></tr>`;
    }
  } catch (err) {
    console.error("Fetch store history error:", err);
  }
}

function switchStoreHistoryFilter(filter) {
  currentStoreFilter = filter;
  const todayBtn = document.getElementById("store-filter-today-btn");
  const allBtn = document.getElementById("store-filter-all-btn");
  const label = document.getElementById("store-history-title-label");

  if (todayBtn) todayBtn.classList.toggle("active", filter === "today");
  if (allBtn) allBtn.classList.toggle("active", filter === "all");
  if (label) label.textContent = filter === "today" ? "Today" : "All History";

  fetchStoreHistory(filter);
}