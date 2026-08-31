-- ========================================
-- BEAUTY STORE - Tạo dữ liệu demo
-- ========================================

USE QuanLyCuaHangMyPham;
GO

-- 1. Tạo tài khoản Admin
-- Mật khẩu: admin123 (đã hash bcrypt)
INSERT INTO TaiKhoan (TenDangNhap, MatKhau, VaiTro, TrangThai)
VALUES ('admin', '$2a$10$ztBO197bm6eiLaFOvKu/Ue3A/dttnlDtJ2eMCM7c/Ny.JPyTNHGxG', N'Admin', N'Hoạt động');

-- Hoặc tạo bằng API (khuyến nghị):
-- POST http://localhost:3000/api/auth/register
-- Body: { "TenDangNhap": "admin", "MatKhau": "admin123", "VaiTro": "Admin" }

-- 2. Tạo nhân viên
INSERT INTO NhanVien (HoTen, SoDienThoai, Email, DiaChi, ChucVu, TrangThai)
VALUES 
(N'Nguyễn Thị B', '0912345678', 'nhanvien1@beauty.vn', N'123 Hoàng Mai, Hà Nội', N'Nhân viên bán hàng', N'Đang làm'),
(N'Trần Văn C', '0923456789', 'nhanvien2@beauty.vn', N'456 Cầu Giấy, Hà Nội', N'Quản lý kho', N'Đang làm');

-- 3. Tạo khách hàng
INSERT INTO KhachHang (HoTen, SoDienThoai, Email, DiaChi, TrangThai)
VALUES 
(N'Lê Thị D', '0934567890', 'khach1@email.com', N'789 Đống Đa, Hà Nội', N'Hoạt động'),
(N'Phạm Văn E', '0945678901', 'khach2@email.com', N'321 Ba Đình, Hà Nội', N'Hoạt động'),
(N'Hoàng Thị F', '0956789012', 'khach3@email.com', N'654 Thanh Xuân, Hà Nội', N'Hoạt động');

-- 4. Tạo danh mục
INSERT INTO DanhMuc (TenDanhMuc, MoTa, HinhAnh, TrangThai)
VALUES 
(N'Son môi', N'Các loại son môi cao cấp từ thương hiệu nổi tiếng', 'https://placehold.co/200x200/ffc0cb/white?text=Son', N'Hoạt động'),
(N'Kem dưỡng da', N'Kem dưỡng da mặt và body chăm sóc da toàn diện', 'https://placehold.co/200x200/ffc0cb/white?text=Kem', N'Hoạt động'),
(N'Nước hoa', N'Nước hoa chính hãng các thương hiệu xa xỉ', 'https://placehold.co/200x200/ffc0cb/white?text=Perfume', N'Hoạt động'),
(N'Mặt nạ', N'Mặt nạ dưỡng da từ Hàn Quốc, Nhật Bản', 'https://placehold.co/200x200/ffc0cb/white?text=Mask', N'Hoạt động'),
(N'Tẩy trang', N'Sản phẩm tẩy trang an toàn, hiệu quả', 'https://placehold.co/200x200/ffc0cb/white?text=Cleaner', N'Hoạt động');

-- 5. Tạo sản phẩm
INSERT INTO SanPham (TenSanPham, MaDanhMuc, ThuongHieu, GiaNhap, GiaBan, SoLuong, MoTa, HinhAnh, TrangThai, NgayTao)
VALUES 
-- Son môi
(N'Son Dior Rouge 999', 1, N'Dior', 800000, 1200000, 50, N'Son môi đỏ cổ điển, lâu trôi, mịn môi', 'https://placehold.co/300x300/ff69b4/white?text=Dior+999', N'Còn hàng', GETDATE()),
(N'Son YSL Rouge Pur Couture', 1, N'YSL', 900000, 1350000, 40, N'Son lì mịn môi, màu chuẩn', 'https://placehold.co/300x300/ff69b4/white?text=YSL', N'Còn hàng', GETDATE()),
(N'Son MAC Ruby Woo', 1, N'MAC', 450000, 650000, 80, N'Son đỏ cam best-seller của MAC', 'https://placehold.co/300x300/ff69b4/white?text=MAC', N'Còn hàng', GETDATE()),

-- Kem dưỡng da
(N'Kem dưỡng Chanel Le Lift', 2, N'Chanel', 1500000, 2500000, 30, N'Kem chống lão hóa cao cấp', 'https://placehold.co/300x300/ffc0cb/white?text=Chanel', N'Còn hàng', GETDATE()),
(N'Kem Laneige Water Bank', 2, N'Laneige', 600000, 850000, 60, N'Kem cấp ẩm cho da khô', 'https://placehold.co/300x300/ffc0cb/white?text=Laneige', N'Còn hàng', GETDATE()),
(N'Kem Sulwhasoo Concentrated Ginseng', 2, N'Sulwhasoo', 2000000, 3200000, 20, N'Kem nhân sâm đặc biệt chống lão hóa', 'https://placehold.co/300x300/ffc0cb/white?text=Sulwhasoo', N'Còn hàng', GETDATE()),

