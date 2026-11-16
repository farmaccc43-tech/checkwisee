const $ = (s) => document.querySelector(s),
  $$ = (s) => document.querySelectorAll(s);

const types = {
  message: {
    title: "Phân tích tin nhắn",
    hint: "Dán nội dung SMS, Zalo, Messenger hoặc email vào ô bên dưới.",
    placeholder:
      "Ví dụ: “Tài khoản của bạn sắp bị khóa. Hãy bấm vào đường link để xác minh ngay...”",
  },
  link: {
    title: "Phân tích đường link",
    hint: "Dán URL bạn nhận được để kiểm tra các dấu hiệu đáng ngờ.",
    placeholder: "https://example.com",
  },
  image: {
    title: "Phân tích hình ảnh",
    hint: "Tải ảnh tin nhắn, QR hoặc ảnh website cần kiểm tra.",
    placeholder: "",
  },
  audio: {
    title: "Phân tích âm thanh",
    hint: "Tải ghi âm cuộc gọi hoặc đoạn âm thanh cần kiểm tra.",
    placeholder: "",
  },
  video: {
    title: "Phân tích video",
    hint: "Tải video để kiểm tra các dấu hiệu đáng ngờ.",
    placeholder: "",
  },
};

let currentType = "message";
const messageInput = $("#messageInput"),
  linkInput = $("#linkInput"),
  uploadInput = $("#uploadInput"),
  fileField = $("#fileField"),
  filePreview = $("#filePreview");

$$(".type-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    currentType = btn.dataset.type;
    $$(".type-btn").forEach((x) => x.classList.remove("active"));
    btn.classList.add("active");
    const t = types[currentType];
    $("#inputTitle").textContent = t.title;
    $("#inputHint").textContent = t.hint;
    messageInput.classList.toggle("hidden", currentType !== "message");
    linkInput.classList.toggle("hidden", currentType !== "link");
    uploadInput.classList.toggle(
      "hidden",
      !["image", "audio", "video"].includes(currentType)
    );
    if (currentType === "message") {
      messageInput.placeholder = t.placeholder;
    } else if (currentType === "link") {
      const urlField = $("#urlField");
      if (urlField) urlField.placeholder = t.placeholder;
    }
    $("#charCount").textContent = "0 ký tự";
  })
);

if (messageInput) {
  messageInput.addEventListener(
    "input",
    () => ($("#charCount").textContent = messageInput.value.length + " ký tự")
  );
}

if (fileField) {
  fileField.addEventListener("change", () => {
    const f = fileField.files[0];
    filePreview.innerHTML = f
      ? `<div class="file-chip"><i class="fa-solid fa-file"></i> ${f.name} • ${(
          f.size /
          1024 /
          1024
        ).toFixed(2)} MB</div>`
      : "";
  });
}

const menuBtn = $("#menuBtn");
if (menuBtn) {
  menuBtn.addEventListener("click", () => $("#nav").classList.toggle("open"));
}

const themeBtn = $("#themeBtn");
const savedTheme = localStorage.getItem("deepguard-theme");
if (savedTheme === "light") document.body.classList.add("light");

function updateThemeIcon() {
  if (!themeBtn) return;
  const icon = themeBtn.querySelector("i");
  const isLight = document.body.classList.contains("light");
  if (icon) icon.className = isLight ? "fa-solid fa-sun" : "fa-solid fa-moon";
  themeBtn.setAttribute(
    "aria-label",
    isLight ? "Chuyển sang giao diện tối" : "Chuyển sang giao diện sáng"
  );
}
updateThemeIcon();

if (themeBtn) {
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("light");
    const isLight = document.body.classList.contains("light");
    localStorage.setItem("deepguard-theme", isLight ? "light" : "dark");
    updateThemeIcon();
  });
}

// Chuyển tệp sang chuỗi Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = (error) => reject(error);
  });
}

