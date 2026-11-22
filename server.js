import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config({ path: "./api.env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Serving from:", __dirname);

const app = express();
app.use(cors());

// Serve file tĩnh
app.use(express.static(__dirname));

// Trang chủ
app.get("/", (req, res) => {
  console.log("GET /");
  res.sendFile(path.resolve(__dirname, "index.html"));
});

// Tăng giới hạn dung lượng để nhận tệp ảnh/video kích thước lớn
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];

const SYSTEM_INSTRUCTION = `
  Bạn là chuyên gia an ninh mạng và phòng chống lừa đảo của hệ thống CheckWise.

  NHIỆM VỤ:
  BƯỚC 1: TRÍCH XUẤT VÀ PHÂN TÍCH NỘI DUNG
  - Nếu có hình ảnh/tệp: Đọc kỹ và trích xuất toàn bộ văn bản/chi tiết quan trọng (kể cả chữ nhỏ, mờ, tên tài khoản, logo). Viết ngắn gọn, rõ ý (tối đa 3-4 dòng).
  - Nếu là văn bản/URL: Tóm tắt nội dung chính và các điểm cần chú ý thật ngắn gọn.

  BƯỚC 2: PHÂN TÍCH VÀ ĐÁNH GIÁ RỦI RO
  - Nhận diện ngắn gọn các dấu hiệu lừa đảo, giả mạo thương hiệu/cơ quan, ép gấp, yêu cầu chuyển tiền/OTP/bật camera lạ (tối đa 3-4 gạch đầu dòng ngắn).

  KHUYẾN NGHỊ:
  - Đưa ra 2-3 hành động cụ thể, ngắn gọn, dễ hiểu để người dùng tự bảo vệ.

  BẮT BUỘC KẾT THÚC BẰNG ĐÚNG 2 DÒNG NÀY (không thêm ký tự markdown như ** hay # vào 2 dòng này):
  MUC_DO: AN_TOAN | CHUA_XAC_DINH | CANH_GIAC | NGUY_HIEM
  PHAN_TRAM_RUI_RO: <số nguyên từ 0 đến 100>

  Quy ước phân loại:
  - AN_TOAN (0–20%): Không phát hiện dấu hiệu lừa đảo hoặc nguy cơ đáng kể.
  - CHUA_XAC_DINH (21–45%): Thông tin thiếu ngữ cảnh hoặc chưa đủ dữ liệu để kết luận chắc chắn.
  - CANH_GIAC (46–74%): Có yếu tố đáng ngờ, cần xác minh kỹ trước khi thao tác.
  - NGUY_HIEM (75–100%): Dấu hiệu lừa đảo/mạo danh/chiếm đoạt rõ ràng, rủi ro cao.
`;

async function generateWithFallback(contents) {
  let lastError;

  for (const model of MODELS) {
    try {
      const t0 = Date.now();
      console.log(`[${new Date().toISOString()}] Trying model:${model}`);

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          maxOutputTokens: 2048,
          thinkingConfig: {
            thinkingLevel: "low",
          },
        },
      });

      const elapsedSec = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`Success with ${model} (${elapsedSec}s)`); if (response.usageMetadata) { const { promptTokenCount, thoughtsTokenCount, candidatesTokenCount } = response.usageMetadata; console.log( `  tokens -> prompt: ${promptTokenCount}, thoughts: ${ thoughtsTokenCount ?? 0 }, output: ${candidatesTokenCount}`
        );
      }
      return response;
    } catch (error) {
      console.error(`${model} failed:`, error.status, error.message); lastError = error;  if (error.status !== 503) { throw error; } } }  throw lastError; }  app.post("/api/analyze", async (req, res) => { const reqStart = Date.now(); console.log(`[${new Date().toISOString()}] POST /api/analyze received`);
  try {
    const { promptText, fileData, mimeType } = req.body;

    let contents = [];

    if (fileData) {
      contents.push({
        inlineData: {
          data: fileData,
          mimeType: mimeType || "image/jpeg",
        },
      });
    }

    contents.push(
      promptText
        ? `Yêu cầu thêm từ người dùng: ${promptText}`
        : "Hãy phân tích nội dung được đính kèm."
    );

    const response = await generateWithFallback(contents);
    console.log(
      `Total request time: ${((Date.now() - reqStart) / 1000).toFixed(1)}s`
    );
    res.json({ success: true, result: response.text });
  } catch (error) {
    console.error("Lỗi khi gọi CheckWise AI:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});