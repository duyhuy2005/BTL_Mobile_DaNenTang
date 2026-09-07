# 📦 MODULE GIAO HÀNG VÀ HOÀN/ĐỔI TRẢ

## ✅ Tổng quan

Đã bổ sung thành công 2 module mới vào hệ thống Beauty Store:
1. **Quản lý Giao hàng** - Theo dõi và quản lý thông tin giao hàng
2. **Quản lý Hoàn/Đổi trả** - Xử lý yêu cầu hoàn trả và đổi hàng của khách hàng

---

## 🗄️ DATABASE

### Bảng đã tạo:

#### 1. GiaoHang
```sql
- MaGiaoHang (PK, Identity)
- MaHoaDon (FK → HoaDon)
- DiaChiGiaoHang (nvarchar(500))
- SoDienThoai (nvarchar(20))
- DonViVanChuyen (nvarchar(100))
- MaVanDon (nvarchar(50))
- NgayGiao (datetime)
- PhiVanChuyen (decimal(18,2))
- TrangThai (nvarchar(50)) - Default: 'Chờ giao'
- GhiChu (nvarchar(500))
- NgayTao, NgayCapNhat (datetime)
```

**Trạng thái giao hàng:**
- Chờ giao
- Đang giao  
- Đã giao
- Giao thất bại
- Đã hủy

#### 2. HoanDoiTra
```sql
- MaHoanDoiTra (PK, Identity)
- MaHoaDon (FK → HoaDon)
- MaKhachHang (FK → KhachHang)
- LoaiYeuCau (nvarchar(50)) - 'Đổi hàng' | 'Trả hàng'
- LyDo (nvarchar(200))
- MoTaChiTiet (nvarchar(1000))
- TrangThai (nvarchar(50)) - Default: 'Chờ xử lý'
- NgayYeuCau, NgayXuLy (datetime)
- NguoiXuLy (FK → NhanVien)
- GhiChuNguoiXuLy (nvarchar(500))
- SoTienHoan (decimal(18,2))
- NgayTao, NgayCapNhat (datetime)
```

**Trạng thái hoàn/đổi trả:**
- Chờ xử lý
- Đã duyệt
- Đang xử lý
- Hoàn tất
- Từ chối

#### 3. ChiTietHoanDoiTra
```sql
- MaChiTiet (PK, Identity)
- MaHoanDoiTra (FK → HoanDoiTra)
- MaSanPham (FK → SanPham)
- SoLuong (int)
- DonGia (decimal(18,2))
- ThanhTien (decimal(18,2))
- TrangThaiSanPham (nvarchar(200))
```

**Lý do hoàn/đổi trả:**
- Sản phẩm bị lỗi
- Sản phẩm bị hư hỏng
- Giao sai sản phẩm
- Không đúng mô tả
- Không phù hợp
- Khác

---

## 🔌 BACKEND API

### Routes đã tạo:

#### A. Giao hàng (/api/giaohang)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/giaohang` | Lấy danh sách (pagination, search, filter) |
| GET | `/api/giaohang/:id` | Lấy chi tiết giao hàng |
| POST | `/api/giaohang` | Tạo thông tin giao hàng |
| PUT | `/api/giaohang/:id` | Cập nhật thông tin |
| PUT | `/api/giaohang/:id/status` | Cập nhật trạng thái |
| DELETE | `/api/giaohang/:id` | Xóa thông tin giao hàng |
| GET | `/api/giaohang/stats/summary` | Thống kê giao hàng |

**Features:**
- ✅ Validation: Kiểm tra hóa đơn tồn tại, không cho tạo duplicate
- ✅ Search: Theo mã hóa đơn, tên khách hàng, SĐT, mã vận đơn
- ✅ Filter: Theo trạng thái, khoảng thời gian
- ✅ Auto-fill thông tin khách hàng từ hóa đơn

