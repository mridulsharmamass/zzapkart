// Seller registration + login
if (currentSeller()) location.replace("seller-dashboard.html"); // already logged in

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

function showTab(tab) {
  document.querySelectorAll(".auth-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  loginForm.classList.toggle("hidden", tab !== "login");
  registerForm.classList.toggle("hidden", tab !== "register");
}
document.querySelectorAll(".auth-tab").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
document.querySelectorAll("[data-switch]").forEach((a) =>
  a.addEventListener("click", (e) => { e.preventDefault(); showTab(a.dataset.switch); }));
if (location.hash === "#register") showTab("register");

function setErr(form, name, msg) {
  const input = form.elements[name];
  input.closest("label").querySelector(".err").textContent = msg || "";
  input.classList.toggle("invalid", !!msg);
  return !msg;
}
[loginForm, registerForm].forEach((f) => f.addEventListener("input", (e) => {
  if (e.target.classList.contains("invalid")) setErr(f, e.target.name, "");
}));
registerForm.elements.phone.addEventListener("input", (e) => (e.target.value = e.target.value.replace(/\D/g, "")));

// ---------- Register ----------
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = registerForm;
  const v = (n) => f.elements[n].value.trim();
  const email = v("email").toLowerCase();
  const exists = getSellers().some((s) => s.email === email);

  const ok = [
    setErr(f, "name", v("name").length < 2 ? "Enter your full name" : ""),
    setErr(f, "shopName", v("shopName").length < 2 ? "Enter your shop name" : ""),
    setErr(f, "email", !/^\S+@\S+\.\S+$/.test(email) ? "Enter a valid email" : exists ? "An account with this email already exists" : ""),
    setErr(f, "phone", /^[6-9]\d{9}$/.test(v("phone")) ? "" : "Enter a valid 10-digit mobile number"),
    setErr(f, "password", f.elements.password.value.length < 8 || !/\d/.test(f.elements.password.value)
      ? "At least 8 characters and 1 number" : ""),
    setErr(f, "confirm", f.elements.confirm.value !== f.elements.password.value ? "Passwords don't match" : ""),
  ].every(Boolean);
  if (!ok) { f.querySelector(".invalid")?.focus(); return; }

  const salt = crypto.getRandomValues(new Uint32Array(4)).join("-");
  const seller = {
    id: uid("S"),
    name: v("name"),
    shopName: v("shopName"),
    email,
    phone: v("phone"),
    salt,
    passwordHash: await hashPassword(f.elements.password.value, salt),
    createdAt: Date.now(),
    kyc: { status: "not_submitted" },
    subscription: null,
    autoRenew: true,
    adCredits: 0,
  };
  const list = getSellers();
  list.push(seller);
  if (!saveSellers(list)) return;
  notifySeller(seller.id, "👋 Welcome to Zzapkart Seller Hub! Complete your KYC to unlock the full dashboard.");
  setSession(seller.id);
  location.href = "seller-dashboard.html#kyc";
});

// ---------- Login ----------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = loginForm;
  const email = f.elements.email.value.trim().toLowerCase();
  const password = f.elements.password.value;
  setErr(f, "email", "");
  setErr(f, "password", "");
  if (!email || !password) {
    if (!email) setErr(f, "email", "Enter your email");
    if (!password) setErr(f, "password", "Enter your password");
    return;
  }
  const seller = getSellers().find((s) => s.email === email);
  const valid = seller && (await hashPassword(password, seller.salt)) === seller.passwordHash;
  if (!valid) {
    setErr(f, "password", "Incorrect email or password");
    return;
  }
  setSession(seller.id);
  location.href = "seller-dashboard.html";
});