-- Nước hoa
(N'Nước hoa Chanel No.5', 3, N'Chanel', 2500000, 3800000, 25, N'Nước hoa huyền thoại', 'https://placehold.co/300x300/ffb6c1/white?text=Chanel+5', N'Còn hàng', GETDATE()),
(N'Nước hoa Dior J\'adore', 3, N'Dior', 2300000, 3500000, 30, N'Nước hoa ngọt ngào, quyến rũ', 'https://placehold.co/300x300/ffb6c1/white?text=Jadore', N'Còn hàng', GETDATE()),

-- Mặt nạ
(N'Mặt nạ Innisfree My Real Squeeze', 4, N'Innisfree', 20000, 35000, 200, N'Mặt nạ giấy chiết xuất tự nhiên', 'https://placehold.co/300x300/ffe4e1/white?text=Innisfree', N'Còn hàng', GETDATE()),
(N'Mặt nạ Mediheal N.M.F', 4, N'Mediheal', 30000, 50000, 150, N'Mặt nạ cấp ẩm chuyên sâu', 'https://placehold.co/300x300/ffe4e1/white?text=Mediheal', N'Còn hàng', GETDATE()),

-- Tẩy trang
(N'Nước tẩy trang Bioderma', 5, N'Bioderma', 280000, 420000, 70, N'Nước tẩy trang cho da nhạy cảm', 'https://placehold.co/300x300/fff0f5/white?text=Bioderma', N'Còn hàng', GETDATE()),
(N'Dầu tẩy trang DHC', 5, N'DHC', 450000, 680000, 50, N'Dầu tẩy trang Nhật Bản', 'https://placehold.co/300x300/fff0f5/white?text=DHC', N'Còn hàng', GETDATE());

-- 6. Tạo hóa đơn demo (lấy MaNhanVien và MaKhachHang vừa tạo)
DECLARE @MaNhanVien1 INT = (SELECT TOP 1 MaNhanVien FROM NhanVien ORDER BY MaNhanVien);
DECLARE @MaKhach1 INT = (SELECT TOP 1 MaKhachHang FROM KhachHang ORDER BY MaKhachHang);
DECLARE @MaKhach2 INT = (SELECT MaKhachHang FROM KhachHang ORDER BY MaKhachHang OFFSET 1 ROW FETCH NEXT 1 ROW ONLY);

DECLARE @MaHoaDon1 INT, @MaHoaDon2 INT;

-- Hóa đơn 1
INSERT INTO HoaDon (MaKhachHang, MaNhanVien, NgayLap, PhuongThucThanhToan, TrangThai, GhiChu)
VALUES (@MaKhach1, @MaNhanVien1, GETDATE(), N'Tiền mặt', N'Đã thanh toán', N'Khách hàng thân thiết');
SET @MaHoaDon1 = SCOPE_IDENTITY();

INSERT INTO ChiTietHoaDon (MaHoaDon, MaSanPham, SoLuong, DonGia, ThanhTien)
VALUES 
(@MaHoaDon1, 1, 2, 1200000, 2400000),  -- 2 son Dior
(@MaHoaDon1, 5, 1, 850000, 850000);     -- 1 kem Laneige

-- Hóa đơn 2
INSERT INTO HoaDon (MaKhachHang, MaNhanVien, NgayLap, PhuongThucThanhToan, TrangThai, GhiChu)
VALUES (@MaKhach2, @MaNhanVien1, DATEADD(day, -1, GETDATE()), N'Chuyển khoản', N'Đã thanh toán', N'Giao hàng tận nơi');
SET @MaHoaDon2 = SCOPE_IDENTITY();

INSERT INTO ChiTietHoaDon (MaHoaDon, MaSanPham, SoLuong, DonGia, ThanhTien)
VALUES 
(@MaHoaDon2, 7, 1, 3800000, 3800000),   -- 1 nước hoa Chanel
(@MaHoaDon2, 9, 10, 35000, 350000);     -- 10 mặt nạ Innisfree

-- Cập nhật số lượng tồn kho
UPDATE SanPham SET SoLuong = SoLuong - 2 WHERE MaSanPham = 1;
UPDATE SanPham SET SoLuong = SoLuong - 1 WHERE MaSanPham = 5;
UPDATE SanPham SET SoLuong = SoLuong - 1 WHERE MaSanPham = 7;
UPDATE SanPham SET SoLuong = SoLuong - 10 WHERE MaSanPham = 9;

PRINT '✅ Tạo dữ liệu demo thành công!';
PRINT '';
PRINT '🔑 ĐĂNG NHẬP ADMIN:';
PRINT '   Tên đăng nhập: admin';
PRINT '   Mật khẩu: admin123';
PRINT '';
PRINT '📊 DỮ LIỆU ĐÃ TẠO:';
PRINT '   - 1 Admin';
PRINT '   - 2 Nhân viên';
PRINT '   - 3 Khách hàng';
PRINT '   - 5 Danh mục';
PRINT '   - 12 Sản phẩm';
PRINT '   - 2 Hóa đơn';
GO
