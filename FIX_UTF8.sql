USE QuanLyCuaHangMyPham;
GO

DELETE FROM ChiTietHoanDoiTra;
DELETE FROM HoanDoiTra;
DELETE FROM GiaoHang WHERE MaHoaDon IN (2,3,4,5);

-- Giao hàng
INSERT INTO GiaoHang (MaHoaDon, DiaChiGiaoHang, SoDienThoai, DonViVanChuyen, MaVanDon, NgayGiao, PhiVanChuyen, TrangThai, GhiChu) VALUES 
(2, N'45 Trần Duy Hưng, Hà Nội', '0902222222', 'GHTK', 'GHTK002345', '2026-09-05', 30000, N'Đang giao', N'Shipper đang giao hàng'),
(3, N'12 Nguyễn Trãi, Hà Nội', '0903333333', 'Viettel Post', 'VTP003456', '2026-09-06', 22000, N'Chờ giao', N'Đơn hàng đang được xử lý'),
(4, N'Hưng Yên', '0904444444', 'J&T Express', 'JT004567', '2026-09-06', 28000, N'Đã giao', N'Giao hàng thành công'),
(5, N'Hà Nội', '0905555555', 'GHN', 'GHN005678', '2026-09-07', 25000, N'Giao thất bại', N'Không liên lạc được khách hàng');

-- Hoàn/Đổi trả
DECLARE @M1 INT, @M2 INT, @M3 INT, @M4 INT, @M5 INT;

INSERT INTO HoanDoiTra (MaHoaDon, MaKhachHang, LoaiYeuCau, LyDo, MoTaChiTiet, TrangThai, NgayYeuCau, NgayXuLy, SoTienHoan) VALUES (1, 1, N'Đổi hàng', N'Sản phẩm bị lỗi', N'Son bị gãy đầu, yêu cầu đổi sản phẩm mới', N'Đã duyệt', '2026-09-06 10:30:00', '2026-09-06 14:00:00', 199000);
SET @M1 = SCOPE_IDENTITY();
INSERT INTO ChiTietHoanDoiTra (MaHoanDoiTra, MaSanPham, SoLuong, DonGia, ThanhTien, TrangThaiSanPham) VALUES (@M1, 2, 1, 199000, 199000, N'Sản phẩm bị gãy');

INSERT INTO HoanDoiTra (MaHoaDon, MaKhachHang, LoaiYeuCau, LyDo, MoTaChiTiet, TrangThai, NgayYeuCau, SoTienHoan) VALUES (2, 2, N'Trả hàng', N'Không phù hợp', N'Sữa rửa mặt không phù hợp với da, yêu cầu trả hàng', N'Chờ xử lý', '2026-09-06 15:20:00', 160000);
SET @M2 = SCOPE_IDENTITY();
INSERT INTO ChiTietHoanDoiTra (MaHoanDoiTra, MaSanPham, SoLuong, DonGia, ThanhTien, TrangThaiSanPham) VALUES (@M2, 5, 1, 160000, 160000, N'Còn nguyên seal');

INSERT INTO HoanDoiTra (MaHoaDon, MaKhachHang, LoaiYeuCau, LyDo, MoTaChiTiet, TrangThai, NgayYeuCau, NgayXuLy, SoTienHoan) VALUES (3, 3, N'Đổi hàng', N'Giao sai sản phẩm', N'Đặt son 3CE nhưng giao nhầm tone màu', N'Đang xử lý', '2026-09-07 09:15:00', '2026-09-07 11:00:00', 560000);
SET @M3 = SCOPE_IDENTITY();
INSERT INTO ChiTietHoanDoiTra (MaHoanDoiTra, MaSanPham, SoLuong, DonGia, ThanhTien, TrangThaiSanPham) VALUES (@M3, 7, 2, 280000, 560000, N'Sai màu');

INSERT INTO HoanDoiTra (MaHoaDon, MaKhachHang, LoaiYeuCau, LyDo, MoTaChiTiet, TrangThai, NgayYeuCau, NgayXuLy, SoTienHoan) VALUES (4, 4, N'Trả hàng', N'Sản phẩm bị hư hỏng', N'Chai dầu gội bị vỡ trong quá trình vận chuyển', N'Hoàn tất', '2026-09-07 14:30:00', '2026-09-07 16:00:00', 260000);
SET @M4 = SCOPE_IDENTITY();
INSERT INTO ChiTietHoanDoiTra (MaHoanDoiTra, MaSanPham, SoLuong, DonGia, ThanhTien, TrangThaiSanPham) VALUES (@M4, 10, 1, 260000, 260000, N'Chai bị vỡ');

INSERT INTO HoanDoiTra (MaHoaDon, MaKhachHang, LoaiYeuCau, LyDo, MoTaChiTiet, TrangThai, NgayYeuCau, NgayXuLy, GhiChuNguoiXuLy, SoTienHoan) VALUES (5, 5, N'Trả hàng', N'Không đúng mô tả', N'Yêu cầu trả hàng vì sản phẩm không đúng mô tả', N'Từ chối', '2026-09-07 16:45:00', '2026-09-07 18:00:00', N'Sản phẩm đã qua sử dụng, không đủ điều kiện trả hàng', 0);
SET @M5 = SCOPE_IDENTITY();
INSERT INTO ChiTietHoanDoiTra (MaHoanDoiTra, MaSanPham, SoLuong, DonGia, ThanhTien, TrangThaiSanPham) VALUES (@M5, 1, 1, 350000, 350000, N'Đã mở seal');

PRINT N'Hoàn tất!';
GO