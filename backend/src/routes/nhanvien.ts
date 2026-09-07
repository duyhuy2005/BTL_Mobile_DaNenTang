import { Router } from 'express';
import { query, execute } from '../config/database';

const router = Router();

// GET all staff with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const offset = (page - 1) * limit;

    let whereClause = '';
    if (search) {
      whereClause = `WHERE HoTen LIKE N'%${search}%' OR ChucVu LIKE N'%${search}%' OR SoDienThoai LIKE '%${search}%' OR Email LIKE '%${search}%'`;
    }

    const data = await query(`
      SELECT 
        MaNhanVien,
        HoTen,
        ChucVu,
        SoDienThoai,
        Email,
        NgayVaoLam
      FROM NhanVien
      ${whereClause}
      ORDER BY MaNhanVien DESC
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `);

    const countResult = await query<{ Total: number }>(`
      SELECT COUNT(*) as Total FROM NhanVien ${whereClause}
    `);
    const total = countResult[0]?.Total || 0;

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
    const { id } = req.params;
    const data = await query(`
      SELECT 
        MaNhanVien,
        HoTen,
        ChucVu,
        SoDienThoai,
        Email,
        NgayVaoLam
      FROM NhanVien
      WHERE MaNhanVien = ${id}
    `);

    if (data.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    res.json({
      success: true,
      data: data[0]
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create new staff
router.post('/', async (req, res) => {
  try {
    const { HoTen, ChucVu, SoDienThoai, Email, NgayVaoLam } = req.body;

    // Validate
    if (!HoTen || !ChucVu || !SoDienThoai) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    // Check duplicate phone
    const existingPhone = await query(`
      SELECT MaNhanVien FROM NhanVien WHERE SoDienThoai = '${SoDienThoai}'
    `);
    if (existingPhone.length > 0) {
      return res.status(400).json({ success: false, message: 'Số điện thoại đã tồn tại' });
    }

    // Check duplicate email if provided
    if (Email) {
      const existingEmail = await query(`
        SELECT MaNhanVien FROM NhanVien WHERE Email = '${Email}'
      `);
      if (existingEmail.length > 0) {
        return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
      }
    }

    const result = await execute(`
      INSERT INTO NhanVien (HoTen, ChucVu, SoDienThoai, Email, NgayVaoLam)
      VALUES (
        N'${HoTen}',
        N'${ChucVu}',
        '${SoDienThoai}',
        ${Email ? `'${Email}'` : 'NULL'},
        ${NgayVaoLam ? `'${NgayVaoLam}'` : 'GETDATE()'}
      );
      SELECT SCOPE_IDENTITY() as MaNhanVien;
    `);

    const newId = result.recordset[0].MaNhanVien;

    res.status(201).json({
      success: true,
      message: 'Thêm nhân viên thành công',
      data: { MaNhanVien: newId }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update staff
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { HoTen, ChucVu, SoDienThoai, Email, NgayVaoLam } = req.body;

    // Check if staff exists
    const existing = await query(`SELECT MaNhanVien FROM NhanVien WHERE MaNhanVien = ${id}`);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    // Validate
    if (!HoTen || !ChucVu || !SoDienThoai) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    // Check duplicate phone (exclude current staff)
    const existingPhone = await query(`
      SELECT MaNhanVien FROM NhanVien WHERE SoDienThoai = '${SoDienThoai}' AND MaNhanVien != ${id}
    `);
    if (existingPhone.length > 0) {
      return res.status(400).json({ success: false, message: 'Số điện thoại đã tồn tại' });
    }

    // Check duplicate email (exclude current staff)
    if (Email) {
      const existingEmail = await query(`
        SELECT MaNhanVien FROM NhanVien WHERE Email = '${Email}' AND MaNhanVien != ${id}
      `);
      if (existingEmail.length > 0) {
        return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
      }
    }

    await execute(`
      UPDATE NhanVien
      SET 
        HoTen = N'${HoTen}',
        ChucVu = N'${ChucVu}',
        SoDienThoai = '${SoDienThoai}',
        Email = ${Email ? `'${Email}'` : 'NULL'},
        NgayVaoLam = ${NgayVaoLam ? `'${NgayVaoLam}'` : 'NgayVaoLam'}
      WHERE MaNhanVien = ${id}
    `);

    res.json({
      success: true,
      message: 'Cập nhật nhân viên thành công'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE staff
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if staff exists
    const existing = await query(`SELECT MaNhanVien FROM NhanVien WHERE MaNhanVien = ${id}`);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên' });
    }

    // Check if staff has related invoices
    const hasInvoices = await query(`SELECT COUNT(*) as Total FROM HoaDon WHERE MaNhanVien = ${id}`);
    if (hasInvoices[0].Total > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa nhân viên đã có hóa đơn. Vui lòng xóa các hóa đơn trước.' 
      });
    }

    await execute(`DELETE FROM NhanVien WHERE MaNhanVien = ${id}`);

    res.json({
      success: true,
      message: 'Xóa nhân viên thành công'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
