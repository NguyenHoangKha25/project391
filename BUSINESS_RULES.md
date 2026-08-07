# ScienceTrend Hub - Chi Tiết Quy Tắc Nghiệp Vụ System (Business Rules Specification)

---

> **Mã Tài Liệu**: `STH-BR-2026-V2`  
> **Trạng Thái**: CHÍNH THỨC (CHẮC CỐP - CHI TIẾT 100%)  
> **Phạm Vi**: Frontend, API Client, Routing, Data Normalization & Phân Quyền Người Dùng  

---

## 1. TỔNG QUAN HỆ THỐNG & VAI TRÒ NGUỜI DÙNG (USER ROLES)

Hệ thống **ScienceTrend Hub** quản lý 5 cấp độ truy cập (User Roles) rõ ràng:

1. **`GUEST` (Khách vãng lai)**: Người dùng chưa đăng nhập. Chỉ xem được trang Landing / Đăng nhập / Đăng ký.
2. **`STUDENT` (Sinh viên)**: Sinh viên tra cứu kiến thức, xem bài báo, tìm kiếm topic và xem xu hướng cấp độ cơ bản.
3. **`LECTURER` (Giảng viên)**: Giảng viên hướng dẫn nghiên cứu, theo dõi chủ đề giảng dạy và phân tích xu hướng trung cấp.
4. **`RESEARCHER` (Nghiên cứu sinh / Chuyên gia)**: Nhà nghiên cứu chuyên sâu, xem full dữ liệu phân tích, tín hiệu tăng trưởng (Growth Signals), Momentum và xuất báo cáo.
5. **`ADMIN` (Quản trị viên hệ thống)**: Quản lý người dùng, cấu hình dữ liệu, phân quyền và vận hành toàn hệ thống.

---

## 2. BẢNG PHÂN QUYỀN TRUY CẬP TRANG & THÀNH PHẦN (ROUTE & FEATURE PERMISSION MATRIX)

| Trang / Chức năng | Đường dẫn (Route) | GUEST | STUDENT | LECTURER | RESEARCHER | ADMIN |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Đăng nhập / Đăng ký** | `/login`, `/register` | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Tổng quan (Dashboard)** | `/dashboard` | ❌ | ✅ *(Basic)* | ✅ *(Full)* | ✅ *(Full)* | ✅ *(Full)* |
| **Tìm kiếm Bài báo** | `/papers` | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Tạp chí Khoa học** | `/journals` | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Từ khóa & Chủ đề** | `/keywords`, `/topics` | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Phòng nghiên cứu (MindMap)** | `/lab` | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Xu hướng Khoa học (Trends)** | `/trends` | ❌ | ✅ *(Tier 1)* | ✅ *(Tier 2)* | ✅ *(Tier 3)* | ✅ *(Tier 3)* |
| **Quản trị Hệ thống** | `/admin/*` | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. QUY TẮC CHI TIẾT DÀNH CHO TRANG TRENDS (TRENDS TIERED ACCESS RULES)

Dữ liệu Xu hướng Khoa học được phân cấp hiển thị nghiêm ngặt theo vai trò người dùng (Tiered Access Control):

### 3.1. Phân cấp hiển thị (Tiered View Restriction)
- **`STUDENT` (Tier 1 - Cơ bản)**:
  - Hiển thị: Top 3 Từ khóa / Chủ đề đang nổi (Top Trending Topics).
  - Tự động ẨN hoàn toàn các mục nâng cao:
    - ❌ Bảng tín hiệu tăng trưởng đột biến (Growth Velocity Signals).
    - ❌ Chỉ số động lực nghiên cứu (Momentum Alerts).
    - ❌ Đồ thị dự báo xu hướng tương lai (Predictive Insights & Radar).
- **`LECTURER` (Tier 2 - Tiêu chuẩn)**:
  - Hiển thị: Top 5 Từ khóa / Chủ đề.
  - Hiển thị danh sách Tín hiệu tăng trưởng cơ bản.
  - ẨN chức năng xuất dữ liệu báo cáo chuyên sâu (Advanced Export).
- **`RESEARCHER` & `ADMIN` (Tier 3 - Nâng cao)**:
  - Hiển thị: 100% dữ liệu không giới hạn.
  - Xem chi tiết chỉ số Momentum, Velocity Score, Citation Growth Rate, và Export dữ liệu CSV/JSON/PDF.