#### B. Hoàn/Đổi trả (/api/hoandoitra)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/hoandoitra` | Lấy danh sách (pagination, filter) |
| GET | `/api/hoandoitra/:id` | Lấy chi tiết yêu cầu |
| POST | `/api/hoandoitra` | Tạo yêu cầu mới |
| PUT | `/api/hoandoitra/:id/approve` | Duyệt yêu cầu |
| PUT | `/api/hoandoitra/:id/reject` | Từ chối yêu cầu |
| PUT | `/api/hoandoitra/:id/complete` | Hoàn tất (cập nhật tồn kho) |
| DELETE | `/api/hoandoitra/:id` | Xóa yêu cầu (chỉ Chờ xử lý) |
| GET | `/api/hoandoitra/stats/summary` | Thống kê |
| GET | `/api/hoandoitra/invoice/:id/products` | Lấy sản phẩm từ hóa đơn |

**Features:**
- ✅ Transaction: Tạo yêu cầu với nhiều sản phẩm trong 1 transaction
- ✅ Validation: Kiểm tra sản phẩm có trong hóa đơn, số lượng hợp lệ
- ✅ Search: Theo mã hóa đơn, khách hàng, SĐT
- ✅ Filter: Theo loại yêu cầu, trạng thái, khoảng thời gian
- ✅ Inventory update: Tự động cập nhật tồn kho khi hoàn tất trả hàng

---

## 🎨 FRONTEND

### Trang đã tạo:

#### 1. Deliveries.tsx - Quản lý Giao hàng
**Đường dẫn:** `/deliveries`

**Chức năng:**
- ✅ Bảng hiển thị danh sách giao hàng với pagination
- ✅ Search theo mã hóa đơn, khách hàng, SĐT
- ✅ Filter theo trạng thái giao hàng
- ✅ Modal thêm/sửa thông tin giao hàng
- ✅ Auto-fill thông tin khách hàng khi chọn hóa đơn
- ✅ Actions: Xem chi tiết, Sửa, Xóa

**Giao diện:**
- Card header gradient pink-purple
- Table responsive với icons SVG
- Status badges với màu theo trạng thái
- Modal form đầy đủ validation

#### 2. DeliveryDetail.tsx - Chi tiết Giao hàng
**Đường dẫn:** `/deliveries/:id`

**Chức năng:**
- ✅ Timeline trạng thái visual (Chờ giao → Đang giao → Đã giao)
- ✅ Hiển thị thông tin giao hàng đầy đủ
- ✅ Hiển thị thông tin khách hàng
- ✅ Hiển thị danh sách sản phẩm trong đơn hàng
- ✅ Modal cập nhật trạng thái giao hàng
- ✅ Link đến chi tiết hóa đơn

**Giao diện:**
- Timeline với animated progress bar
- Cards thông tin với icons
- Table sản phẩm với tổng tiền
- Status indicators với colors

#### 3. Returns.tsx - Quản lý Hoàn/Đổi trả
**Đường dẫn:** `/returns`

**Chức năng:**
- ✅ Bảng danh sách yêu cầu với pagination
- ✅ Search và filter theo loại/trạng thái/ngày
- ✅ Modal thêm yêu cầu với dynamic product selection
- ✅ Chọn sản phẩm từ hóa đơn (chỉ SP có trong HD)
- ✅ Actions inline: Duyệt, Từ chối, Hoàn tất, Xóa
- ✅ Xem chi tiết

**Giao diện:**
- Type badges (Trả hàng: red, Đổi hàng: blue)
- Status badges với 5 trạng thái
- Modal form với product selection dynamic
- Action icons theo từng trạng thái

#### 4. ReturnDetail.tsx - Chi tiết Hoàn/Đổi trả
**Đường dẫn:** `/returns/:id`

**Chức năng:**
- ✅ Timeline trạng thái (Chờ xử lý → Duyệt/Từ chối → Đang xử lý → Hoàn tất)
- ✅ Hiển thị thông tin yêu cầu đầy đủ
- ✅ Hiển thị thông tin khách hàng
- ✅ Bảng sản phẩm hoàn/đổi trả với tồn kho
- ✅ Actions: Duyệt, Từ chối, Hoàn tất
- ✅ Thông báo cập nhật tồn kho

**Giao diện:**
- Timeline với branch logic (Từ chối ≠ Đã duyệt)
- Financial info card (số tiền hoàn)
- Product table với inventory status
- Success notice khi hoàn tất