// Gửi yêu cầu phân tích tới Server Node.js
const analyzeBtn = $("#analyzeBtn");
if (analyzeBtn) {
  analyzeBtn.addEventListener("click", async () => {
    let contentToAnalyze = "";
    let fileBase64 = null;
    let fileMime = null;

    if (currentType === "message") {
      contentToAnalyze = messageInput.value.trim();
      if (!contentToAnalyze) {
        alert("Hãy nhập nội dung tin nhắn cần kiểm tra.");
        return;
      }
    } else if (currentType === "link") {
      const urlField = $("#urlField");
      contentToAnalyze = urlField ? urlField.value.trim() : "";
      if (!contentToAnalyze) {
        alert("Hãy nhập đường link URL cần kiểm tra.");
        return;
      }
    } else {
      if (fileField && fileField.files && fileField.files.length > 0) {
        const file = fileField.files[0];
        try {
          fileBase64 = await fileToBase64(file);
          fileMime = file.type || "image/jpeg";
          contentToAnalyze = `Đính kèm tệp: ${file.name}`;
        } catch (e) {
          console.error(e);
          alert("Lỗi khi xử lý tệp tải lên.");
          return;
        }
      } else {
        alert("Vui lòng chọn hoặc kéo thả một tệp để tải lên.");
        return;
      }
    }

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> AI đang phân tích...';

    try {
      // Dùng đường dẫn tương đối để chạy chuẩn xác cho cả Local (khi server.js serve file tĩnh) lẫn trên Render
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promptText: contentToAnalyze,
          fileData: fileBase64,
          mimeType: fileMime,
        }),
      });

      const data = await response.json();
      if (data.success) {
        showAIResult(data.result);
        saveScanHistory(currentType, contentToAnalyze, data.result);
      } else {
        alert("Lỗi từ AI: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert(
        "Không thể kết nối đến Server Backend."
      );
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Phân tích AI';
    }
  });
}

function showAIResult(aiText) {
  const resultSection = $("#result");
  const resultTitle = $("#resultTitle");
  const riskBadge = $("#riskBadge");
  const riskScore = $("#riskScore");
  const meterFill = $("#meterFill");
  const findingsContainer = $("#findings");

  if (resultSection) {
    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (resultTitle)
    resultTitle.textContent = "Báo cáo phân tích chuyên sâu từ AI Gemini";
  if (riskBadge) {
    riskBadge.textContent = "HOÀN TẤT";
    riskBadge.className = "risk medium";
  }
  if (riskScore) riskScore.textContent = "AI Check";
  if (meterFill) meterFill.style.width = "85%";

  if (findingsContainer) {
    findingsContainer.innerHTML = `
      <div class="finding" style="grid-column: 1 / -1; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 8px;">
        <i class="fa-solid fa-shield-halved" style="font-size: 24px; margin-bottom: 10px; color: var(--cyan, #25d9ff);"></i>
        <strong style="font-size: 1.1rem; display: block; margin-bottom: 8px;">Kết quả đánh giá chi tiết:</strong>
        <p style="line-height: 1.6; color: #e2e8f0; white-space: pre-line;">${aiText}</p>
      </div>
    `;
  }
}

const newCheckBtn = $("#newCheck");
if (newCheckBtn) {
  newCheckBtn.addEventListener("click", () => {
    const checker = $("#checker");
    if (checker) checker.scrollIntoView({ behavior: "smooth" });
    const resultSection = $("#result");
    if (resultSection) resultSection.classList.add("hidden");
  });
}

const copyResultBtn = $("#copyResult");
if (copyResultBtn) {
  copyResultBtn.addEventListener("click", async () => {
    try {
      const findingsText = $("#findings") ? $("#findings").innerText : "";
      await navigator.clipboard.writeText(
        `CHECKWISE AI Report:\n${findingsText}`
      );
      alert("Đã sao chép kết quả vào bộ nhớ tạm.");
    } catch (e) {}
  });
}

// Hiệu ứng cuộn trang và đếm số
const io = new IntersectionObserver(
  (es) =>
    es.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("show");
    }),
  { threshold: 0.12 }
);
$$(".reveal").forEach((x) => io.observe(x));

const cio = new IntersectionObserver(
  (es) =>
    es.forEach((e) => {
      if (e.isIntersecting) {
        const n = e.target.dataset.count;
        if (n) {
          let i = 0;
          const t = setInterval(() => {
            i++;
            e.target.textContent = i;
            if (i >= +n) clearInterval(t);
          }, 45);
        }
      }
    }),
  { threshold: 0.8 }
);
$$("[data-count]").forEach((x) => cio.observe(x));

// =========================================================
// QUẢN LÝ TÀI KHOẢN & LỊCH SỬ TRA CỨU
// =========================================================
const USERS_KEY = "checkwise_users";
const SESSION_KEY = "checkwise_current_user";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function getHistoryStorageKey() {
  const user = getCurrentUser();
  return user ? `checkwise_history_${user.email}` : "checkwise_history_guest";
}