---

## 4. QUY TẮC CHUẨN HÓA DỮ LIỆU & FALLBACK (DATA INTEGRITY RULES)

### 4.1. Quy tắc tính toán Nút gốc trong MindMap (MindMap Root Node Aggregation)
- **Bối cảnh**: Khi Backend trả về chỉ số `paperCount = 0` hoặc thiếu cho nút chủ đề gốc (Root Node).
- **Quy tắc xử lý (Business Logic)**:
  - Frontend **không được hiển thị con số 0** làm ngơ ngác người dùng.
  - Hệ thống tự động kích hoạt hàm `normalizeMindMapNode()`:
    $$\text{paperCount}_{\text{root}} = \max(\{ \text{paperCount}_{\text{child\_i}} \mid \text{child\_i} \in \text{children} \}) \times 1.25$$
  - Giúp nút gốc luôn có giá trị thống kê bài báo hợp lý dựa trên các nhánh con.

### 4.2. Quy tắc Thẻ chỉ số Thống kê (KPI Stat Cards on Dashboard)
- Chỉ số neutral (Thống kê hiện tại như Total Papers, Journals, Keywords, Topics):
  - Nhãn hiển thị: **`Current catalog total`** (hoặc `Live catalog total`).
  - Style hiển thị: Chữ màu tươi nổi bật, **tuyệt đối không dùng khung viền ô chữ nhật (box border)** bao quanh chữ `Current` gây lem màu và khó đọc.
  - Không hiển thị icon dấu trừ (`—`) gây hiểu nhầm là số âm hoặc dữ liệu giảm.

---

## 5. QUY TẮC THÔNG BÁO LỖI THÂN THIỆN NGUỜI DÙNG (ERROR HANDLING & LOCALIZATION)

### 5.1. Cấm hiển thị thuật ngữ kỹ thuật (No Technical Jargon for Users)
- **Bị cấm hoàn toàn**: Không bao giờ in ra màn hình các dòng chữ chứa thuật ngữ như `backend`, `500 Internal Server Error`, `SQL Connection Failed`, `AxiosError`, `undefined`.
- **Chuẩn hóa thông báo lỗi**:
  - Khi ngắt kết nối mạng hoặc hỏng kết nối Server:  
    👉 `"Không thể kết nối đến dịch vụ. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau ít phút."`
  - Khi hết hạn phiên làm việc (Token Expired / 401 Unauthorized):  
    👉 `"Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại."`
  - Khi không có quyền truy cập (403 Forbidden):  
    👉 `"Bạn không có quyền truy cập vào tính năng này."`

---

## 6. QUY TẮC FORM VÀ GIAO DIỆN NGUỜI DÙNG (UI/UX COMPLIANCE)

### 6.1. Giao diện Trang Đăng nhập & Đăng ký (Auth Layout Rules)
- **Layout Cân đối**: Sử dụng Grid 2 cột (`Left Branding Showcase` + `Right Form Container`).
- **Độ cao chuẩn**: `min-height: min(780px, calc(100vh - 48px))` giữ toàn bộ form nằm gọn trong màn hình, loại bỏ thanh cuộn bên trong khung (no internal scrollbar).
- **Phông chữ & Độ tương phản**: Tất cả các nhãn (label), ô nhập (input), nút (button) phải đạt chuẩn WCAG AA (tỉ lệ tương phản chữ/nền $\ge 4.5:1$).

---

## 7. BẢO TRÌ VÀ CẬP NHẬT TỰ ĐỘNG (CI/CD & DEPLOYMENT RULES)

1. **Kiểm tra biên dịch**: Trước khi push code, luôn luôn chạy `npm run build` để đảm bảo 0 lỗi TypeScript/Vite CSS/JS.
2. **Đồng bộ hóa Repository**: Code mới nhất phải được commit và push song song lên cả 2 remote repository:
   - `origin` (`NguyenHoangKha25/project391.git`): Nhánh `develop` & `main`.
   - `target` (`yentuan2k5/su26swp06-fe.git`): Nhánh `develop` & `main`.

---
*Tài liệu Quy tắc Nghiệp vụ đã được chuẩn hóa 100% cho dự án ScienceTrend Hub.*
