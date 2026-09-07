-- =============================================
-- Script: Thêm bảng Giao hàng và Hoàn/Đổi trả
-- Beauty Store Management System
-- =============================================

USE QuanLyCuaHangMyPham;
GO

-- =============================================
-- 1. BẢNG GIAO HÀNG (Deliveries)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[GiaoHang]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[GiaoHang] (
        [MaGiaoHang] INT PRIMARY KEY IDENTITY(1,1),
        [MaHoaDon] INT NOT NULL,
        [DiaChiGiaoHang] NVARCHAR(500) NOT NULL,
        [SoDienThoai] NVARCHAR(20) NULL,
        [DonViVanChuyen] NVARCHAR(100) NULL,
        [MaVanDon] NVARCHAR(50) NULL,
        [NgayGiao] DATETIME NULL,
        [PhiVanChuyen] DECIMAL(18,2) DEFAULT 0,
        [TrangThai] NVARCHAR(50) DEFAULT N'Chờ giao',
        [GhiChu] NVARCHAR(500) NULL,
        [NgayTao] DATETIME DEFAULT GETDATE(),
        [NgayCapNhat] DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_GiaoHang_HoaDon FOREIGN KEY ([MaHoaDon]) REFERENCES [HoaDon]([MaHoaDon]) ON DELETE CASCADE
    );
    
    PRINT N'✅ Đã tạo bảng GiaoHang';
END
ELSE
BEGIN
    PRINT N'⚠️ Bảng GiaoHang đã tồn tại';
END
GO

-- Index cho tìm kiếm nhanh
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_GiaoHang_MaHoaDon' AND object_id = OBJECT_ID('GiaoHang'))
BEGIN
    CREATE INDEX IX_GiaoHang_MaHoaDon ON GiaoHang(MaHoaDon);
    PRINT N'✅ Đã tạo index IX_GiaoHang_MaHoaDon';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_GiaoHang_TrangThai' AND object_id = OBJECT_ID('GiaoHang'))
BEGIN
    CREATE INDEX IX_GiaoHang_TrangThai ON GiaoHang(TrangThai);
    PRINT N'✅ Đã tạo index IX_GiaoHang_TrangThai';
END
GO

-- =============================================
-- 2. BẢNG HOÀN ĐỔI TRẢ (Returns)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[HoanDoiTra]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[HoanDoiTra] (
        [MaHoanDoiTra] INT PRIMARY KEY IDENTITY(1,1),
        [MaHoaDon] INT NOT NULL,
        [MaKhachHang] INT NOT NULL,
        [LoaiYeuCau] NVARCHAR(50) NOT NULL, -- 'Đổi hàng' hoặc 'Trả hàng'
        [LyDo] NVARCHAR(200) NULL,
        [MoTaChiTiet] NVARCHAR(1000) NULL,
        [TrangThai] NVARCHAR(50) DEFAULT N'Chờ xử lý',
        [NgayYeuCau] DATETIME DEFAULT GETDATE(),
        [NgayXuLy] DATETIME NULL,
        [NguoiXuLy] INT NULL, -- MaNhanVien
        [GhiChuNguoiXuLy] NVARCHAR(500) NULL,
        [SoTienHoan] DECIMAL(18,2) DEFAULT 0,
        [NgayTao] DATETIME DEFAULT GETDATE(),
        [NgayCapNhat] DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_HoanDoiTra_HoaDon FOREIGN KEY ([MaHoaDon]) REFERENCES [HoaDon]([MaHoaDon]),
        CONSTRAINT FK_HoanDoiTra_KhachHang FOREIGN KEY ([MaKhachHang]) REFERENCES [KhachHang]([MaKhachHang]),
        CONSTRAINT FK_HoanDoiTra_NhanVien FOREIGN KEY ([NguoiXuLy]) REFERENCES [NhanVien]([MaNhanVien])
    );
    
    PRINT N'✅ Đã tạo bảng HoanDoiTra';
END
ELSE
BEGIN
    PRINT N'⚠️ Bảng HoanDoiTra đã tồn tại';
END
GO

-- =============================================
-- 3. BẢNG CHI TIẾT HOÀN ĐỔI TRẢ
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ChiTietHoanDoiTra]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ChiTietHoanDoiTra] (
        [MaChiTiet] INT PRIMARY KEY IDENTITY(1,1),
        [MaHoanDoiTra] INT NOT NULL,
        [MaSanPham] INT NOT NULL,
        [SoLuong] INT NOT NULL,
        [DonGia] DECIMAL(18,2) NOT NULL,
        [ThanhTien] DECIMAL(18,2) NOT NULL,
        [TrangThaiSanPham] NVARCHAR(200) NULL,
        CONSTRAINT FK_ChiTietHoanDoiTra_HoanDoiTra FOREIGN KEY ([MaHoanDoiTra]) REFERENCES [HoanDoiTra]([MaHoanDoiTra]) ON DELETE CASCADE,
        CONSTRAINT FK_ChiTietHoanDoiTra_SanPham FOREIGN KEY ([MaSanPham]) REFERENCES [SanPham]([MaSanPham])
    );
    
    PRINT N'✅ Đã tạo bảng ChiTietHoanDoiTra';
END
ELSE
BEGIN
    PRINT N'⚠️ Bảng ChiTietHoanDoiTra đã tồn tại';
END
GO

-- Index cho tìm kiếm nhanh
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_HoanDoiTra_MaHoaDon' AND object_id = OBJECT_ID('HoanDoiTra'))
BEGIN
    CREATE INDEX IX_HoanDoiTra_MaHoaDon ON HoanDoiTra(MaHoaDon);
    PRINT N'✅ Đã tạo index IX_HoanDoiTra_MaHoaDon';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_HoanDoiTra_TrangThai' AND object_id = OBJECT_ID('HoanDoiTra'))
BEGIN
    CREATE INDEX IX_HoanDoiTra_TrangThai ON HoanDoiTra(TrangThai);
    PRINT N'✅ Đã tạo index IX_HoanDoiTra_TrangThai';
END
GO

-- =============================================
-- 4. DỮ LIỆU MẪU (Optional)
-- =============================================
PRINT N'';
PRINT N'═══════════════════════════════════════════';
PRINT N'📊 Thống kê bảng:';
PRINT N'═══════════════════════════════════════════';

DECLARE @countGiaoHang INT = (SELECT COUNT(*) FROM GiaoHang);
DECLARE @countHoanDoiTra INT = (SELECT COUNT(*) FROM HoanDoiTra);
DECLARE @countChiTiet INT = (SELECT COUNT(*) FROM ChiTietHoanDoiTra);

PRINT N'   GiaoHang: ' + CAST(@countGiaoHang AS NVARCHAR(10)) + N' bản ghi';
PRINT N'   HoanDoiTra: ' + CAST(@countHoanDoiTra AS NVARCHAR(10)) + N' bản ghi';
PRINT N'   ChiTietHoanDoiTra: ' + CAST(@countChiTiet AS NVARCHAR(10)) + N' bản ghi';
PRINT N'═══════════════════════════════════════════';
PRINT N'';
PRINT N'✅ Hoàn tất! Bảng Giao hàng và Hoàn/Đổi trả đã sẵn sàng.';
GO
