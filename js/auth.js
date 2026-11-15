const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const USERS_KEY = "checkwise_users";
const SESSION_KEY = "checkwise_current_user";

// Nếu đã đăng nhập rồi thì tự về trang chủ
if (localStorage.getItem(SESSION_KEY)) {
  window.location.href = "index.html";
}

// Đồng bộ giao diện Sáng / Tối với index.html
const themeBtn = $("#themeBtn");
if (localStorage.getItem("deepguard-theme") === "light") {
  document.body.classList.add("light");
}
function updateThemeIcon() {
  const icon = themeBtn?.querySelector("i");
  const isLight = document.body.classList.contains("light");
  if (icon) icon.className = isLight ? "fa-solid fa-sun" : "fa-solid fa-moon";
}
updateThemeIcon();

themeBtn?.addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem(
    "deepguard-theme",
    document.body.classList.contains("light") ? "light" : "dark"
  );
  updateThemeIcon();
});

// Chuyển đổi Tab Đăng nhập / Đăng ký
const loginForm = $("#loginForm");
const registerForm = $("#registerForm");

function switchTab(tab) {
  $$(".auth-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  loginForm.classList.toggle("hidden", tab !== "login");
  registerForm.classList.toggle("hidden", tab !== "register");
  $("#loginError").classList.add("hidden");
  $("#registerError").classList.add("hidden");
}

$$(".auth-tab").forEach((btn) =>
  btn.addEventListener("click", () => switchTab(btn.dataset.tab))
);

// Kiểm tra URL ?mode=register để mở sẵn tab Đăng ký
const params = new URLSearchParams(window.location.search);
if (params.get("mode") === "register") {
  switchTab("register");
}

// Nút ẩn / hiện mật khẩu
$$(".toggle-pass").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const icon = btn.querySelector("i");
    if (!input) return;
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    icon.className = isPass ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
  });
});

// Xử lý Đăng ký
registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#regName").value.trim();
  const email = $("#regEmail").value.trim().toLowerCase();
  const password = $("#regPassword").value;
  const confirm = $("#regConfirm").value;
  const errEl = $("#registerError");

  if (password !== confirm) {
    errEl.textContent = "Mật khẩu nhập lại không khớp.";
    errEl.classList.remove("hidden");
    return;
  }

  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  if (users.some((u) => u.email === email)) {
    errEl.textContent = "Email này đã được sử dụng. Vui lòng đăng nhập.";
    errEl.classList.remove("hidden");
    return;
  }

  users.push({ name, email, password });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, JSON.stringify({ name, email }));

  window.location.href = "index.html";
});

// Xử lý Đăng nhập
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("#loginEmail").value.trim().toLowerCase();
  const password = $("#loginPassword").value;
  const errEl = $("#loginError");

  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    errEl.textContent = "Email hoặc mật khẩu không đúng.";
    errEl.classList.remove("hidden");
    return;
  }

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ name: user.name, email: user.email })
  );
  window.location.href = "index.html";
});