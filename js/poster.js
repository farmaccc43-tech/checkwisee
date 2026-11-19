(() => {

  // DANH SÁCH 6 POSTER
  const posters = [
    {
      title: "Ép bạn phải làm ngay",
      file: "ÉP BẠN PHẢI LÀM NGAY (2).png"
    },
    {
      title: "Giả danh tổ chức",
      file: "GIẢ DANH TỔ CHỨC.png"
    },
    {
      title: "Xin OTP & thông tin bí mật",
      file: "XIN OTP & THÔNG TIN BÍ MẬT.png"
    },
    {
      title: "Yêu cầu chuyển tiền",
      file: "YÊU CẦU CHUYỂN TIỀN.png"
    },
    {
      title: "Website giả mạo",
      file: "WEBSITE GIẢ MẠO.png"
    },
    {
      title: "Giọng nói & hình ảnh giả",
      file: "GIỌNG NÓI & HÌNH ẢNH GIẢ.png"
    }
  ];

  // ĐƯỜNG DẪN THƯ MỤC ẢNH
  const base =
    "POSTER DẤU HIỆU TRƯỚC KHI MẮC BẪY/";

  // LẤY CÁC THÀNH PHẦN HTML
  const image = document.getElementById("posterImage");
  const title = document.getElementById("posterTitle");
  const kicker = document.getElementById("posterKicker");
  const counter = document.getElementById("posterCounter");
  const dots = document.getElementById("posterDots");
  const openOriginal = document.getElementById("openOriginal");

  // Nếu không có trang trình chiếu thì dừng
  if (!image || !dots) return;

  // ĐỌC SỐ POSTER TỪ URL
  const params = new URLSearchParams(location.search);

  let index = Math.min(
    6,
    Math.max(1, Number(params.get("poster")) || 1)
  ) - 1;

  // ĐỊNH DẠNG SỐ 01, 02, 03...
  const pad = n => String(n).padStart(2, "0");

  // TẠO CÁC CHẤM ĐIỀU HƯỚNG
  posters.forEach((p, i) => {

    const dot = document.createElement("button");

    dot.type = "button";
    dot.className = "poster-dot";

    dot.setAttribute(
      "aria-label",
      `Xem poster ${i + 1}: ${p.title}`
    );

    dot.addEventListener("click", () => {
      show(i);
    });

    dots.appendChild(dot);

  });

  // HÀM HIỂN THỊ POSTER
  function show(next) {

    index = (next + posters.length) % posters.length;

    const p = posters[index];

    const src = base + p.file;

    image.style.opacity = "0";

    // TẢI ẢNH TRƯỚC KHI HIỂN THỊ
    const preload = new Image();

    preload.onload = () => {

      image.src = src;
      image.alt = `Poster: ${p.title}`;
      image.style.opacity = "1";

    };

    preload.onerror = () => {

      image.style.opacity = "1";

      title.textContent = "Không tải được ảnh poster";

    };

    preload.src = src;

    // CẬP NHẬT TIÊU ĐỀ
    title.textContent = p.title;

    kicker.textContent =
      `DẤU HIỆU ${pad(index + 1)}`;

    // CẬP NHẬT SỐ THỨ TỰ
    counter.textContent =
      `${pad(index + 1)} / ${pad(posters.length)}`;

    // CẬP NHẬT CHẤM ĐIỀU HƯỚNG
    [...dots.children].forEach((d, i) => {

      d.classList.toggle("active", i === index);

      d.setAttribute(
        "aria-current",
        i === index ? "true" : "false"
      );

    });

    // ĐƯỜNG DẪN ẢNH GỐC
    openOriginal.href = src;

    // CẬP NHẬT URL
    const url = new URL(location.href);

    url.searchParams.set(
      "poster",
      String(index + 1)
    );

    history.replaceState({}, "", url);

  }

  // NÚT POSTER TRƯỚC
  document
    .getElementById("prevPoster")
    ?.addEventListener("click", () => {
      show(index - 1);
    });

  // NÚT POSTER TIẾP THEO
  document
    .getElementById("nextPoster")
    ?.addEventListener("click", () => {
      show(index + 1);
    });

  // ĐIỀU KHIỂN BẰNG BÀN PHÍM
  document.addEventListener("keydown", e => {

    if (e.key === "ArrowLeft") {
      show(index - 1);
    }

    if (e.key === "ArrowRight") {
      show(index + 1);
    }

  });

  // HIỂN THỊ POSTER BAN ĐẦU
  show(index);

})();