### Navigation

**Sidebar menu items:**
```
🏠 Trang chủ
💄 Sản phẩm
📁 Danh mục
👥 Khách hàng
🧾 Hóa đơn
🚚 Giao hàng    ← MỚI
↩️ Hoàn đổi trả  ← MỚI
👔 Nhân viên
```

---

## 🔧 NGHIỆP VỤ

### 1. Quy trình Giao hàng

```
1. Tạo Hóa đơn
   ↓
2. Thêm thông tin Giao hàng
   - Chọn hóa đơn
   - Tự động điền thông tin khách hàng
   - Nhập địa chỉ, đơn vị vận chuyển, mã vận đơn
   - Nhập phí vận chuyển
   ↓
3. Cập nhật trạng thái theo timeline
   Chờ giao → Đang giao → Đã giao
   ↓
4. Hoàn tất giao hàng
```

### 2. Quy trình Hoàn/Đổi trả

```
1. Khách hàng yêu cầu
   ↓
2. Tạo yêu cầu Hoàn/Đổi trả
   - Chọn hóa đơn
   - Chọn loại: Trả hàng / Đổi hàng
   - Chọn lý do
   - Chọn sản phẩm (chỉ từ HD đã chọn)
   - Nhập số lượng (≤ SL trong HD)
   - Mô tả chi tiết
   ↓
3. Admin xử lý
   - DUYỆT: Chấp nhận yêu cầu → Đang xử lý
   - TỪ CHỐI: Từ chối yêu cầu + lý do
   ↓
4. Admin hoàn tất
   - Nhấn "Hoàn tất"
   - Nếu TRẢ HÀNG: Tự động cộng SL vào tồn kho
   - Nếu ĐỔI HÀNG: Xử lý thủ công
   - Cập nhật số tiền hoàn
   ↓
5. Hoàn tất
```

### 3. Cập nhật Tồn kho

**Khi hoàn tất Trả hàng:**
```sql
UPDATE SanPham 
SET SoLuong = SoLuong + @SoLuongTra 
WHERE MaSanPham = @MaSanPham
```

**Transaction đảm bảo:**
- Tất cả sản phẩm được cộng lại
- Nếu có lỗi → Rollback toàn bộ
- Trạng thái chỉ chuyển "Hoàn tất" khi update thành công

---

## 📊 TESTING

### Test đã thực hiện:

✅ **Database:**
- Script CREATE_ADMIN.sql chạy thành công
- Tạo 3 bảng: GiaoHang, HoanDoiTra, ChiTietHoanDoiTra
- Foreign keys và indexes hoạt động đúng

✅ **Backend API:**
- GET /api/giaohang - ✅ Success (Total: 0)
- POST /api/giaohang - ✅ Created (ID: 1)
- GET /api/giaohang/1 - ✅ Success
- GET /api/hoandoitra - ✅ Success (Total: 0)
- Authentication middleware - ✅ Working

✅ **Frontend:**
- Sidebar menu hiển thị 2 items mới
- Routes /deliveries, /returns hoạt động
- Layout và theme đồng bộ với hệ thống

---

## 🎯 DESIGN PRINCIPLES

