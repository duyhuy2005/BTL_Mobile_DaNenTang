import { Router } from 'express';
import { query, queryOne, execute } from '../config/database';

const router = Router();

// GET all staff with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any = { offset, limit };

    if (search) {
      whereClause += ` AND (NV.HoTen LIKE @search OR NV.ChucVu LIKE @search OR NV.SoDienThoai LIKE @search OR NV.Email LIKE @search)`;
      params.search = `%${search}%`;
    }

    const data = await query(`
      SELECT 
        NV.MaNhanVien,
        NV.HoTen,
        NV.ChucVu,
        NV.SoDienThoai,
        NV.Email,
        NV.NgayVaoLam,
        NV.TrangThai,
        TK.TenDangNhap,
        TK.VaiTro
      FROM NhanVien NV
      LEFT JOIN TaiKhoan TK ON NV.MaTaiKhoan = TK.MaTaiKhoan
      ${whereClause}
      ORDER BY NV.MaNhanVien DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `, params);

    const countResult = await queryOne<{ total: number }>(`
      SELECT COUNT(*) as total 
      FROM NhanVien NV
      LEFT JOIN TaiKhoan TK ON NV.MaTaiKhoan = TK.MaTaiKhoan
      ${whereClause}
    `, search ? { search: `%${search}%` } : {});

    const total = countResult?.total || 0;

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET staff by ID
router.get('/:id', async (req, res) => {
  try {
    const data = await queryOne(`
      SELECT 
        NV.MaNhanVien,
        NV.HoTen,
        NV.ChucVu,
        NV.SoDienThoai,
        NV.Email,
        NV.NgayVaoLam,
        NV.TrangThai,
        TK.TenDangNhap,
        TK.VaiTro
      FROM NhanVien NV
      LEFT JOIN TaiKhoan TK ON NV.MaTaiKhoan = TK.MaTaiKhoan
      WHERE NV.MaNhanVien = @id
    `, { id: Number(req.params.id) });

    if (!data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create new staff
router.post('/', async (req, res) => {
  try {
    const { HoTen, ChucVu, SoDienThoai, Email, NgayVaoLam } = req.body;

    if (!HoTen || !ChucVu || !SoDienThoai) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    // Check duplicate phone
    const existingPhone = await queryOne(
      `SELECT MaNhanVien FROM NhanVien WHERE SoDienThoai = @sdt`,
      { sdt: SoDienThoai }
    );
    if (existingPhone) {
      return res.status(400).json({ success: false, message: 'Số điện thoại đã tồn tại' });
    }

    // Check duplicate email
    if (Email) {
      const existingEmail = await queryOne(
        `SELECT MaNhanVien FROM NhanVien WHERE Email = @email`,
        { email: Email }
      );
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
      }
    }

    const result = await execute(`
      INSERT INTO NhanVien (HoTen, ChucVu, SoDienThoai, Email, NgayVaoLam, TrangThai)
      OUTPUT INSERTED.MaNhanVien
      VALUES (@HoTen, @ChucVu, @SoDienThoai, @Email, @NgayVaoLam, 1)
    `, {
      HoTen,
      ChucVu,
      SoDienThoai,
      Email: Email || null,
      NgayVaoLam: NgayVaoLam || new Date().toISOString().split('T')[0]
    });

    res.status(201).json({
      success: true,
      message: 'Thêm nhân viên thành công',
      data: { MaNhanVien: result.recordset[0]?.MaNhanVien }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update staff
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { HoTen, ChucVu, SoDienThoai, Email, NgayVaoLam, TrangThai } = req.body;

    const existing = await queryOne(`SELECT MaNhanVien FROM NhanVien WHERE MaNhanVien = @id`, { id });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    if (!HoTen || !ChucVu || !SoDienThoai) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    // Check duplicate phone (exclude current)
    const existingPhone = await queryOne(
      `SELECT MaNhanVien FROM NhanVien WHERE SoDienThoai = @sdt AND MaNhanVien != @id`,
      { sdt: SoDienThoai, id }
    );
    if (existingPhone) {
      return res.status(400).json({ success: false, message: 'Số điện thoại đã tồn tại' });
    }

    // Check duplicate email (exclude current)
    if (Email) {
      const existingEmail = await queryOne(
        `SELECT MaNhanVien FROM NhanVien WHERE Email = @email AND MaNhanVien != @id`,
        { email: Email, id }
      );
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
      }
    }

    await execute(`
      UPDATE NhanVien
      SET 
        HoTen = @HoTen,
        ChucVu = @ChucVu,
        SoDienThoai = @SoDienThoai,
        Email = @Email,
        NgayVaoLam = @NgayVaoLam,
        TrangThai = @TrangThai
      WHERE MaNhanVien = @id
    `, {
      HoTen,
      ChucVu,
      SoDienThoai,
      Email: Email || null,
      NgayVaoLam: NgayVaoLam || null,
      TrangThai: TrangThai !== undefined ? TrangThai : 1,
      id
    });

    res.json({ success: true, message: 'Cập nhật nhân viên thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE staff
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    const existing = await queryOne(`SELECT MaNhanVien FROM NhanVien WHERE MaNhanVien = @id`, { id });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    // Check if staff has related invoices → soft delete (TrangThai = 0)
    const hasInvoices = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM HoaDon WHERE MaNhanVien = @id`, { id }
    );
    if ((hasInvoices?.total || 0) > 0) {
      await execute(`UPDATE NhanVien SET TrangThai = 0 WHERE MaNhanVien = @id`, { id });
      return res.json({ success: true, message: 'Đã ngừng hoạt động nhân viên (có hóa đơn liên quan)' });
    }

    await execute(`DELETE FROM NhanVien WHERE MaNhanVien = @id`, { id });
    res.json({ success: true, message: 'Xóa nhân viên thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
