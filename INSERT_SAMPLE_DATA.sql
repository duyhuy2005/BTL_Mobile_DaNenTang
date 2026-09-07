-- =============================================
-- Script: Thêm dữ liệu mẫu cho Giao hàng và Hoàn/Đổi trả
-- Beauty Store Management System
-- =============================================

USE QuanLyCuaHangMyPham;
GO

PRINT N'═══════════════════════════════════════════';
PRINT N'Bắt đầu thêm dữ liệu mẫu...';
PRINT N'═══════════════════════════════════════════';
PRINT N'';

-- =============================================
-- 1. THÊM DỮ LIỆU GIAO HÀNG (4 bản ghi nữa, đã có 1)
-- =============================================

PRINT N'📦 Thêm dữ liệu Giao hàng...';

-- Giao hàng 2: Hóa đơn 2 - Đang giao
IF NOT EXISTS (SELECT 1 FROM GiaoHang WHERE MaHoaDon = 2)
BEGIN
    INSERT INTO GiaoHang (MaHoaDon, DiaChiGiaoHang, SoDienThoai, DonViVanChuyen, MaVanDon, NgayGiao, PhiVanChuyen, TrangThai, GhiChu)
    VALUES (2, N'45 Trần Duy Hưng, Hà Nội', '0902222222', 'GHTK', 'GHTK002345', '2026-09-05', 30000, N'Đang giao', N'Shipper đang giao hàng');
    PRINT N'   ✅ Thêm giao hàng cho HĐ #2 - GHTK - Đang giao';
END
ELSE
    PRINT N'   ⚠️ Giao hàng cho HĐ #2 đã tồn tại';

-- Giao hàng 3: Hóa đơn 3 - Chờ giao
IF NOT EXISTS (SELECT 1 FROM GiaoHang WHERE MaHoaDon = 3)
BEGIN
    INSERT INTO GiaoHang (MaHoaDon, DiaChiGiaoHang, SoDienThoai, DonViVanChuyen, MaVanDon, NgayGiao, PhiVanChuyen, TrangThai, GhiChu)
    VALUES (3, N'12 Nguyễn Trãi, Hà Nội', '0903333333', 'Viettel Post', 'VTP003456', '2026-09-06', 22000, N'Chờ giao', N'Đơn hàng đang được xử lý');
    PRINT N'   ✅ Thêm giao hàng cho HĐ #3 - Viettel Post - Chờ giao';
END
ELSE
    PRINT N'   ⚠️ Giao hàng cho HĐ #3 đã tồn tại';

-- Giao hàng 4: Hóa đơn 4 - Đã giao
IF NOT EXISTS (SELECT 1 FROM GiaoHang WHERE MaHoaDon = 4)
BEGIN
    INSERT INTO GiaoHang (MaHoaDon, DiaChiGiaoHang, SoDienThoai, DonViVanChuyen, MaVanDon, NgayGiao, PhiVanChuyen, TrangThai, GhiChu)
    VALUES (4, N'Hưng Yên', '0904444444', 'J&T Express', 'JT004567', '2026-09-06', 28000, N'Đã giao', N'Giao hàng thành công');
    PRINT N'   ✅ Thêm giao hàng cho HĐ #4 - J&T Express - Đã giao';
END
ELSE
    PRINT N'   ⚠️ Giao hàng cho HĐ #4 đã tồn tại';

-- Giao hàng 5: Hóa đơn 5 - Giao thất bại
IF NOT EXISTS (SELECT 1 FROM GiaoHang WHERE MaHoaDon = 5)
BEGIN
    INSERT INTO GiaoHang (MaHoaDon, DiaChiGiaoHang, SoDienThoai, DonViVanChuyen, MaVanDon, NgayGiao, PhiVanChuyen, TrangThai, GhiChu)
    VALUES (5, N'Hà Nội', '0905555555', 'GHN', 'GHN005678', '2026-09-07', 25000, N'Giao thất bại', N'Không liên lạc được khách hàng');
    PRINT N'   ✅ Thêm giao hàng cho HĐ #5 - GHN - Giao thất bại';
