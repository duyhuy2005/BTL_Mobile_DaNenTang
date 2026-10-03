# Mobile API contract

## Runtime

Mobile uses the existing backend at `EXPO_PUBLIC_API_URL`. Its source fallback is `http://localhost:3000/api` for local simulators. When testing with Expo Go on a physical phone, set this single variable in `mobile/.env` to the computer's reachable LAN address, keeping port `3000` and the `/api` suffix. The backend uses the existing SQL Server database; this project does not create a database or another server.

The API client is Axios-based. It loads `token` from AsyncStorage and sends `Authorization: Bearer <token>` on every request. A `401` response clears `token`, `user`, and `khachHang` from AsyncStorage.

## Authentication

Public endpoints:

- `POST /auth/login`
  - Request: `{ TenDangNhap, MatKhau }`
  - Success: `{ success, message, data: { token, user, khachHang } }`
  - JWT expires after 24 hours and contains `MaTaiKhoan`, `TenDangNhap`, and `VaiTro`.
- `POST /auth/register`
  - Request: `{ TenDangNhap, MatKhau, HoTen?, Email?, SoDienThoai?, VaiTro? }`
  - Success: `201 { success, message, data: { MaTaiKhoan } }`
  - Supplying `HoTen` also creates the `KhachHang` row.

Roles returned by the backend are `Admin`, `NhanVien`, and `KhachHang`. The backend currently exposes `authorizeAdmin`, but the routes mounted by `server.ts` use authentication only; Mobile should use `KhachHang` accounts and must not send admin/staff operations.

## Customer operations currently mounted

All routes below require the Bearer token.

- `GET /sanpham?page=1&limit=20&search=...&maDanhMuc=...` -> `{ success, data: SanPham[], pagination }`
- `GET /sanpham/:id` -> `{ success, data: SanPham }`
- `GET /danhmuc` -> `{ success, data: DanhMuc[] }`
- `GET /danhmuc/:id` -> `{ success, data: DanhMuc }`
- `GET /giohang/:maKhachHang` -> `{ success, data: { MaGioHang, MaKhachHang?, items: ItemGioHang[] } }`
- `POST /giohang/:maKhachHang/them` body `{ MaSanPham, SoLuong }`
- `PUT /giohang/:maKhachHang/capnhat` body `{ MaSanPham, SoLuong }`; zero or less removes the item
- `DELETE /giohang/:maKhachHang/xoa/:maSanPham`
- `GET /hoadon?maKhachHang=...&trangThai=...&page=1&limit=10` -> paginated `HoaDon[]`
- `GET /hoadon/:id` -> `HoaDon` with `ChiTiet[]`
- `POST /hoadon` body `{ MaKhachHang, MaNhanVien?, PhuongThucThanhToan?, GhiChu?, danhSachSanPham: [{ MaSanPham, SoLuong, DonGia }] }`

The invoice endpoint calculates line totals from the submitted `DonGia` and `SoLuong`; the current backend does not clear the cart after checkout.

## Models

Backend product/category/customer fields use PascalCase names such as `MaSanPham`, `TenSanPham`, `GiaBan`, `HinhAnh`, `MaKhachHang`, and `HoTen`. Pagination is `{ page, limit, total, totalPages }`. Standard errors are `{ success: false, message }` with HTTP `400`, `401`, `403`, `404`, or `500`.

## Backend routes not currently available to Mobile

`server.ts` does not mount the route files for `baocao`, `giaohang`, `hoandoitra`, `inventory`, `khuyenmai`, `nhacungcap`, `phieunhap`, `phieuxuat`, `upload`, or `yeuthich`. Their route declarations exist in the backend source, but requests to those paths currently return `404`; no Mobile code should depend on them until the backend mounts them.

## Expo Go

1. Copy `.env.example` to `.env` and replace the IP with the backend computer's LAN IPv4 address.
2. Start the backend with its existing command from `backend`.
3. From `mobile`, run `npm start`.
4. Scan the QR code in Expo Go. The phone and backend computer must be on the same network.

For an Android emulator, `http://10.0.2.2:3000/api` normally points to the host machine. For iOS Simulator, use `http://localhost:3000/api`.
