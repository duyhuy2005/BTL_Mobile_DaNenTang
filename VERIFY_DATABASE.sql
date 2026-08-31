-- ================================================================
-- SCRIPT KIEM TRA DU LIEU DATABASE
-- ================================================================

USE QuanLyCuaHangMyPham;
GO

PRINT '================================================================';
PRINT '           KIEM TRA DU LIEU DATABASE';
PRINT '================================================================';
PRINT '';

-- 1. Dem so luong records
PRINT '1. TONG SO LUONG RECORDS:';
PRINT '------------------------------------------------------------';

DECLARE @kh INT, @hd INT, @ct INT, @sp INT, @dm INT, @nv INT, @tk INT;

SELECT @tk = COUNT(*) FROM TaiKhoan;
SELECT @nv = COUNT(*) FROM NhanVien;
SELECT @kh = COUNT(*) FROM KhachHang;
SELECT @dm = COUNT(*) FROM DanhMuc;
SELECT @sp = COUNT(*) FROM SanPham;
SELECT @hd = COUNT(*) FROM HoaDon;
SELECT @ct = COUNT(*) FROM ChiTietHoaDon;

PRINT '  Tai khoan:         ' + CAST(@tk AS VARCHAR(10));
PRINT '  Nhan vien:         ' + CAST(@nv AS VARCHAR(10));
PRINT '  Khach hang:        ' + CAST(@kh AS VARCHAR(10));
PRINT '  Danh muc:          ' + CAST(@dm AS VARCHAR(10));
PRINT '  San pham:          ' + CAST(@sp AS VARCHAR(10));
PRINT '  Hoa don:           ' + CAST(@hd AS VARCHAR(10));
PRINT '  Chi tiet hoa don:  ' + CAST(@ct AS VARCHAR(10));
PRINT '';

-- 2. Danh muc va san pham
PRINT '2. DANH MUC VA SO LUONG SAN PHAM:';
PRINT '------------------------------------------------------------';

SELECT 
    dm.TenDanhMuc,
    COUNT(sp.MaSanPham) as SoSanPham,
    SUM(sp.SoLuong) as TongTonKho
FROM DanhMuc dm
LEFT JOIN SanPham sp ON dm.MaDanhMuc = sp.MaDanhMuc
GROUP BY dm.TenDanhMuc
ORDER BY dm.TenDanhMuc;

PRINT '';

-- 3. Top 10 san pham ban chay nhat
PRINT '3. TOP 10 SAN PHAM BAN CHAY NHAT:';
PRINT '------------------------------------------------------------';

SELECT TOP 10
    sp.TenSanPham,
    sp.ThuongHieu,
    ISNULL(SUM(ct.SoLuong), 0) as SoLuongDaBan,
    FORMAT(sp.GiaBan, 'N0') + ' d' as GiaBan
FROM SanPham sp
LEFT JOIN ChiTietHoaDon ct ON sp.MaSanPham = ct.MaSanPham
GROUP BY sp.TenSanPham, sp.ThuongHieu, sp.GiaBan
ORDER BY SoLuongDaBan DESC;

PRINT '';

-- 4. Khach hang mua nhieu nhat
PRINT '4. TOP 10 KHACH HANG MUA NHIEU NHAT:';
PRINT '------------------------------------------------------------';

SELECT TOP 10
    kh.HoTen,
    kh.SoDienThoai,
    COUNT(hd.MaHoaDon) as SoHoaDon,
    FORMAT(ISNULL(SUM(ct.ThanhTien), 0), 'N0') + ' d' as TongChiTieu
FROM KhachHang kh
LEFT JOIN HoaDon hd ON kh.MaKhachHang = hd.MaKhachHang
LEFT JOIN ChiTietHoaDon ct ON hd.MaHoaDon = ct.MaHoaDon
GROUP BY kh.HoTen, kh.SoDienThoai
ORDER BY SoHoaDon DESC;

PRINT '';

-- 5. Hoa don gan day
PRINT '5. 10 HOA DON GAN DAY NHAT:';
PRINT '------------------------------------------------------------';

