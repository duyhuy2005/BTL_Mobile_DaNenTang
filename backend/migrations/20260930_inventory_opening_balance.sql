/* Preserve pre-existing SanPham.SoLuong as auditable opening balances. No expiry is invented. */
SET XACT_ABORT ON;
BEGIN TRY
 BEGIN TRANSACTION;
 INSERT INTO dbo.LoSanPham(MaSanPham,MaLoCode,ViTri,GiaNhap,SoLuongTon,SoLuongDaGiu,TrangThai)
 SELECT sp.MaSanPham, CONCAT('OPEN-',sp.MaSanPham), N'Chưa phân vị trí', ISNULL(sp.GiaNhap,0), sp.SoLuong, 0, N'Tồn đầu kỳ'
 FROM dbo.SanPham sp
 WHERE ISNULL(sp.SoLuong,0)>0 AND NOT EXISTS(SELECT 1 FROM dbo.LoSanPham l WHERE l.MaSanPham=sp.MaSanPham);
 INSERT INTO dbo.BienDongKho(MaSanPham,MaLo,Loai,SoLuong,TonTruoc,TonSau,GhiChu)
 SELECT l.MaSanPham,l.MaLo,N'Tồn đầu kỳ',l.SoLuongTon,0,l.SoLuongTon,N'Chuyển đổi tồn cũ, cần bổ sung lô/hạn dùng thực tế'
 FROM dbo.LoSanPham l WHERE l.MaLoCode LIKE 'OPEN-%' AND NOT EXISTS(SELECT 1 FROM dbo.BienDongKho b WHERE b.MaLo=l.MaLo AND b.Loai=N'Tồn đầu kỳ');
 COMMIT TRANSACTION;
END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK TRANSACTION; THROW; END CATCH;
