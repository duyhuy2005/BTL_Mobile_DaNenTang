# 🌸 BEAUTY STORE

> Hệ thống quản lý cửa hàng mỹ phẩm hoàn chỉnh với Backend TypeScript, Admin React Web, và Mobile React Native

[![Status](https://img.shields.io/badge/Status-Complete-success)]()
[![Backend](https://img.shields.io/badge/Backend-TypeScript-blue)]()
[![Frontend](https://img.shields.io/badge/Frontend-React-cyan)]()
[![Mobile](https://img.shields.io/badge/Mobile-React%20Native-purple)]()

---

## ⚡ Quick Start

### Admin Web System

#### 1. Tạo tài khoản Admin
```sql
-- Chạy file CREATE_ADMIN.sql trong SQL Server Management Studio
```

#### 2. Khởi động hệ thống
```powershell
# Backend (Terminal 1)
cd backend
npm run dev

# Admin Web (Terminal 2)
cd frontend-admin
npm run dev
```

#### 3. Đăng nhập
Truy cập: http://localhost:5173
- **Username:** `admin`
- **Password:** `admin123`

### Mobile App (React Native)

#### 1. Start the app
```bash
npx expo start
```

In the output, you'll find options to open the app in a:
- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go)

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

#### 2. Get a fresh project
When you're ready, run:
```bash
npm run reset-project
```

---

## 📋 Tổng quan

Hệ thống BEAUTY STORE gồm 3 thành phần chính:

| Thành phần | Công nghệ | Port | Trạng thái |
|------------|-----------|------|------------|
| **Backend API** | Node.js + Express + TypeScript + SQL Server | 3000 | ✅ Running |
| **Admin Web** | React + Vite + Tailwind CSS | 5173 | ✅ Running |
| **Mobile App** | React Native + Expo | - | ✅ Ready |

---

## ✨ Tính năng

### 🎨 Admin Web
- ✅ **Dashboard** - Stats cards + Biểu đồ doanh thu 7 ngày + Top sản phẩm
- ✅ **Quản lý Sản phẩm** - CRUD + Phân trang + Tìm kiếm + Filter
- ✅ **Quản lý Danh mục** - CRUD danh mục sản phẩm
- ✅ **Quản lý Hóa đơn** - CRUD + **Download PDF**
- ✅ **Quản lý Khách hàng** - CRUD + Tìm kiếm + Lịch sử mua

### 📱 Mobile App
- ✅ Trang chủ hiển thị sản phẩm (grid 2 cột)
- ✅ Tìm kiếm + Lọc theo danh mục
- ✅ Format tiền VN

### 🔐 Backend API
- ✅ JWT Authentication
- ✅ RESTful API chuẩn
- ✅ Transaction tạo hóa đơn
- ✅ PDF export (PDFKit)
- ✅ Pagination + Search + Filter

---

## 🎯 Thiết kế theo yêu cầu

- ❌ **KHÔNG hiển thị mã ID** (MaSanPham, MaHoaDon)
- ✅ **Chỉ STT:** 1, 2, 3, 4...
- ✅ **Chữ căn trái, số căn phải**
- ✅ **Format tiền:** 350,000 đ
- ✅ **Màu hồng (#ec4899)** chủ đạo
- ✅ **Admin web responsive**
- ✅ **PDF hóa đơn chuẩn**

---

## 🗂️ Cấu trúc project

```
BTL_Mobile_DaNenTang/
├── backend/                 # Backend TypeScript
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── config/          # Database config
│   │   ├── middleware/      # Auth middleware
│   │   └── server.ts        # Express server
│   └── .env                 # Database config
│
├── frontend-admin/          # Admin React Web
│   └── src/
│       ├── pages/           # Dashboard, Products, etc.
│       ├── components/      # Layout, reusable components
│       └── services/api.ts  # Axios API
│
├── app/                     # Mobile React Native
│   └── (tabs)/index.tsx     # Home screen
│
└── services/api.ts          # Mobile API service
```

---

## 🔌 API Endpoints

### Auth
```
POST /api/auth/login          - Đăng nhập
POST /api/auth/register       - Đăng ký
```

### Dashboard
```
GET  /api/dashboard/stats            - Thống kê tổng quan
GET  /api/dashboard/top-products     - Top sản phẩm bán chạy
```

### Sản phẩm
```
GET    /api/sanpham                  - Danh sách (pagination, search, filter)
GET    /api/sanpham/:id              - Chi tiết
POST   /api/sanpham                  - Thêm mới
PUT    /api/sanpham/:id              - Cập nhật
DELETE /api/sanpham/:id              - Xóa
```

### Hóa đơn
```
GET    /api/hoadon                   - Danh sách
GET    /api/hoadon/:id               - Chi tiết
GET    /api/hoadon/:id/pdf           - Download PDF
POST   /api/hoadon                   - Tạo hóa đơn (transaction)
```

_Xem đầy đủ trong `TEST_API.md`_

---

## 📚 Tài liệu

| File | Mô tả |
|------|-------|
| **BAT_DAU_O_DAY.md** | ⭐ Bắt đầu từ đây |
| **CACH_SU_DUNG.md** | 📖 Hướng dẫn sử dụng chi tiết |
| **HUONG_DAN_SETUP.md** | 🔧 Setup từ đầu |
| **TEST_API.md** | 🧪 Test API endpoints |
| **README_HOAN_THANH.md** | ✅ Tổng kết dự án |
| **THONG_TIN_HE_THONG.txt** | ℹ️ Thông tin hệ thống |

---

## 🗄️ Database

- **Server:** ACER\MS1SQLSERVER
- **Database:** QuanLyCuaHangMyPham
- **User:** beauty_user / Beauty@2024
- **Authentication:** SQL Server

### Bảng chính
- TaiKhoan, NhanVien, KhachHang
- DanhMuc, SanPham
- HoaDon, ChiTietHoaDon
- GioHang, ChiTietGioHang

---

## 🚀 Scripts

```powershell
# Root project
npm run backend          # Chạy backend
npm run admin            # Chạy admin web
npm run mobile           # Chạy mobile app

# Hoặc dùng script tự động
.\START_ALL.ps1
```

---

## 📦 Công nghệ

### Backend
- Node.js 18+ | Express 4.x | TypeScript 5.x
- mssql (SQL Server) | JWT | bcryptjs | PDFKit

### Admin Frontend
- React 18 | Vite 5 | Tailwind CSS 3
- React Router v6 | Axios | Recharts

### Mobile
- React Native | Expo SDK v54
- AsyncStorage | Axios

---

## 🎨 Screenshots

### Dashboard
- 4 Stats cards (Doanh thu, Hóa đơn, Sản phẩm, Khách hàng)
- Biểu đồ LineChart 7 ngày
- Top 5 sản phẩm bán chạy

### Quản lý Sản phẩm
- Bảng responsive, phân trang 10/trang
- Tìm kiếm, lọc danh mục
- Modal thêm/sửa đẹp

### PDF Hóa đơn
- Header BEAUTY STORE
- Thông tin khách hàng
- Bảng chi tiết (STT, Tên SP, SL, Giá, Thành tiền)
- Tổng tiền in đậm

---

## ✅ Checklist

- [x] Backend TypeScript + Express + SQL Server
- [x] Auth JWT + bcrypt password hashing
- [x] Dashboard với stats + biểu đồ
- [x] CRUD Sản phẩm/Danh mục/Hóa đơn/Khách hàng
- [x] Phân trang, tìm kiếm, filter
- [x] PDF export hóa đơn (PDFKit)
- [x] Admin React web responsive
- [x] Mobile React Native
- [x] STT 1-2-3 (không hiển thị mã)
- [x] Format tiền 350,000 đ
- [x] Màu hồng chủ đạo

---

## 🚨 Troubleshooting

### Backend không chạy?
```powershell
cd backend
npm install
npm run dev
```

### Không đăng nhập được?
```sql
-- Chạy file CREATE_ADMIN.sql để tạo admin
```

### CORS error?
- Backend đã config CORS
- Restart backend
- Clear browser cache

---

## 📞 Support

Gặp vấn đề? Đọc:
1. `CACH_SU_DUNG.md` - Hướng dẫn chi tiết
2. `HUONG_DAN_SETUP.md` - Setup từ đầu
3. Terminal backend log
4. Browser console (F12)

---

## 📝 License

Private project - BTL Mobile Da Nền Tảng

---

## 🎯 Next Steps

1. ✅ Chạy `CREATE_ADMIN.sql`
2. ✅ Đăng nhập http://localhost:5173
3. ✅ Test CRUD sản phẩm
4. ✅ Download PDF hóa đơn
5. ✅ Đọc `CACH_SU_DUNG.md`

---

<div align="center">

### 🌸 BEAUTY STORE
**Quản lý cửa hàng mỹ phẩm chuyên nghiệp**

Backend TypeScript ✅ | Admin React Web ✅ | Mobile React Native ✅

*Hoàn thành: 29/08/2026*

</div>