function updateNavbarAuthUI() {
  const user = getCurrentUser();
  const authButtons = $("#authButtons");
  const userMenu = $("#userMenuContainer");
  const historyLabel = $("#historyUserLabel");

  if (user) {
    authButtons?.classList.add("hidden");
    userMenu?.classList.remove("hidden");
    const avatarEl = $("#userAvatarText");
    const nameEl = $("#userNameDisplay");
    const dropdownNameEl = $("#dropdownUserName");
    const dropdownEmailEl = $("#dropdownUserEmail");

    if (avatarEl) avatarEl.textContent = user.name.trim().charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = user.name;
    if (dropdownNameEl) dropdownNameEl.textContent = user.name;
    if (dropdownEmailEl) dropdownEmailEl.textContent = user.email;
    if (historyLabel) historyLabel.textContent = `Tài khoản: ${user.email}`;
  } else {
    authButtons?.classList.remove("hidden");
    userMenu?.classList.add("hidden");
    $("#userDropdownMenu")?.classList.add("hidden");
    if (historyLabel) historyLabel.textContent = "Chế độ khách (lưu trên máy)";
  }
}

// Xử lý ẩn hiện Dropdown User trên Navbar
$("#userProfileTrigger")?.addEventListener("click", (e) => {
  e.stopPropagation();
  $("#userDropdownMenu")?.classList.toggle("hidden");
});

document.addEventListener("click", () => {
  $("#userDropdownMenu")?.classList.add("hidden");
});

// Xử lý Đăng xuất
$("#logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  updateNavbarAuthUI();
  alert("Đã đăng xuất tài khoản.");
});

// --- Quản lý Lịch sử tra cứu & Ngăn kéo (Drawer) ---
const typeLabels = {
  message: "Tin nhắn",
  link: "Đường link",
  image: "Hình ảnh",
  audio: "Âm thanh",
  video: "Video",
};

function saveScanHistory(type, inputContent, aiResult) {
  const key = getHistoryStorageKey();
  const list = JSON.parse(localStorage.getItem(key) || "[]");
  list.unshift({
    id: Date.now(),
    type,
    typeLabel: typeLabels[type] || "Nội dung",
    input: inputContent,
    result: aiResult,
    createdAt: new Date().toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  });
  localStorage.setItem(key, JSON.stringify(list.slice(0, 30)));
}

function renderHistoryList() {
  const container = $("#historyList");
  if (!container) return;
  const list = JSON.parse(localStorage.getItem(getHistoryStorageKey()) || "[]");

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-history">
        <i class="fa-solid fa-folder-open" style="font-size: 28px; margin-bottom: 10px; opacity: 0.5;"></i>
        <p>Chưa có lịch sử tra cứu nào.<br/>Hãy thử phân tích một tin nhắn hoặc đường link!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list
    .map(
      (item) => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item-top">
          <span class="history-type-tag">${item.typeLabel}</span>
          <span class="history-time">${item.createdAt}</span>
        </div>
        <div class="history-snippet">${item.input.replace(/</g, "&lt;")}</div>
        <div class="history-action-hint">Bấm để xem lại báo cáo AI →</div>
      </div>
    `
    )
    .join("");

  container.querySelectorAll(".history-item").forEach((el) => {
    el.addEventListener("click", () => {
      const target = list.find((x) => String(x.id) === el.dataset.id);
      if (target) {
        closeHistoryDrawer();
        showAIResult(target.result);
      }
    });
  });
}

function openHistoryDrawer() {
  renderHistoryList();
  const drawer = $("#historyDrawer");
  const overlay = $("#historyOverlay");
  
  if (drawer) {
    drawer.classList.remove("hidden");
    setTimeout(() => drawer.classList.add("open"), 10);
  }
  if (overlay) {
    overlay.classList.remove("hidden");
  }
}

function closeHistoryDrawer() {
  const drawer = $("#historyDrawer");
  const overlay = $("#historyOverlay");
  
  if (drawer) {
    drawer.classList.remove("open");
    setTimeout(() => drawer.classList.add("hidden"), 300);
  }
  if (overlay) {
    overlay.classList.add("hidden");
  }
}

// Gắn sự kiện mở/đóng ngăn kéo lịch sử
$("#toggleHistoryBtn")?.addEventListener("click", openHistoryDrawer);
$("#dropdownHistoryBtn")?.addEventListener("click", openHistoryDrawer);
$("#closeHistoryBtn")?.addEventListener("click", closeHistoryDrawer);
$("#historyOverlay")?.addEventListener("click", closeHistoryDrawer);

// Gắn sự kiện xóa toàn bộ lịch sử
$("#clearHistoryBtn")?.addEventListener("click", () => {
  if (confirm("Bạn có chắc muốn xóa toàn bộ lịch sử tra cứu này?")) {
    localStorage.removeItem(getHistoryStorageKey());
    renderHistoryList();
  }
});

// Khởi chạy kiểm tra trạng thái đăng nhập khi mở trang
updateNavbarAuthUI();