SELECT TOP 10
    hd.MaHoaDon,
    kh.HoTen as KhachHang,
    nv.HoTen as NhanVien,
    FORMAT(hd.NgayLap, 'dd/MM/yyyy HH:mm') as NgayLap,
    FORMAT((SELECT SUM(ThanhTien) FROM ChiTietHoaDon WHERE MaHoaDon = hd.MaHoaDon), 'N0') + ' d' as TongTien,
    hd.TrangThai
FROM HoaDon hd
LEFT JOIN KhachHang kh ON hd.MaKhachHang = kh.MaKhachHang
LEFT JOIN NhanVien nv ON hd.MaNhanVien = nv.MaNhanVien
ORDER BY hd.NgayLap DESC;

PRINT '';

-- 6. Thong ke trang thai san pham
PRINT '6. TRANG THAI TON KHO SAN PHAM:';
PRINT '------------------------------------------------------------';

SELECT 
    CASE 
        WHEN SoLuong = 0 THEN 'Het hang'
        WHEN SoLuong <= 5 THEN 'Sap het'
        ELSE 'Con hang'
    END as TrangThai,
    COUNT(*) as SoSanPham
FROM SanPham
GROUP BY 
    CASE 
        WHEN SoLuong = 0 THEN 'Het hang'
        WHEN SoLuong <= 5 THEN 'Sap het'
        ELSE 'Con hang'
    END;

PRINT '';

-- 7. Doanh thu theo thang
PRINT '7. DOANH THU 7 NGAY GAN NHAT:';
PRINT '------------------------------------------------------------';

SELECT 
    FORMAT(hd.NgayLap, 'dd/MM/yyyy') as Ngay,
    COUNT(DISTINCT hd.MaHoaDon) as SoHoaDon,
    FORMAT(SUM(ct.ThanhTien), 'N0') + ' d' as TongDoanhThu
FROM HoaDon hd
JOIN ChiTietHoaDon ct ON hd.MaHoaDon = ct.MaHoaDon
WHERE hd.NgayLap >= DATEADD(DAY, -7, GETDATE())
    AND hd.TrangThai = N'Đã thanh toán'
GROUP BY FORMAT(hd.NgayLap, 'dd/MM/yyyy')
ORDER BY FORMAT(hd.NgayLap, 'dd/MM/yyyy') DESC;

PRINT '';

-- 8. Chi tiet 1 hoa don mau
PRINT '8. CHI TIET HOA DON MAU (HOA DON ID = 1):';
PRINT '------------------------------------------------------------';

SELECT 
    ROW_NUMBER() OVER (ORDER BY sp.TenSanPham) as STT,
    sp.TenSanPham,
    ct.SoLuong,
    FORMAT(ct.DonGia, 'N0') + ' d' as DonGia,
    FORMAT(ct.ThanhTien, 'N0') + ' d' as ThanhTien
FROM ChiTietHoaDon ct
JOIN SanPham sp ON ct.MaSanPham = sp.MaSanPham
WHERE ct.MaHoaDon = 1;

PRINT '';
PRINT '================================================================';
PRINT '           HOAN THANH KIEM TRA!';
PRINT '================================================================';
PRINT '';
PRINT 'CACH TEST THEM/SUA/XOA TREN ADMIN WEB:';
PRINT '------------------------------------------------------------';
PRINT '1. Them san pham moi tren http://localhost:5173';
PRINT '2. Chay lai script nay: VERIFY_DATABASE.sql';
PRINT '3. Xem so luong san pham tang len';
PRINT '4. Sua san pham -> Chay lai de verify thay doi';
PRINT '5. Xoa san pham -> Chay lai de verify da xoa';
PRINT '';
PRINT 'LENH CHAY SCRIPT:';
PRINT 'sqlcmd -S "ACER\MS1SQLSERVER" -U beauty_user -P "Beauty@2024" -i VERIFY_DATABASE.sql';
PRINT '';

GO
