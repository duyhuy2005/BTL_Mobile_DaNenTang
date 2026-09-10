import { Router } from 'express';
import { query, queryOne, getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/phieuxuat
router.get('/', async (_req, res) => {
  try {
    const data = await query(`
      SELECT
        PX.MaPhieuXuat,
        PX.LoaiXuat,
        PX.MaHoaDon,
        PX.NgayXuat,
        PX.TongSoLuong,
        PX.GhiChu,
        PX.NgayTao,
        TK.TenDangNhap AS NguoiTao,
        COUNT(CT.MaChiTiet) AS SoDongCT
      FROM PhieuXuatKho PX
      LEFT JOIN TaiKhoan TK ON PX.NguoiTao = TK.MaTaiKhoan
      LEFT JOIN ChiTietPhieuXuat CT ON PX.MaPhieuXuat = CT.MaPhieuXuat
      GROUP BY PX.MaPhieuXuat, PX.LoaiXuat, PX.MaHoaDon, PX.NgayXuat,
               PX.TongSoLuong, PX.GhiChu, PX.NgayTao, TK.TenDangNhap
      ORDER BY PX.NgayTao DESC
    `, {});
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/phieuxuat/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const phieu = await queryOne<any>(`
      SELECT PX.*, TK.TenDangNhap AS NguoiTao
      FROM PhieuXuatKho PX
      LEFT JOIN TaiKhoan TK ON PX.NguoiTao = TK.MaTaiKhoan
      WHERE PX.MaPhieuXuat = @id
    `, { id });
    if (!phieu) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu xuất' });

    const chiTiet = await query(`
      SELECT CT.*, SP.TenSanPham, SP.HinhAnh
      FROM ChiTietPhieuXuat CT
      LEFT JOIN SanPham SP ON CT.MaSanPham = SP.MaSanPham
      WHERE CT.MaPhieuXuat = @id
    `, { id });

    res.json({ success: true, data: { ...phieu, chiTiet } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/phieuxuat - Xuất kho thủ công (Admin only), dùng transaction
router.post('/', async (req: AuthRequest, res) => {
  if (req.user?.VaiTro !== 'Admin')
    return res.status(403).json({ success: false, message: 'Chỉ Admin mới xuất kho được' });

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { LoaiXuat, GhiChu, chiTiet } = req.body;

    if (!chiTiet || !Array.isArray(chiTiet) || chiTiet.length === 0)
      return res.status(400).json({ success: false, message: 'Phiếu xuất phải có ít nhất 1 sản phẩm' });

    await transaction.begin();

    let tongSoLuong = 0;

    // Kiểm tra tồn kho trước
    for (const item of chiTiet) {
      const spReq = new sql.Request(transaction);
      spReq.input('maSP', sql.Int, item.MaSanPham);
      const spResult = await spReq.query(`SELECT SoLuong, TenSanPham FROM SanPham WHERE MaSanPham = @maSP`);
      if (spResult.recordset.length === 0) throw new Error(`Không tìm thấy sản phẩm ID=${item.MaSanPham}`);
      const tonKho = spResult.recordset[0].SoLuong;
      if (tonKho < item.SoLuong)
        throw new Error(`Sản phẩm "${spResult.recordset[0].TenSanPham}" chỉ còn ${tonKho} trong kho`);
      tongSoLuong += item.SoLuong;
    }

    // Tạo phiếu xuất
    const phieuReq = new sql.Request(transaction);
    phieuReq.input('LoaiXuat',    sql.NVarChar(50),  LoaiXuat || 'Khac');
    phieuReq.input('TongSoLuong', sql.Int,           tongSoLuong);
    phieuReq.input('GhiChu',      sql.NVarChar(500), GhiChu || null);
    phieuReq.input('NguoiTao',    sql.Int,           req.user!.MaTaiKhoan);
    const phieuResult = await phieuReq.query(`
      INSERT INTO PhieuXuatKho (LoaiXuat, TongSoLuong, GhiChu, NguoiTao)
      OUTPUT INSERTED.MaPhieuXuat
      VALUES (@LoaiXuat, @TongSoLuong, @GhiChu, @NguoiTao)
    `);
    const maPhieuXuat = phieuResult.recordset[0].MaPhieuXuat;

    // Xử lý từng dòng
    for (const item of chiTiet) {
      const spReq2 = new sql.Request(transaction);
      spReq2.input('maSP', sql.Int, item.MaSanPham);
      const spResult2 = await spReq2.query(`SELECT SoLuong FROM SanPham WHERE MaSanPham = @maSP`);
      const soLuongTruoc = spResult2.recordset[0].SoLuong;
      const soLuongSau   = soLuongTruoc - item.SoLuong;

      // Chi tiết phiếu xuất
      const ctReq = new sql.Request(transaction);
      ctReq.input('MaPhieuXuat', sql.Int,          maPhieuXuat);
      ctReq.input('MaSanPham',   sql.Int,          item.MaSanPham);
      ctReq.input('SoLuong',     sql.Int,          item.SoLuong);
      ctReq.input('GiaBan',      sql.Decimal(18,2), item.GiaBan || 0);
      ctReq.input('ThanhTien',   sql.Decimal(18,2), (item.GiaBan || 0) * item.SoLuong);
      await ctReq.query(`
        INSERT INTO ChiTietPhieuXuat (MaPhieuXuat, MaSanPham, SoLuong, GiaBan, ThanhTien)
        VALUES (@MaPhieuXuat, @MaSanPham, @SoLuong, @GiaBan, @ThanhTien)
      `);

      // Cập nhật tồn kho
      const updateReq = new sql.Request(transaction);
      updateReq.input('soLuongMoi', sql.Int, soLuongSau);
      updateReq.input('maSP',       sql.Int, item.MaSanPham);
      await updateReq.query(`UPDATE SanPham SET SoLuong = @soLuongMoi WHERE MaSanPham = @maSP`);

      // Lịch sử kho
      const lskReq = new sql.Request(transaction);
      lskReq.input('MaSanPham',     sql.Int,          item.MaSanPham);
      lskReq.input('LoaiGiaoDich',  sql.NVarChar(20),  'EXPORT');
      lskReq.input('SoLuong',       sql.Int,          -item.SoLuong);
      lskReq.input('SoLuongTruoc',  sql.Int,          soLuongTruoc);
      lskReq.input('SoLuongSau',    sql.Int,          soLuongSau);
      lskReq.input('LoaiThamChieu', sql.NVarChar(50),  'PhieuXuat');
      lskReq.input('MaThamChieu',   sql.Int,          maPhieuXuat);
      lskReq.input('GhiChu',        sql.NVarChar(500), GhiChu || `Phieu xuat #PX${String(maPhieuXuat).padStart(3,'0')}`);
      lskReq.input('NguoiThucHien', sql.Int,          req.user!.MaTaiKhoan);
      await lskReq.query(`
        INSERT INTO LichSuKho (MaSanPham, LoaiGiaoDich, SoLuong, SoLuongTruoc, SoLuongSau,
                               LoaiThamChieu, MaThamChieu, GhiChu, NguoiThucHien)
        VALUES (@MaSanPham, @LoaiGiaoDich, @SoLuong, @SoLuongTruoc, @SoLuongSau,
                @LoaiThamChieu, @MaThamChieu, @GhiChu, @NguoiThucHien)
      `);
    }

    await transaction.commit();
    res.status(201).json({
      success: true,
      message: `Xuất kho thành công. Phiếu #PX${String(maPhieuXuat).padStart(3,'0')}`,
      data: { MaPhieuXuat: maPhieuXuat }
    });
  } catch (err: any) {
    await transaction.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