END
ELSE
    PRINT N'   ⚠️ Giao hàng cho HĐ #5 đã tồn tại';

PRINT N'';

-- =============================================
-- 2. THÊM DỮ LIỆU HOÀN/ĐỔI TRẢ
-- =============================================

PRINT N'↩️ Thêm dữ liệu Hoàn/Đổi trả...';

-- Hoàn/Đổi trả 1: Hóa đơn 1 - Đổi hàng - Đã duyệt
IF NOT EXISTS (SELECT 1 FROM HoanDoiTra WHERE MaHoaDon = 1 AND LoaiYeuCau = N'Đổi hàng')
BEGIN
    DECLARE @MaHoanDoiTra1 INT;
    
    -- Insert yêu cầu hoàn/đổi trả
    INSERT INTO HoanDoiTra (MaHoaDon, MaKhachHang, LoaiYeuCau, LyDo, MoTaChiTiet, TrangThai, NgayYeuCau, NgayXuLy, SoTienHoan)
    VALUES (1, 1, N'Đổi hàng', N'Sản phẩm bị lỗi', N'Son bị gãy đầu, yêu cầu đổi sản phẩm mới', N'Đã duyệt', '2026-09-06 10:30:00', '2026-09-06 14:00:00', 199000);
    
    SET @MaHoanDoiTra1 = SCOPE_IDENTITY();
    
    -- Insert chi tiết (Son kem lì Black Rouge - MaSanPham = 2)
    INSERT INTO ChiTietHoanDoiTra (MaHoanDoiTra, MaSanPham, SoLuong, DonGia, ThanhTien, TrangThaiSanPham)
    VALUES (@MaHoanDoiTra1, 2, 1, 199000, 199000, N'Sản phẩm bị gãy');
    
    PRINT N'   ✅ Thêm yêu cầu đổi hàng cho HĐ #1 - Đã duyệt';
END
ELSE
    PRINT N'   ⚠️ Yêu cầu đổi hàng cho HĐ #1 đã tồn tại';

-- Hoàn/Đổi trả 2: Hóa đơn 2 - Trả hàng - Chờ xử lý
IF NOT EXISTS (SELECT 1 FROM HoanDoiTra WHERE MaHoaDon = 2 AND LoaiYeuCau = N'Trả hàng')
BEGIN
    DECLARE @MaHoanDoiTra2 INT;
    
    INSERT INTO HoanDoiTra (MaHoaDon, MaKhachHang, LoaiYeuCau, LyDo, MoTaChiTiet, TrangThai, NgayYeuCau, SoTienHoan)
    VALUES (2, 2, N'Trả hàng', N'Không phù hợp', N'Sữa rửa mặt không phù hợp với da, yêu cầu trả hàng', N'Chờ xử lý', '2026-09-06 15:20:00', 160000);
    
    SET @MaHoanDoiTra2 = SCOPE_IDENTITY();
    
    -- Insert chi tiết (Sữa rửa mặt Simple - MaSanPham = 5)
    INSERT INTO ChiTietHoanDoiTra (MaHoanDoiTra, MaSanPham, SoLuong, DonGia, ThanhTien, TrangThaiSanPham)
    VALUES (@MaHoanDoiTra2, 5, 1, 160000, 160000, N'Còn nguyên seal');
    
    PRINT N'   ✅ Thêm yêu cầu trả hàng cho HĐ #2 - Chờ xử lý';
END
ELSE
    PRINT N'   ⚠️ Yêu cầu trả hàng cho HĐ #2 đã tồn tại';

