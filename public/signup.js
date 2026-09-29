document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");
  const usernameInput = document.getElementById("reg-username");
  const passwordInput = document.getElementById("reg-password");
  const confirmPasswordInput = document.getElementById("reg-confirm-password");
  const errorElement = document.getElementById("signup-error");
  const successElement = document.getElementById("signup-success");
  const submitBtn = document.getElementById("reg-submit-btn");

  const ruleLen = document.getElementById("rule-len");
  const ruleUpper = document.getElementById("rule-upper");
  const ruleLower = document.getElementById("rule-lower");
  const ruleNum = document.getElementById("rule-num");
  const ruleSpecial = document.getElementById("rule-special");

  function evaluatePassword(pwd) {
    return {
      len: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      num: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
  }

  function updateRule(elem, isValid, text) {
    if (!elem) return;
    if (isValid) {
      elem.className = "valid";
      elem.innerHTML = `<span>✓</span> ${text}`;
    } else {
      elem.className = "invalid";
      elem.innerHTML = `<span>○</span> ${text}`;
    }
  }

  // Real-time password requirement checklist
  passwordInput.addEventListener("input", () => {
    const pwd = passwordInput.value;
    const checks = evaluatePassword(pwd);

    updateRule(ruleLen, checks.len, "At least 8 characters");
    updateRule(ruleUpper, checks.upper, "At least 1 uppercase letter (A-Z)");
    updateRule(ruleLower, checks.lower, "At least 1 lowercase letter (a-z)");
    updateRule(ruleNum, checks.num, "At least 1 number (0-9)");
    updateRule(ruleSpecial, checks.special, "At least 1 special character (!@#$%^&*...)");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorElement.textContent = "";
    successElement.textContent = "";

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!username) {
      errorElement.textContent = "Please enter a valid student username or roll number.";
      usernameInput.focus();
      return;
    }

    const checks = evaluatePassword(password);
    if (!checks.len || !checks.upper || !checks.lower || !checks.num || !checks.special) {
      errorElement.textContent = "Please ensure your password meets all strong password requirements.";
      passwordInput.focus();
      return;
    }

    if (password !== confirmPassword) {
      errorElement.textContent = "Passwords do not match. Please re-enter.";
      confirmPasswordInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Registering...";

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        successElement.textContent = data.message || "Registration successful! Redirecting to login...";
        submitBtn.textContent = "Registered!";
        setTimeout(() => {
          window.location.href = "/index.html";
        }, 1500);
      } else {
        errorElement.textContent = data.message || "Registration failed. Please try again.";
        submitBtn.disabled = false;
        submitBtn.textContent = "Register Account";
      }
    } catch (err) {
      console.error("Registration error:", err);
      errorElement.textContent = "Network error: Unable to connect to server. Please try again later.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Register Account";
    }
  });
});
