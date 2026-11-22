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
      '<i class="fa-solid fa-spinner fa-spin"></i> CheckWise đang phân tích...';

    try {
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
        alert("Lỗi từ CheckWise AI: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Không thể kết nối đến Server Backend.");
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Phân tích AI';
    }
  });
}

// =========================================================
// XỬ LÝ & HIỂN THỊ BÁO CÁO CHUYÊN SÂU TỪ CHECKWISE (3 Ô NGANG + 4 MỨC)
// =========================================================
function formatInlineMarkdown(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function parseAIReport(rawText) {
  const text = String(rawText || "");

  // Bóc tách MUC_DO
  const levelMatch = text.match(
    /MUC_DO\s*:\s*(AN_TOAN|CHUA_XAC_DINH|CANH_GIAC|NGUY_HIEM)/i
  );

  // Bóc tách PHAN_TRAM_RUI_RO
  let percent = null;
  const pctMatch = text.match(/PHAN_TRAM_RUI_RO\s*:\s*(\d{1,3})/i);
  if (pctMatch) {
    percent = Math.max(0, Math.min(100, parseInt(pctMatch[1], 10)));
  } else {
    const anyPct = text.match(/(\d{1,3})\s*%/);
    if (anyPct) {
      percent = Math.max(0, Math.min(100, parseInt(anyPct[1], 10)));
    }
  }

  // Làm sạch metadata và ký tự thừa
  const cleaned = text
    .replace(/^\s*MUC_DO\s*:.*$/gim, "")
    .replace(/^\s*PHAN_TRAM_RUI_RO\s*:.*$/gim, "")
    .replace(/^---+\s*$/gm, "")
    .trim();

  // Tách 3 mục ngắn gọn
  const step1Match = cleaned.match(
    /(?:###\s*)?BƯỚC\s*1[\s\S]*?(?=(?:###\s*)?BƯỚC\s*2|$)/i
  );
  const step2Match = cleaned.match(
    /(?:###\s*)?BƯỚC\s*2[\s\S]*?(?=(?:###\s*)?KHUYẾN\s*NGHỊ|$)/i
  );
  const recMatch = cleaned.match(/(?:###\s*)?KHUYẾN\s*NGHỊ[\s\S]*$/i);

  const cleanSection = (chunk, headingRegex) => {
    if (!chunk) return "";
    return chunk
      .replace(headingRegex, "")
      .replace(/^\s*[-*+]\s+/gm, "• ")
      .replace(/\n{2,}/g, "\n")
      .trim();
  };

  let box1 = cleanSection(
    step1Match ? step1Match[0] : "",
    /^(?:###\s*)?BƯỚC\s*1[^\n]*\n?/i
  );
  let box2 = cleanSection(
    step2Match ? step2Match[0] : "",
    /^(?:###\s*)?BƯỚC\s*2[^\n]*\n?/i
  );
  let box3 = cleanSection(
    recMatch ? recMatch[0] : "",
    /^(?:###\s*)?KHUYẾN\s*NGHỊ[^\n]*\n?/i
  );

  // Fallback nếu AI trả về đoạn tự do
  if (!box1 && !box2 && !box3) {
    const paras = cleaned
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    box1 = paras[0] || "Đã tiếp nhận nội dung để kiểm tra.";
    box2 = paras[1] || "Đang tổng hợp các yếu tố rủi ro từ nội dung.";
    box3 =
      paras[2] || "Xác minh thông tin qua kênh chính thức trước khi thao tác.";
  }

  // Xác định 1 trong 4 mức: An toàn | Chưa xác định | Cảnh giác | Nguy hiểm
  let levelKey = levelMatch ? levelMatch[1].toUpperCase() : null;
  if (!levelKey) {
    if (/NGUY\s*HIỂM|HIGH|LỪA ĐẢO RÕ RÀNG|MẠO DANH/i.test(cleaned)) {
      levelKey = "NGUY_HIEM";
    } else if (/CẢNH\s*GIÁC|MEDIUM|TRUNG BÌNH|ĐÁNG NGỜ/i.test(cleaned)) {
      levelKey = "CANH_GIAC";
    } else if (/CHƯA\s*XÁC\s*ĐỊNH|UNKNOWN|KHÔNG ĐỦ/i.test(cleaned)) {
      levelKey = "CHUA_XAC_DINH";
    } else {
      levelKey = "AN_TOAN";
    }
  }

  const levelMap = {
    AN_TOAN: {
      label: "AN TOÀN",
      cssClass: "safe",
      defaultPct: 12,
    },
    CHUA_XAC_DINH: {
      label: "CHƯA XÁC ĐỊNH",
      cssClass: "unknown",
      defaultPct: 35,
    },
    CANH_GIAC: {
      label: "CẢNH GIÁC",
      cssClass: "caution",
      defaultPct: 62,
    },
    NGUY_HIEM: {
      label: "NGUY HIỂM",
      cssClass: "danger",
      defaultPct: 88,
    },
  };

  const meta = levelMap[levelKey];
  const finalPct = percent !== null ? percent : meta.defaultPct;

  return {
    meta,
    percent: finalPct,
    cards: [
      {
        title: "Nội dung ghi nhận",
        icon: "fa-file-lines",
        body: box1 || "Không trích xuất được thêm nội dung chi tiết.",
      },
      {
        title: "Dấu hiệu & đánh giá",
        icon: "fa-magnifying-glass-chart",
        body: box2 || "Chưa ghi nhận dấu hiệu bất thường nổi bật.",
      },
      {
        title: "Khuyến nghị xử lý",
        icon: "fa-shield-halved",
        body:
          box3 || "Thận trọng khi chia sẻ thông tin cá nhân hoặc chuyển tiền.",
      },
    ],
  };
}

function showAIResult(aiText) {
  const resultSection = $("#result");
  const resultTitle = $("#resultTitle");
  const riskBadge = $("#riskBadge");
  const riskScore = $("#riskScore");
  const meterFill = $("#meterFill");
  const findingsContainer = $("#findings");

  const report = parseAIReport(aiText);

  if (resultSection) {
    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (resultTitle) {
    resultTitle.textContent = "Báo cáo chuyên sâu từ CheckWise";
  }

  if (riskBadge) {
    riskBadge.textContent = report.meta.label;
    riskBadge.className = `risk ${report.meta.cssClass}`;
  }

  if (riskScore) {
    riskScore.textContent = `${report.percent}% • ${report.meta.label}`;
  }

  if (meterFill) {
    meterFill.style.width = "0%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        meterFill.style.width = `${report.percent}%`;
      });
    });
  }

  if (findingsContainer) {
    findingsContainer.className = "findings findings-horizontal";
    findingsContainer.innerHTML = report.cards
      .map(
        (card) => `
        <div class="finding finding-card">
          <div class="finding-top">
            <i class="fa-solid ${card.icon}"></i>
            <strong>${card.title}</strong>
          </div>
          <p class="finding-body">${formatInlineMarkdown(card.body)}</p>
        </div>
      `
      )
      .join("");
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
      const scoreText = $("#riskScore") ? $("#riskScore").innerText : "";
      const findingsText = $("#findings") ? $("#findings").innerText : "";
      await navigator.clipboard.writeText(
        `Báo cáo chuyên sâu từ CheckWise (${scoreText}):\n${findingsText}`
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

$("#userProfileTrigger")?.addEventListener("click", (e) => {
  e.stopPropagation();
  $("#userDropdownMenu")?.classList.toggle("hidden");
});

document.addEventListener("click", () => {
  $("#userDropdownMenu")?.classList.add("hidden");
});

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
        <div class="history-action-hint">Bấm để xem lại báo cáo CheckWise →</div>
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

$("#toggleHistoryBtn")?.addEventListener("click", openHistoryDrawer);
$("#dropdownHistoryBtn")?.addEventListener("click", openHistoryDrawer);
$("#closeHistoryBtn")?.addEventListener("click", closeHistoryDrawer);
$("#historyOverlay")?.addEventListener("click", closeHistoryDrawer);

$("#clearHistoryBtn")?.addEventListener("click", () => {
  if (confirm("Bạn có chắc muốn xóa toàn bộ lịch sử tra cứu này?")) {
    localStorage.removeItem(getHistoryStorageKey());
    renderHistoryList();
  }
});

updateNavbarAuthUI();