-- Hoàn/Đổi trả 3: Hóa đơn 3 - Đổi hàng - Đang xử lý
IF NOT EXISTS (SELECT 1 FROM HoanDoiTra WHERE MaHoaDon = 3 AND LoaiYeuCau = N'Đổi hàng')
BEGIN
    DECLARE @MaHoanDoiTra3 INT;
    
    INSERT INTO HoanDoiTra (MaHoaDon, MaKhachHang, LoaiYeuCau, LyDo, MoTaChiTiet, TrangThai, NgayYeuCau, NgayXuLy, SoTienHoan)
    VALUES (3, 3, N'Đổi hàng', N'Giao sai sản phẩm', N'Đặt son 3CE nhưng giao nhầm tone màu', N'Đang xử lý', '2026-09-07 09:15:00', '2026-09-07 11:00:00', 560000);
    
    SET @MaHoanDoiTra3 = SCOPE_IDENTITY();
    
    -- Insert chi tiết (Son 3CE Velvet Lip Tint - MaSanPham = 7, có 2 trong hóa đơn)
    INSERT INTO ChiTietHoanDoiTra (MaHoanDoiTra, MaSanPham, SoLuong, DonGia, ThanhTien, TrangThaiSanPham)
    VALUES (@MaHoanDoiTra3, 7, 2, 280000, 560000, N'Sai màu');
    
    PRINT N'   ✅ Thêm yêu cầu đổi hàng cho HĐ #3 - Đang xử lý';
END
ELSE
    PRINT N'   ⚠️ Yêu cầu đổi hàng cho HĐ #3 đã tồn tại';

-- Hoàn/Đổi trả 4: Hóa đơn 4 - Trả hàng - Hoàn tất
IF NOT EXISTS (SELECT 1 FROM HoanDoiTra WHERE MaHoaDon = 4 AND LoaiYeuCau = N'Trả hàng')
BEGIN
    DECLARE @MaHoanDoiTra4 INT;
    
    INSERT INTO HoanDoiTra (MaHoaDon, MaKhachHang, LoaiYeuCau, LyDo, MoTaChiTiet, TrangThai, NgayYeuCau, NgayXuLy, SoTienHoan)
    VALUES (4, 4, N'Trả hàng', N'Sản phẩm bị hư hỏng', N'Chai dầu gội bị vỡ trong quá trình vận chuyển', N'Hoàn tất', '2026-09-07 14:30:00', '2026-09-07 16:00:00', 260000);
    
    SET @MaHoanDoiTra4 = SCOPE_IDENTITY();
    
    -- Insert chi tiết (Dầu gội Tsubaki - MaSanPham = 10)
    INSERT INTO ChiTietHoanDoiTra (MaHoanDoiTra, MaSanPham, SoLuong, DonGia, ThanhTien, TrangThaiSanPham)
    VALUES (@MaHoanDoiTra4, 10, 1, 260000, 260000, N'Chai bị vỡ');
    
    -- Cập nhật tồn kho (đã hoàn tất trả hàng)
    UPDATE SanPham SET SoLuong = SoLuong + 1 WHERE MaSanPham = 10;
    
    PRINT N'   ✅ Thêm yêu cầu trả hàng cho HĐ #4 - Hoàn tất (đã cập nhật tồn kho)';
END
ELSE
    PRINT N'   ⚠️ Yêu cầu trả hàng cho HĐ #4 đã tồn tại';