### 1. Giao diện đồng bộ 100%
- ✅ Màu hồng (#ec4899) chủ đạo
- ✅ Font tiếng Việt hiển thị đúng
- ✅ Bo góc 8px, shadow nhẹ
- ✅ Icons SVG thay vì emoji
- ✅ Responsive mobile/tablet/desktop

### 2. UX Pattern nhất quán
- ✅ Modal form centered với overlay
- ✅ Toast notifications (alerts)
- ✅ Confirmation dialogs trước delete/approve
- ✅ Loading states khi call API
- ✅ Empty states khi không có data

### 3. Data Format
- ✅ Không hiển thị ID internal (MaGiaoHang, MaHoanDoiTra)
- ✅ STT: 1, 2, 3, 4...
- ✅ Format tiền: 350,000 đ
- ✅ Format ngày: dd/mm/yyyy
- ✅ Text căn trái, số căn phải

---

## 📁 FILES CREATED

### Backend (5 files)
```
backend/src/routes/
├── giaohang.ts          (310 lines)
└── hoandoitra.ts        (456 lines)

backend/src/server.ts    (updated - import + register routes)
```

### Frontend (4 files)
```
frontend-admin/src/pages/
├── Deliveries.tsx       (538 lines)
├── DeliveryDetail.tsx   (424 lines)
├── Returns.tsx          (722 lines)
└── ReturnDetail.tsx     (536 lines)

frontend-admin/src/components/
└── Layout.tsx           (updated - +2 menu items)

frontend-admin/src/
└── App.tsx              (updated - +4 routes)
```

### Database (1 file)
```
ADD_DELIVERY_RETURN_TABLES.sql  (156 lines)
```

### Documentation (1 file)
```
MODULE_GIAOHANG_HOANDOITRA.md   (this file)
```

---

## ✅ CHECKLIST COMPLETION

- [x] Database tables với foreign keys và indexes
- [x] Backend API routes đầy đủ CRUD
- [x] Authentication & authorization
- [x] Search, filter, pagination
- [x] Transaction cho business logic
- [x] Inventory update khi hoàn tất trả hàng
- [x] Frontend pages với responsive design
- [x] Modal forms với validation
- [x] Timeline trạng thái visual
- [x] Navigation sidebar update
- [x] Routes configuration
- [x] Testing API endpoints
- [x] Integration với hệ thống hiện có
- [x] Không phá vỡ chức năng cũ

---

## 🚀 CÁC SỬ DỤNG

### 1. Khởi động hệ thống

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend-admin
npm run dev
```

### 2. Truy cập

- **Backend API:** http://localhost:3000
- **Admin Web:** http://localhost:5174
- **Login:** admin / admin123

### 3. Tạo database tables

```bash
sqlcmd -S "ACER\MS1SQLSERVER" -U beauty_user -P "Beauty@2024" -d QuanLyCuaHangMyPham -i ADD_DELIVERY_RETURN_TABLES.sql
```

### 4. Sử dụng module

**Giao hàng:**
1. Vào menu "🚚 Giao hàng"
2. Click "Thêm mới"
3. Chọn hóa đơn → Thông tin tự động điền
4. Nhập thông tin vận chuyển
5. Lưu → Cập nhật trạng thái theo timeline

**Hoàn/Đổi trả:**
1. Vào menu "↩️ Hoàn đổi trả"
2. Click "Thêm mới"
3. Chọn hóa đơn → Chọn sản phẩm từ hóa đơn
4. Nhập lý do và mô tả
5. Gửi yêu cầu → Admin duyệt/từ chối
6. Hoàn tất → Tồn kho tự động cập nhật

---

## 🎓 LESSONS LEARNED

### 1. SQL Query Optimization
- Tránh SELECT duplicate columns (MaHoaDon xuất hiện ở cả GiaoHang và HoaDon)
- Dùng subquery để tính TongTien thay vì join

### 2. TypeScript Strict Mode
- rowsAffected là array, phải dùng `rowsAffected[0]`
- Type casting cẩn thận với SQL results

### 3. React State Management
- Dynamic form fields (product selection) cần state management cẩn thận
- Modal state phải reset khi đóng

### 4. Business Logic
- Transaction quan trọng cho multi-step operations
- Inventory update phải có rollback mechanism

---

## 📞 SUPPORT

**Tài liệu liên quan:**
- `README.md` - Hướng dẫn chính
- `README_SYSTEM.md` - Chi tiết hệ thống
- `CREATE_ADMIN.sql` - Database setup
- `VERIFY_DATABASE.sql` - Verify data

**API Testing:**
```bash
# Health check
curl http://localhost:3000/api/health

# Get deliveries (cần token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/giaohang

# Get returns (cần token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/hoandoitra
```

---

<div align="center">

### 🌸 BEAUTY STORE
**Module Giao hàng và Hoàn/Đổi trả**

Backend TypeScript ✅ | Frontend React ✅ | Database SQL Server ✅

*Hoàn thành: 07/09/2026*

</div>
