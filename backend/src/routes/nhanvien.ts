import { Router } from 'express';
import { query } from '../config/database';

const router = Router();

// GET all staff
router.get('/', async (req, res) => {
  try {
    const data = await query(`
      SELECT 
        MaNhanVien,
        HoTen,
        ChucVu,
        SoDienThoai,
        Email
      FROM NhanVien
      ORDER BY MaNhanVien
    `);
    
    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
