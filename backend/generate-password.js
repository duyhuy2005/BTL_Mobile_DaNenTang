const bcrypt = require('bcryptjs');

const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);

console.log('');
console.log('========================================');
console.log('  BEAUTY STORE - Password Hash Generator');
console.log('========================================');
console.log('');
console.log('Password:', password);
console.log('Hash:', hash);
console.log('');
console.log('SQL INSERT:');
console.log('');
console.log(`INSERT INTO TaiKhoan (TenDangNhap, MatKhau, VaiTro, TrangThai)`);
console.log(`VALUES ('admin', '${hash}', N'Admin', N'Hoạt động');`);
console.log('');
console.log('========================================');
console.log('');
