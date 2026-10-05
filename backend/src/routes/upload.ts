import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authorizeRoles, AuthRequest } from '../middleware/auth';
import { execute } from '../config/database';
import crypto from 'crypto';

const router = Router();

// Tạo thư mục uploads nếu chưa tồn tại
const uploadDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Tạo tên file unique: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// File filter - chỉ chấp nhận ảnh
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (JPG, JPEG, PNG, WEBP)'), false);
  }
};

// Multer config
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
  }
});

const avatarDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
const avatarUpload = multer({ storage: multer.diskStorage({ destination: (_req, _file, cb) => cb(null, avatarDir), filename: (_req, file, cb) => cb(null, `customer-${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname).toLowerCase()}`) }), fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

const categoryDir = path.join(__dirname, '../../uploads/categories');
if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });
const categoryUpload = multer({ storage: multer.memoryStorage(), fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });

function verifiedImageExtension(buffer: Buffer): string | null {
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return '.jpg';
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return '.png';
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return '.webp';
  return null;
}

router.post('/category', authorizeRoles('Admin', 'NhanVien'), (req: AuthRequest, res) => {
  categoryUpload.single('image')(req, res, (error: any) => {
    if (error) return res.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Ảnh danh mục tối đa 2 MB' : error.message || 'Không thể nhận ảnh danh mục' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh danh mục' });
    const extension = verifiedImageExtension(req.file.buffer);
    if (!extension) return res.status(400).json({ success: false, message: 'Nội dung tệp không phải ảnh JPEG, PNG hoặc WEBP hợp lệ' });
    const filename = `category-${crypto.randomUUID()}${extension}`;
    const url = `/uploads/categories/${filename}`;
    fs.writeFile(path.join(categoryDir, filename), req.file.buffer, { flag: 'wx' }, (writeError) => {
      if (writeError) return res.status(500).json({ success: false, message: 'Không thể lưu ảnh danh mục lên máy chủ' });
      return res.status(201).json({ success: true, data: { filename, size: req.file!.size, url } });
    });
  });
});

router.post('/avatar', authorizeRoles('KhachHang'), avatarUpload.single('image'), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'Chọn ảnh JPG, PNG hoặc WEBP nhỏ hơn 2MB' });
  const url = `/uploads/avatars/${req.file.filename}`;
  try {
    const result = await execute('UPDATE dbo.KhachHang SET AnhDaiDien=@url WHERE MaTaiKhoan=@id', { url, id: req.user!.MaTaiKhoan });
    if (!result.rowsAffected) { fs.unlinkSync(req.file.path); return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ khách hàng' }); }
    res.json({ success: true, data: { AnhDaiDien: url } });
  } catch (error: any) { fs.unlinkSync(req.file.path); res.status(500).json({ success: false, message: 'Không thể lưu ảnh đại diện' }); }
});

// POST /api/upload - Upload single image
router.post('/', authorizeRoles('Admin', 'NhanVien'), upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Không có file được upload'
      });
    }

    // Trả về URL của ảnh
    const imageUrl = `/uploads/products/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Upload ảnh thành công',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: imageUrl
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi upload ảnh'
    });
  }
});

// DELETE /api/upload/:filename - Xóa ảnh
router.delete('/:filename', authorizeRoles('Admin', 'NhanVien'), (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    // Kiểm tra file tồn tại
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File không tồn tại'
      });
    }

    // Xóa file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Xóa ảnh thành công'
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Lỗi xóa ảnh'
    });
  }
});

export default router;