-- Hoàn/Đổi trả 5: Hóa đơn 5 - Trả hàng - Từ chối
IF NOT EXISTS (SELECT 1 FROM HoanDoiTra WHERE MaHoaDon = 5 AND LoaiYeuCau = N'Trả hàng')
BEGIN
    DECLARE @MaHoanDoiTra5 INT;
    
    INSERT INTO HoanDoiTra (MaHoaDon, MaKhachHang, LoaiYeuCau, LyDo, MoTaChiTiet, TrangThai, NgayYeuCau, NgayXuLy, GhiChuNguoiXuLy, SoTienHoan)
    VALUES (5, 5, N'Trả hàng', N'Không đúng mô tả', N'Yêu cầu trả hàng vì sản phẩm không đúng mô tả', N'Từ chối', '2026-09-07 16:45:00', '2026-09-07 18:00:00', N'Sản phẩm đã qua sử dụng, không đủ điều kiện trả hàng', 0);
    
    SET @MaHoanDoiTra5 = SCOPE_IDENTITY();
    
    -- Insert chi tiết (Kem dưỡng ẩm Laneige - MaSanPham = 1)
    INSERT INTO ChiTietHoanDoiTra (MaHoanDoiTra, MaSanPham, SoLuong, DonGia, ThanhTien, TrangThaiSanPham)
    VALUES (@MaHoanDoiTra5, 1, 1, 350000, 350000, N'Đã mở seal');
    
    PRINT N'   ✅ Thêm yêu cầu trả hàng cho HĐ #5 - Từ chối';
END
ELSE
    PRINT N'   ⚠️ Yêu cầu trả hàng cho HĐ #5 đã tồn tại';

PRINT N'';

-- =============================================
-- 3. KIỂM TRA KẾT QUẢ
-- =============================================

PRINT N'═══════════════════════════════════════════';
PRINT N'📊 Kiểm tra dữ liệu đã thêm:';
PRINT N'═══════════════════════════════════════════';

DECLARE @countGiaoHang INT = (SELECT COUNT(*) FROM GiaoHang);
DECLARE @countHoanDoiTra INT = (SELECT COUNT(*) FROM HoanDoiTra);
DECLARE @countChiTietHoanDoiTra INT = (SELECT COUNT(*) FROM ChiTietHoanDoiTra);

PRINT N'';
PRINT N'   📦 Giao hàng: ' + CAST(@countGiaoHang AS NVARCHAR(10)) + N' bản ghi';
PRINT N'   ↩️  Hoàn/Đổi trả: ' + CAST(@countHoanDoiTra AS NVARCHAR(10)) + N' bản ghi';
PRINT N'   📝 Chi tiết Hoàn/Đổi trả: ' + CAST(@countChiTietHoanDoiTra AS NVARCHAR(10)) + N' bản ghi';
PRINT N'';

-- Chi tiết Giao hàng
PRINT N'📦 Chi tiết Giao hàng:';
SELECT 
    g.MaGiaoHang,
    g.MaHoaDon,
    k.HoTen as KhachHang,
    g.DonViVanChuyen,
    g.MaVanDon,
    g.TrangThai,
    g.PhiVanChuyen
FROM GiaoHang g
LEFT JOIN HoaDon h ON g.MaHoaDon = h.MaHoaDon
LEFT JOIN KhachHang k ON h.MaKhachHang = k.MaKhachHang
ORDER BY g.MaGiaoHang;

PRINT N'';

-- Chi tiết Hoàn/Đổi trả
PRINT N'↩️ Chi tiết Hoàn/Đổi trả:';
SELECT 
    hd.MaHoanDoiTra,
    hd.MaHoaDon,
    k.HoTen as KhachHang,
    hd.LoaiYeuCau,
    hd.LyDo,
    hd.TrangThai,
    hd.SoTienHoan,
    (SELECT COUNT(*) FROM ChiTietHoanDoiTra WHERE MaHoanDoiTra = hd.MaHoanDoiTra) as SoSanPham
FROM HoanDoiTra hd
LEFT JOIN HoaDon h ON hd.MaHoaDon = h.MaHoaDon
LEFT JOIN KhachHang k ON hd.MaKhachHang = k.MaKhachHang
ORDER BY hd.MaHoanDoiTra;

PRINT N'';
PRINT N'═══════════════════════════════════════════';
PRINT N'✅ Hoàn tất thêm dữ liệu mẫu!';
PRINT N'═══════════════════════════════════════════';

GO
