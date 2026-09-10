import { Router } from 'express';
import { execute, query, queryOne, sql, getPool } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  'Cho xu ly':    'Chờ xử lý',
  'Tiep nhan':    'Đang tiếp nhận',
  'Kiem tra':     'Đang kiểm tra',
  'Cho duyet':    'Chờ Admin duyệt',
  'Da duyet':     'Đã duyệt',
  'Tu choi':      'Từ chối',
  'Hoan tien':    'Đã hoàn tiền',
  'Hoan tat':     'Hoàn tất',
  'Huy':          'Đã hủy',
  // legacy
  'Chờ xử lý':   'Chờ xử lý',
  'Đang xử lý':  'Đang tiếp nhận',
  'Đã duyệt':    'Đã duyệt',
  'Từ chối':     'Từ chối',
  'Hoàn tất':    'Hoàn tất',
};

function logHistory(
  transaction: InstanceType<typeof sql.Transaction>,
  maHDT: number, oldStatus: string | null, newStatus: string,
  nguoiThayDoi: number | null, ghiChu?: string
) {
  const r = new sql.Request(transaction);
  r.input('mhdt', sql.Int,          maHDT);
  r.input('cu',   sql.NVarChar(50),  oldStatus ?? null);
  r.input('moi',  sql.NVarChar(50),  newStatus);
  r.input('ntd',  sql.Int,          nguoiThayDoi ?? null);
  r.input('gc',   sql.NVarChar(500), ghiChu ?? null);
  return r.query(`
    INSERT INTO LichSuTrangThaiHoanTra
      (MaHoanDoiTra, TrangThaiCu, TrangThaiMoi, NguoiThayDoi, GhiChu)
    VALUES (@mhdt, @cu, @moi, @ntd, @gc)
  `);
}

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/hoandoitra  — danh sách + filter + phân trang
// ══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const { search, loai, status, tuNgay, denNgay, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params: any = { offset, limit: Number(limit) };

    let where = 'WHERE 1=1';
    if (search) {
      where += ` AND (
        'RT'+RIGHT('0000'+CAST(HDT.MaHoanDoiTra AS NVARCHAR),4) LIKE @search
        OR CAST(HDT.MaHoaDon AS NVARCHAR) LIKE @search
        OR KH.HoTen LIKE @search
        OR SP.TenSanPham LIKE @search
      )`;
      params.search = `%${search}%`;
    }
    if (loai)   { where += ' AND HDT.LoaiYeuCau = @loai';   params.loai = loai; }
    if (status) { where += ' AND HDT.TrangThai  = @status'; params.status = status; }
    if (tuNgay) { where += ' AND HDT.NgayYeuCau >= @tuNgay'; params.tuNgay = new Date(tuNgay as string); }
    if (denNgay){ where += ' AND HDT.NgayYeuCau <= @denNgay'; params.denNgay = new Date(denNgay as string); }

    const data = await query(`
      SELECT
        HDT.MaHoanDoiTra,
        'RT'+RIGHT('0000'+CAST(HDT.MaHoanDoiTra AS NVARCHAR),4) AS MaYeuCau,
        'HD'+RIGHT('0000'+CAST(HDT.MaHoaDon     AS NVARCHAR),4) AS MaHoaDonHienThi,
        HDT.MaHoaDon,
        HDT.MaKhachHang,
        KH.HoTen        AS TenKhachHang,
        KH.SoDienThoai,
        KH.Email,
        HDT.LoaiYeuCau,
        HDT.LyDo,
        HDT.MoTaChiTiet,
        HDT.TrangThai,
        HDT.NgayYeuCau,
        HDT.NgayXuLy,
        HDT.SoTienHoan,
        HDT.NhapLaiKho,
        HDT.LyDoTuChoi,
        NV.HoTen        AS TenNguoiXuLy,
        NVD.HoTen       AS TenNguoiDuyet,
        (SELECT TOP 1 SP2.TenSanPham
           FROM ChiTietHoanDoiTra CT2
           JOIN SanPham SP2 ON CT2.MaSanPham=SP2.MaSanPham
          WHERE CT2.MaHoanDoiTra=HDT.MaHoanDoiTra) AS TenSanPhamDau,
        (SELECT COUNT(*) FROM ChiTietHoanDoiTra WHERE MaHoanDoiTra=HDT.MaHoanDoiTra) AS SoSanPham
      FROM HoanDoiTra HDT
      LEFT JOIN KhachHang  KH  ON HDT.MaKhachHang = KH.MaKhachHang
      LEFT JOIN NhanVien   NV  ON HDT.NguoiXuLy   = NV.MaNhanVien
      LEFT JOIN TaiKhoan   NVD ON HDT.NguoiDuyet  = NVD.MaTaiKhoan
      LEFT JOIN ChiTietHoanDoiTra CT ON CT.MaHoanDoiTra = HDT.MaHoanDoiTra
      LEFT JOIN SanPham SP ON CT.MaSanPham = SP.MaSanPham
      ${where}
      GROUP BY
        HDT.MaHoanDoiTra, HDT.MaHoaDon, HDT.MaKhachHang,
        KH.HoTen, KH.SoDienThoai, KH.Email,
        HDT.LoaiYeuCau, HDT.LyDo, HDT.MoTaChiTiet, HDT.TrangThai,
        HDT.NgayYeuCau, HDT.NgayXuLy, HDT.SoTienHoan,
        HDT.NhapLaiKho, HDT.LyDoTuChoi,
        NV.HoTen, NVD.HoTen
      ORDER BY HDT.NgayYeuCau DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);

    const cnt = await queryOne<{ total: number }>(
      `SELECT COUNT(DISTINCT HDT.MaHoanDoiTra) as total
       FROM HoanDoiTra HDT
       LEFT JOIN KhachHang KH ON HDT.MaKhachHang=KH.MaKhachHang
       LEFT JOIN ChiTietHoanDoiTra CT ON CT.MaHoanDoiTra=HDT.MaHoanDoiTra
       LEFT JOIN SanPham SP ON CT.MaSanPham=SP.MaSanPham
       ${where}`, params
    ) || { total: 0 };

    res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total: cnt.total, totalPages: Math.ceil(cnt.total / Number(limit)) } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/hoandoitra/statistics
// ══════════════════════════════════════════════════════════════════════════════
router.get('/statistics', async (_req, res) => {
  try {
    const stats = await queryOne<any>(`
      SELECT
        SUM(CASE WHEN TrangThai IN (N'Cho xu ly','Chờ xử lý') THEN 1 ELSE 0 END)      AS choXuLy,
        SUM(CASE WHEN TrangThai IN (N'Tiep nhan','Đang tiếp nhận','Đang xử lý') THEN 1 ELSE 0 END) AS tiepNhan,
        SUM(CASE WHEN TrangThai IN (N'Kiem tra','Đang kiểm tra') THEN 1 ELSE 0 END)   AS kiemTra,
        SUM(CASE WHEN TrangThai IN (N'Cho duyet','Chờ Admin duyệt') THEN 1 ELSE 0 END) AS choDuyet,
        SUM(CASE WHEN TrangThai IN (N'Da duyet','Đã duyệt') THEN 1 ELSE 0 END)        AS daDuyet,
        SUM(CASE WHEN TrangThai IN (N'Tu choi','Từ chối') THEN 1 ELSE 0 END)          AS tuChoi,
        SUM(CASE WHEN TrangThai IN (N'Hoan tien','Đã hoàn tiền') THEN 1 ELSE 0 END)   AS hoanTien,
        SUM(CASE WHEN TrangThai IN (N'Hoan tat','Hoàn tất') THEN 1 ELSE 0 END)        AS hoanTat,
        COUNT(*) AS tongYeuCau,
        ISNULL(SUM(CASE WHEN TrangThai IN (N'Hoan tien','Hoan tat') THEN SoTienHoan ELSE 0 END),0) AS tongTienHoan
      FROM HoanDoiTra
    `, {}) || {};
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/hoandoitra/:id  — chi tiết đầy đủ
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const detail = await queryOne<any>(`
      SELECT
        HDT.*,
        'RT'+RIGHT('0000'+CAST(HDT.MaHoanDoiTra AS NVARCHAR),4) AS MaYeuCau,
        'HD'+RIGHT('0000'+CAST(HDT.MaHoaDon     AS NVARCHAR),4) AS MaHoaDonHienThi,
        KH.HoTen       AS TenKhachHang,
        KH.SoDienThoai AS SoDienThoaiKH,
        KH.Email       AS EmailKH,
        KH.DiaChi      AS DiaChiKH,
        NV.HoTen       AS TenNguoiXuLy,
        TKD.TenDangNhap AS TenNguoiDuyet,
        HD.NgayLap,
        HD.PhuongThucThanhToan,
        ISNULL((SELECT SUM(ThanhTien) FROM ChiTietHoaDon WHERE MaHoaDon=HD.MaHoaDon),0) AS TongTienDonHang
      FROM HoanDoiTra HDT
      LEFT JOIN KhachHang KH  ON HDT.MaKhachHang = KH.MaKhachHang
      LEFT JOIN NhanVien  NV  ON HDT.NguoiXuLy   = NV.MaNhanVien
      LEFT JOIN TaiKhoan  TKD ON HDT.NguoiDuyet  = TKD.MaTaiKhoan
      LEFT JOIN HoaDon    HD  ON HDT.MaHoaDon    = HD.MaHoaDon
      WHERE HDT.MaHoanDoiTra = @id
    `, { id });

    if (!detail) return res.status(404).json({ success: false, message: 'Không tìm thấy yêu cầu hoàn trả' });

    // Chi tiết sản phẩm
    const chiTiet = await query(`
      SELECT
        CT.MaChiTiet, CT.MaSanPham, CT.SoLuong, CT.DonGia, CT.ThanhTien, CT.TrangThaiSanPham,
        SP.TenSanPham, SP.HinhAnh, SP.SoLuong AS TonKhoHienTai
      FROM ChiTietHoanDoiTra CT
      LEFT JOIN SanPham SP ON CT.MaSanPham = SP.MaSanPham
      WHERE CT.MaHoanDoiTra = @id
    `, { id });

    // Bằng chứng
    const bangChung = await query(`SELECT * FROM BangChungHoanTra WHERE MaHoanDoiTra=@id ORDER BY NgayTao`, { id });

    // Kết quả kiểm tra
    const kiemTra = await queryOne<any>(`
      SELECT KT.*, NV.HoTen AS TenNguoiKiemTra
      FROM KiemTraHoanTra KT
      LEFT JOIN NhanVien NV ON KT.NguoiKiemTra=NV.MaNhanVien
      WHERE KT.MaHoanDoiTra=@id
      ORDER BY KT.NgayKiemTra DESC
    `, { id });

    // Thông tin hoàn tiền
    const hoanTien = await queryOne<any>(`
      SELECT HT.*, TK.TenDangNhap AS TenNguoiThucHien
      FROM HoanTien HT
      LEFT JOIN TaiKhoan TK ON HT.NguoiThucHien=TK.MaTaiKhoan
      WHERE HT.MaHoanDoiTra=@id
    `, { id });

    // Timeline
    const timeline = await query(`
      SELECT
        LS.MaLichSu, LS.TrangThaiCu, LS.TrangThaiMoi, LS.GhiChu, LS.NgayThayDoi,
        COALESCE(NV.HoTen, TK.TenDangNhap, N'Hệ thống') AS NguoiThayDoi
      FROM LichSuTrangThaiHoanTra LS
      LEFT JOIN NhanVien NV ON LS.NguoiThayDoi=NV.MaTaiKhoan
      LEFT JOIN TaiKhoan TK ON LS.NguoiThayDoi=TK.MaTaiKhoan
      WHERE LS.MaHoanDoiTra=@id
      ORDER BY LS.NgayThayDoi ASC
    `, { id });

    res.json({ success: true, data: { ...detail, chiTiet, bangChung, kiemTra, hoanTien, timeline } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:id/receive  — Tiếp nhận (Admin + NV)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/receive', async (req: AuthRequest, res) => {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  try {
    const id = parseInt(req.params.id);
    const userId = req.user!.MaTaiKhoan;

    await tx.begin();
    const r = new sql.Request(tx);
    r.input('id', sql.Int, id);
    const cur = await r.query(`SELECT TrangThai FROM HoanDoiTra WHERE MaHoanDoiTra=@id`);
    if (!cur.recordset[0]) throw new Error('Không tìm thấy yêu cầu');
    const oldStatus = cur.recordset[0].TrangThai;

    const r2 = new sql.Request(tx);
    r2.input('id', sql.Int, id);
    r2.input('uid', sql.Int, userId);
    await r2.query(`UPDATE HoanDoiTra SET TrangThai=N'Tiep nhan', NguoiXuLy=@uid WHERE MaHoanDoiTra=@id`);
    await logHistory(tx, id, oldStatus, 'Tiep nhan', userId, 'Tiếp nhận yêu cầu');

    await tx.commit();
    res.json({ success: true, message: 'Đã tiếp nhận yêu cầu' });
  } catch (err: any) { await tx.rollback(); res.status(500).json({ success: false, message: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:id/inspect  — Nhập kết quả kiểm tra (Admin + NV)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/inspect', async (req: AuthRequest, res) => {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  try {
    const id = parseInt(req.params.id);
    const { TinhTrangSP, KetQua, GhiChu } = req.body;
    const userId = req.user!.MaTaiKhoan;

    await tx.begin();

    // Lấy MaNhanVien từ TaiKhoan
    const nvReq = new sql.Request(tx);
    nvReq.input('uid', sql.Int, userId);
    const nvResult = await nvReq.query(`SELECT MaNhanVien FROM NhanVien WHERE MaTaiKhoan=@uid`);
    const maNV = nvResult.recordset[0]?.MaNhanVien || null;

    const r = new sql.Request(tx);
    r.input('id',    sql.Int,          id);
    r.input('nv',    sql.Int,          maNV);
    r.input('tt',    sql.NVarChar(100), TinhTrangSP || null);
    r.input('kq',    sql.NVarChar(50),  KetQua || null);
    r.input('gc',    sql.NVarChar(500), GhiChu || null);
    // Upsert inspection
    await r.query(`
      IF EXISTS (SELECT 1 FROM KiemTraHoanTra WHERE MaHoanDoiTra=@id)
        UPDATE KiemTraHoanTra SET TinhTrangSP=@tt, KetQua=@kq, GhiChu=@gc, NgayKiemTra=GETDATE()
        WHERE MaHoanDoiTra=@id
      ELSE
        INSERT INTO KiemTraHoanTra (MaHoanDoiTra, NguoiKiemTra, TinhTrangSP, KetQua, GhiChu)
        VALUES (@id, @nv, @tt, @kq, @gc)
    `);

    const r2 = new sql.Request(tx);
    r2.input('id', sql.Int, id);
    const cur = await r2.query(`SELECT TrangThai FROM HoanDoiTra WHERE MaHoanDoiTra=@id`);
    const oldStatus = cur.recordset[0].TrangThai;

    const r3 = new sql.Request(tx);
    r3.input('id', sql.Int, id);
    await r3.query(`UPDATE HoanDoiTra SET TrangThai=N'Cho duyet', NgayCapNhat=GETDATE() WHERE MaHoanDoiTra=@id`);
    await logHistory(tx, id, oldStatus, 'Cho duyet', userId, GhiChu || 'Hoàn thành kiểm tra, chuyển Admin duyệt');

    await tx.commit();
    res.json({ success: true, message: 'Đã lưu kết quả kiểm tra' });
  } catch (err: any) { await tx.rollback(); res.status(500).json({ success: false, message: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:id/approve  — Admin duyệt
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/approve', async (req: AuthRequest, res) => {
  if (req.user?.VaiTro !== 'Admin') return res.status(403).json({ success: false, message: 'Chỉ Admin mới duyệt được' });

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  try {
    const id = parseInt(req.params.id);
    const { NhapLaiKho, SoTienHoan, PhuongThucHoan, GhiChu } = req.body;
    const userId = req.user!.MaTaiKhoan;

    await tx.begin();
    const r = new sql.Request(tx);
    r.input('id', sql.Int, id);
    const cur = await r.query(`SELECT TrangThai, MaKhachHang FROM HoanDoiTra WHERE MaHoanDoiTra=@id`);
    const row = cur.recordset[0];
    if (!row) throw new Error('Không tìm thấy yêu cầu');
    if (!['Cho duyet', 'Cho xu ly', 'Chờ xử lý', 'Chờ Admin duyệt'].includes(row.TrangThai))
      throw new Error('Yêu cầu không ở trạng thái chờ duyệt');

    const r2 = new sql.Request(tx);
    r2.input('id',     sql.Int,          id);
    r2.input('uid',    sql.Int,          userId);
    r2.input('slk',    sql.Bit,          NhapLaiKho ? 1 : 0);
    r2.input('st',     sql.Decimal(18,2), SoTienHoan || null);
    r2.input('pth',    sql.NVarChar(100), PhuongThucHoan || null);
    await r2.query(`
      UPDATE HoanDoiTra
      SET TrangThai=N'Da duyet', NguoiDuyet=@uid, NgayDuyet=GETDATE(),
          NhapLaiKho=@slk, SoTienHoan=@st, PhuongThucHoan=@pth, NgayCapNhat=GETDATE()
      WHERE MaHoanDoiTra=@id
    `);
    await logHistory(tx, id, row.TrangThai, 'Da duyet', userId, GhiChu || 'Admin phê duyệt yêu cầu hoàn trả');

    await tx.commit();
    res.json({ success: true, message: 'Đã duyệt yêu cầu hoàn trả' });
  } catch (err: any) { await tx.rollback(); res.status(500).json({ success: false, message: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:id/reject  — Admin từ chối
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/reject', async (req: AuthRequest, res) => {
  if (req.user?.VaiTro !== 'Admin') return res.status(403).json({ success: false, message: 'Chỉ Admin mới từ chối được' });

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  try {
    const id = parseInt(req.params.id);
    const { LyDoTuChoi } = req.body;
    if (!LyDoTuChoi?.trim()) throw new Error('Vui lòng nhập lý do từ chối');
    const userId = req.user!.MaTaiKhoan;

    await tx.begin();
    const r = new sql.Request(tx);
    r.input('id', sql.Int, id);
    const cur = await r.query(`SELECT TrangThai FROM HoanDoiTra WHERE MaHoanDoiTra=@id`);
    const oldStatus = cur.recordset[0]?.TrangThai;

    const r2 = new sql.Request(tx);
    r2.input('id',  sql.Int,          id);
    r2.input('uid', sql.Int,          userId);
    r2.input('ly',  sql.NVarChar(500), LyDoTuChoi);
    await r2.query(`
      UPDATE HoanDoiTra
      SET TrangThai=N'Tu choi', NguoiDuyet=@uid, NgayDuyet=GETDATE(),
          LyDoTuChoi=@ly, NgayCapNhat=GETDATE()
      WHERE MaHoanDoiTra=@id
    `);
    await logHistory(tx, id, oldStatus, 'Tu choi', userId, LyDoTuChoi);

    await tx.commit();
    res.json({ success: true, message: 'Đã từ chối yêu cầu' });
  } catch (err: any) { await tx.rollback(); res.status(500).json({ success: false, message: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /:id/refund  — Admin thực hiện hoàn tiền (transaction đầy đủ)
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/refund', async (req: AuthRequest, res) => {
  if (req.user?.VaiTro !== 'Admin') return res.status(403).json({ success: false, message: 'Chỉ Admin mới hoàn tiền được' });

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  try {
    const id = parseInt(req.params.id);
    const { PhuongThucHoan, TenTaiKhoan, SoTaiKhoan, NganHang, GhiChu } = req.body;
    const userId = req.user!.MaTaiKhoan;

    await tx.begin();

    // 1. Kiểm tra trạng thái
    const r = new sql.Request(tx);
    r.input('id', sql.Int, id);
    const cur = await r.query(`
      SELECT HDT.TrangThai, HDT.SoTienHoan, HDT.NhapLaiKho, HDT.MaHoaDon
      FROM HoanDoiTra HDT
      WHERE MaHoanDoiTra=@id
    `);
    const row = cur.recordset[0];
    if (!row) throw new Error('Không tìm thấy yêu cầu');
    if (!['Da duyet', 'Đã duyệt'].includes(row.TrangThai))
      throw new Error('Yêu cầu chưa được duyệt');

    // 2. Kiểm tra chưa hoàn tiền
    const r2 = new sql.Request(tx);
    r2.input('id', sql.Int, id);
    const existRefund = await r2.query(`SELECT MaHoanTien FROM HoanTien WHERE MaHoanDoiTra=@id`);
    if (existRefund.recordset.length > 0) throw new Error('Yêu cầu này đã được hoàn tiền rồi');

    // 3. Tạo bản ghi hoàn tiền
    const maGD = `REF${Date.now()}`;
    const r3 = new sql.Request(tx);
    r3.input('id',   sql.Int,          id);
    r3.input('mgd',  sql.NVarChar(100), maGD);
    r3.input('st',   sql.Decimal(18,2), row.SoTienHoan || 0);
    r3.input('pth',  sql.NVarChar(100), PhuongThucHoan || 'chuyen_khoan');
    r3.input('ttk',  sql.NVarChar(200), TenTaiKhoan || null);
    r3.input('stk',  sql.NVarChar(50),  SoTaiKhoan  || null);
    r3.input('nh',   sql.NVarChar(200), NganHang    || null);
    r3.input('uid',  sql.Int,          userId);
    r3.input('gc',   sql.NVarChar(500), GhiChu      || null);
    await r3.query(`
      INSERT INTO HoanTien (MaHoanDoiTra, MaGiaoDich, SoTienHoan, PhuongThucHoan,
                            TenTaiKhoan, SoTaiKhoan, NganHang, NguoiThucHien, GhiChu)
      VALUES (@id, @mgd, @st, @pth, @ttk, @stk, @nh, @uid, @gc)
    `);

    // 4. Cập nhật trạng thái → Hoan tien
    const r4 = new sql.Request(tx);
    r4.input('id', sql.Int, id);
    await r4.query(`UPDATE HoanDoiTra SET TrangThai=N'Hoan tien', NgayCapNhat=GETDATE() WHERE MaHoanDoiTra=@id`);
    await logHistory(tx, id, row.TrangThai, 'Hoan tien', userId, `Hoàn tiền qua ${PhuongThucHoan || 'chuyển khoản'}`);

    // 5. Nếu NhapLaiKho = true → tăng tồn kho + ghi LichSuKho
    if (row.NhapLaiKho) {
      const chiTietReq = new sql.Request(tx);
      chiTietReq.input('id', sql.Int, id);
      const ctResult = await chiTietReq.query(`SELECT MaSanPham, SoLuong FROM ChiTietHoanDoiTra WHERE MaHoanDoiTra=@id`);

      for (const ct of ctResult.recordset) {
        // Kiểm tra đã tạo StockTransaction RETURN chưa
        const checkReq = new sql.Request(tx);
        checkReq.input('sp',  sql.Int,         ct.MaSanPham);
        checkReq.input('ref', sql.Int,         id);
        const existed = await checkReq.query(`
          SELECT MaGiaoDich FROM LichSuKho
          WHERE MaSanPham=@sp AND LoaiGiaoDich='RETURN' AND LoaiThamChieu='HoanDoiTra' AND MaThamChieu=@ref
        `);
        if (existed.recordset.length > 0) continue; // Chống cộng kho 2 lần

        const spReq = new sql.Request(tx);
        spReq.input('sp', sql.Int, ct.MaSanPham);
        const spResult = await spReq.query(`SELECT SoLuong FROM SanPham WHERE MaSanPham=@sp`);
        const soLuongTruoc = spResult.recordset[0]?.SoLuong || 0;
        const soLuongSau   = soLuongTruoc + ct.SoLuong;

        const upReq = new sql.Request(tx);
        upReq.input('sl', sql.Int, soLuongSau);
        upReq.input('sp', sql.Int, ct.MaSanPham);
        await upReq.query(`UPDATE SanPham SET SoLuong=@sl WHERE MaSanPham=@sp`);

        const lskReq = new sql.Request(tx);
        lskReq.input('sp',   sql.Int,          ct.MaSanPham);
        lskReq.input('loai', sql.NVarChar(20),  'RETURN');
        lskReq.input('sl',   sql.Int,           ct.SoLuong);
        lskReq.input('tr',   sql.Int,           soLuongTruoc);
        lskReq.input('sau',  sql.Int,           soLuongSau);
        lskReq.input('ref',  sql.Int,           id);
        lskReq.input('gc',   sql.NVarChar(500),  `Hoàn trả từ yêu cầu RT${String(id).padStart(4,'0')}`);
        lskReq.input('uid',  sql.Int,           userId);
        await lskReq.query(`
          INSERT INTO LichSuKho (MaSanPham,LoaiGiaoDich,SoLuong,SoLuongTruoc,SoLuongSau,
                                 LoaiThamChieu,MaThamChieu,GhiChu,NguoiThucHien)
          VALUES (@sp,'RETURN',@sl,@tr,@sau,'HoanDoiTra',@ref,@gc,@uid)
        `);
      }

      // Cập nhật trạng thái → Hoan tat
      const r5 = new sql.Request(tx);
      r5.input('id', sql.Int, id);
      await r5.query(`UPDATE HoanDoiTra SET TrangThai=N'Hoan tat', NgayCapNhat=GETDATE() WHERE MaHoanDoiTra=@id`);
      await logHistory(tx, id, 'Hoan tien', 'Hoan tat', userId, 'Nhập lại kho và hoàn tất');
    }

    await tx.commit();
    res.json({ success: true, message: 'Hoàn tiền thành công', data: { MaGiaoDich: maGD } });
  } catch (err: any) { await tx.rollback(); res.status(500).json({ success: false, message: err.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/hoandoitra/:id/order-products  — Sản phẩm của đơn hàng (để tạo yêu cầu)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id/order-products', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = await query(`
      SELECT CT.MaSanPham, SP.TenSanPham, SP.HinhAnh,
             CT.SoLuong, CT.DonGia, CT.ThanhTien
      FROM ChiTietHoaDon CT
      LEFT JOIN SanPham SP ON CT.MaSanPham=SP.MaSanPham
      WHERE CT.MaHoaDon=@id
    `, { id });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/hoandoitra/:id/history  — Timeline lịch sử
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id/history', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = await query(`
      SELECT LS.*, COALESCE(NV.HoTen, TK.TenDangNhap, N'Hệ thống') AS NguoiThayDoi
      FROM LichSuTrangThaiHoanTra LS
      LEFT JOIN NhanVien  NV ON LS.NguoiThayDoi=NV.MaTaiKhoan
      LEFT JOIN TaiKhoan  TK ON LS.NguoiThayDoi=TK.MaTaiKhoan
      WHERE LS.MaHoanDoiTra=@id ORDER BY LS.NgayThayDoi ASC
    `, { id });
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
