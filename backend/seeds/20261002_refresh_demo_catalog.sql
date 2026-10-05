/*
  Idempotent BeautyStore demo catalogue refresh for the current project database.
  Requires the pre-change snapshot created at:
  BakCatalogProducts_20261002_1040 (product rows, categories, and product FK rows).
  Old records are retained and hidden from public sale; no historical rows are deleted.
  Demo product images are unbranded generated illustrations stored in backend/uploads/products.
*/
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;

  IF OBJECT_ID(N'BakCatalogProducts_20261002_1040.SanPham', N'U') IS NULL
    THROW 51000, 'Required pre-change product backup is missing; refusing catalogue refresh.', 1;

  DECLARE @Now datetime2(0) = CONVERT(datetime2(0), SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time');
  DECLARE @ReceiptNote nvarchar(1000) = N'Phiếu nhập khởi tạo bộ sản phẩm mẫu BeautyStore 2026-10-02; giá nhập và số lượng là dữ liệu đồ án.';
  DECLARE @SupplierId int;

  DECLARE @Categories TABLE(Code varchar(50) NOT NULL PRIMARY KEY, Name nvarchar(200) NOT NULL, Image varchar(500) NOT NULL, DisplayOrder int NOT NULL);
  INSERT INTO @Categories(Code,Name,Image,DisplayOrder) VALUES
    ('DEMO-CLEAN',N'Làm sạch','/uploads/products/demo-beauty-01-cleanser-pump.png',1),
    ('DEMO-SERUM',N'Serum','/uploads/products/demo-beauty-04-serum-amber.png',2),
    ('DEMO-MOIST',N'Dưỡng ẩm','/uploads/products/demo-beauty-07-moisture-cream-white.png',3),
    ('DEMO-SUN',N'Chống nắng','/uploads/products/demo-beauty-10-sunscreen-orange.png',4),
    ('DEMO-BODY',N'Chăm sóc cơ thể','/uploads/products/demo-beauty-13-body-lotion.png',5);

  INSERT INTO dbo.DanhMuc(TenDanhMuc,MaDanhMucCode,MaDanhMucCha,MoTa,HinhAnh,ThuTuHienThi,TrangThai)
  SELECT c.Name,c.Code,NULL,N'Danh mục cho bộ sản phẩm minh họa đồ án.',c.Image,c.DisplayOrder,1
  FROM @Categories c
  WHERE NOT EXISTS(SELECT 1 FROM dbo.DanhMuc d WHERE d.MaDanhMucCode=c.Code);

  /* Use the existing Makeup category as the Vietnamese-equivalent makeup group. */
  IF EXISTS(SELECT 1 FROM dbo.DanhMuc WHERE MaDanhMuc=3)
    UPDATE dbo.DanhMuc SET TenDanhMuc=N'Trang điểm',HinhAnh='/uploads/products/demo-beauty-18-pressed-powder.png',ThuTuHienThi=6
    WHERE MaDanhMuc=3 AND (TenDanhMuc=N'Makeup' OR TenDanhMuc=N'Trang điểm');

  /* Keep legacy categories after the requested demo assortment on the mobile home. */
  UPDATE dbo.DanhMuc SET ThuTuHienThi=20+MaDanhMuc
  WHERE MaDanhMuc IN(1,2,4,5,6);

  DECLARE @Products TABLE(
    Sku varchar(50) NOT NULL PRIMARY KEY, CategoryCode varchar(50) NULL, ProductName nvarchar(200) NOT NULL,
    Image varchar(500) NOT NULL, Price decimal(18,2) NOT NULL, Volume decimal(18,2) NOT NULL, Unit nvarchar(40) NOT NULL
  );
  INSERT INTO @Products(Sku,CategoryCode,ProductName,Image,Price,Volume,Unit) VALUES
    ('DEMO-CLEAN-001','DEMO-CLEAN',N'Sữa rửa mặt dịu nhẹ mẫu 01','/uploads/products/demo-beauty-01-cleanser-pump.png',129000,150,N'ml'),
    ('DEMO-CLEAN-002','DEMO-CLEAN',N'Gel làm sạch mẫu 02','/uploads/products/demo-beauty-02-cleanser-tube.png',159000,100,N'ml'),
    ('DEMO-CLEAN-003','DEMO-CLEAN',N'Sáp làm sạch mẫu 03','/uploads/products/demo-beauty-03-cleansing-balm.png',179000,80,N'g'),
    ('DEMO-SERUM-001','DEMO-SERUM',N'Tinh chất dưỡng da mẫu 01','/uploads/products/demo-beauty-04-serum-amber.png',189000,30,N'ml'),
    ('DEMO-SERUM-002','DEMO-SERUM',N'Tinh chất dưỡng da mẫu 02','/uploads/products/demo-beauty-05-serum-peach.png',229000,30,N'ml'),
    ('DEMO-SERUM-003','DEMO-SERUM',N'Tinh chất dưỡng da mẫu 03','/uploads/products/demo-beauty-06-serum-mint.png',259000,30,N'ml'),
    ('DEMO-MOIST-001','DEMO-MOIST',N'Kem dưỡng ẩm mẫu 01','/uploads/products/demo-beauty-07-moisture-cream-white.png',169000,50,N'g'),
    ('DEMO-MOIST-002','DEMO-MOIST',N'Kem dưỡng ẩm mẫu 02','/uploads/products/demo-beauty-08-moisture-cream-pink.png',199000,50,N'g'),
    ('DEMO-MOIST-003','DEMO-MOIST',N'Dưỡng ẩm dạng bơm mẫu 03','/uploads/products/demo-beauty-09-moisture-pump.png',239000,100,N'ml'),
    ('DEMO-SUN-001','DEMO-SUN',N'Kem chống nắng mẫu 01','/uploads/products/demo-beauty-10-sunscreen-orange.png',179000,50,N'ml'),
    ('DEMO-SUN-002','DEMO-SUN',N'Kem chống nắng mẫu 02','/uploads/products/demo-beauty-11-sunscreen-blue.png',219000,50,N'ml'),
    ('DEMO-SUN-003','DEMO-SUN',N'Kem chống nắng mẫu 03','/uploads/products/demo-beauty-12-sunscreen-yellow.png',239000,50,N'ml'),
    ('DEMO-BODY-001','DEMO-BODY',N'Sữa dưỡng thể mẫu 01','/uploads/products/demo-beauty-13-body-lotion.png',129000,250,N'ml'),
    ('DEMO-BODY-002','DEMO-BODY',N'Sữa tắm mẫu 02','/uploads/products/demo-beauty-14-body-wash.png',149000,300,N'ml'),
    ('DEMO-BODY-003','DEMO-BODY',N'Bơ dưỡng thể mẫu 03','/uploads/products/demo-beauty-15-body-butter.png',169000,200,N'g'),
    ('DEMO-MAKE-001',NULL,N'Son môi màu san hô mẫu 01','/uploads/products/demo-beauty-16-lipstick-coral.png',149000,4,N'g'),
    ('DEMO-MAKE-002',NULL,N'Son môi màu berry mẫu 02','/uploads/products/demo-beauty-17-lipstick-berry.png',179000,4,N'g'),
    ('DEMO-MAKE-003',NULL,N'Phấn phủ mẫu 03','/uploads/products/demo-beauty-18-pressed-powder.png',199000,10,N'g'),
    ('DEMO-MAKE-004',NULL,N'Kem nền mẫu 04','/uploads/products/demo-beauty-19-foundation.png',229000,30,N'ml'),
    ('DEMO-MAKE-005',NULL,N'Bảng màu mắt mẫu 05','/uploads/products/demo-beauty-20-eyeshadow.png',249000,12,N'g');

  IF NOT EXISTS(SELECT 1 FROM dbo.DanhMuc WHERE MaDanhMuc=3)
    THROW 51001, 'The existing Makeup category (MaDanhMuc=3) is missing; refusing to seed makeup products.', 1;

  INSERT INTO dbo.SanPham(
    MaDanhMuc,TenSanPham,ThuongHieu,GiaNhap,GiaBan,SoLuong,MoTa,HinhAnh,TrangThai,NgayTao,MaSKU,
    XuatXu,ThanhPhan,CongDung,HuongDanSuDung,DungTich,DonVi,QuyCachDongGoi,GiaKhuyenMai,
    NgaySanXuat,HanSuDung,NguongCanhBaoTonKho,NguonThongTin,UpdatedAt,IsDeleted,NgayCongKhai,DaTungCongKhai
  )
  SELECT COALESCE(d.MaDanhMuc,3),p.ProductName,N'BeautyStore Demo',ROUND(p.Price*0.7,0),p.Price,0,
    N'Sản phẩm minh họa phục vụ đồ án. Thành phần, xuất xứ và thông tin sử dụng chưa cập nhật.',
    p.Image,1,GETDATE(),p.Sku,NULL,NULL,NULL,NULL,p.Volume,p.Unit,NULL,NULL,NULL,NULL,5,
    N'Dữ liệu mẫu BeautyStore; giá nhập chỉ phục vụ đồ án.',GETDATE(),0,@Now,1
  FROM @Products p
  LEFT JOIN dbo.DanhMuc d ON d.MaDanhMucCode=p.CategoryCode
  WHERE NOT EXISTS(SELECT 1 FROM dbo.SanPham s WHERE s.MaSKU=p.Sku AND s.IsDeleted=0);

  UPDATE s SET ThuongHieu=N'BeautyStore Demo',UpdatedAt=GETDATE()
  FROM dbo.SanPham s JOIN @Products p ON p.Sku=s.MaSKU
  WHERE s.IsDeleted=0 AND ISNULL(s.ThuongHieu,N'')<>N'BeautyStore Demo';

  /* Retire only the exact pre-refresh rows captured in the verified backup. */
  UPDATE s SET TrangThai=0,UpdatedAt=GETDATE()
  FROM dbo.SanPham s
  JOIN BakCatalogProducts_20261002_1040.SanPham b ON b.MaSanPham=s.MaSanPham
  WHERE s.IsDeleted=0 AND ISNULL(s.MaSKU,'') NOT LIKE 'DEMO-%' AND (s.TrangThai IS NULL OR s.TrangThai<>0);

  IF NOT EXISTS(SELECT 1 FROM dbo.PhieuNhapKho WHERE GhiChu=@ReceiptNote)
  BEGIN
    SELECT TOP 1 @SupplierId=MaNCC FROM dbo.NhaCungCap WHERE TenNCC=N'Nhà cung cấp mẫu BeautyStore' ORDER BY MaNCC;
    IF @SupplierId IS NULL
    BEGIN
      INSERT INTO dbo.NhaCungCap(TenNCC,GhiChu) VALUES(N'Nhà cung cấp mẫu BeautyStore',N'Nhà cung cấp minh họa cho dữ liệu đồ án.');
      SET @SupplierId=CONVERT(int,SCOPE_IDENTITY());
    END;

    DECLARE @ReceiptId int;
    INSERT INTO dbo.PhieuNhapKho(MaNCC,NgayNhap,TrangThai,GhiChu,TongTien)
      VALUES(@SupplierId,CONVERT(datetime,@Now),N'Nháp',@ReceiptNote,0);
    SET @ReceiptId=CONVERT(int,SCOPE_IDENTITY());

    INSERT INTO dbo.ChiTietPhieuNhap(MaPhieuNhap,MaSanPham,MaLoCode,NgaySanXuat,HanSuDung,ViTri,SoLuong,GiaNhap)
    SELECT @ReceiptId,s.MaSanPham,'DEMO-20261002-'+p.Sku,NULL,NULL,NULL,12,ROUND(p.Price*0.7,0)
    FROM @Products p JOIN dbo.SanPham s ON s.MaSKU=p.Sku AND s.IsDeleted=0;

    DECLARE @ReceiptLines TABLE(MaSanPham int NOT NULL,MaLoCode varchar(80) NOT NULL,SoLuong int NOT NULL,GiaNhap decimal(18,2) NOT NULL,PRIMARY KEY(MaSanPham,MaLoCode));
    INSERT INTO @ReceiptLines(MaSanPham,MaLoCode,SoLuong,GiaNhap)
    SELECT MaSanPham,MaLoCode,SoLuong,GiaNhap FROM dbo.ChiTietPhieuNhap WHERE MaPhieuNhap=@ReceiptId;

    DECLARE @Before TABLE(MaSanPham int NOT NULL PRIMARY KEY,TonTruoc int NOT NULL);
    INSERT INTO @Before(MaSanPham,TonTruoc)
    SELECT s.MaSanPham,ISNULL(s.SoLuong,0) FROM dbo.SanPham s WITH(UPDLOCK,ROWLOCK) JOIN @ReceiptLines l ON l.MaSanPham=s.MaSanPham;

    INSERT INTO dbo.LoSanPham(MaSanPham,MaNCC,MaLoCode,NgaySanXuat,HanSuDung,ViTri,GiaNhap,SoLuongTon)
    SELECT l.MaSanPham,@SupplierId,l.MaLoCode,NULL,NULL,NULL,l.GiaNhap,l.SoLuong FROM @ReceiptLines l;

    UPDATE s SET SoLuong=ISNULL(s.SoLuong,0)+l.SoLuong
    FROM dbo.SanPham s JOIN @ReceiptLines l ON l.MaSanPham=s.MaSanPham;

    INSERT INTO dbo.BienDongKho(MaSanPham,MaLo,MaPhieuNhap,Loai,SoLuong,TonTruoc,TonSau,GhiChu)
    SELECT l.MaSanPham,lot.MaLo,@ReceiptId,N'Nhập',l.SoLuong,b.TonTruoc,b.TonTruoc+l.SoLuong,
      N'Xác nhận phiếu nhập khởi tạo dữ liệu mẫu BeautyStore'
    FROM @ReceiptLines l JOIN @Before b ON b.MaSanPham=l.MaSanPham
      JOIN dbo.LoSanPham lot ON lot.MaSanPham=l.MaSanPham AND lot.MaLoCode=l.MaLoCode;

    UPDATE dbo.PhieuNhapKho SET TrangThai=N'Đã xác nhận',TongTien=(SELECT SUM(SoLuong*GiaNhap) FROM @ReceiptLines) WHERE MaPhieuNhap=@ReceiptId;
  END;

  COMMIT TRANSACTION;
  SELECT s.MaSanPham,s.MaSKU,s.TenSanPham,d.TenDanhMuc,s.GiaBan,s.SoLuong,s.HinhAnh,s.NgayCongKhai
  FROM dbo.SanPham s LEFT JOIN dbo.DanhMuc d ON d.MaDanhMuc=s.MaDanhMuc
  WHERE s.MaSKU LIKE 'DEMO-%' AND s.IsDeleted=0 ORDER BY s.MaSKU;
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
