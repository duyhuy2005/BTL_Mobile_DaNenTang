require('dotenv').config();
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../dist/config/database');

const marker = `SHIP_TEST_${Date.now()}`;
const base = 'http://127.0.0.1:3000/api';

async function api(token, method, path, body, expected = [200, 201]) {
  const response = await fetch(base + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let payload;
  try { payload = await response.json(); } catch { payload = {}; }
  if (!expected.includes(response.status)) throw new Error(`${method} ${path}: ${response.status} ${payload.message || ''}`);
  return { status: response.status, payload };
}

async function cleanup(pool, orderId, restoreExported) {
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const holds = (await new sql.Request(tx).input('orderId', sql.Int, orderId).query(`SELECT gh.MaLo,gh.SoLuong,l.MaSanPham
      FROM GiuHangDonHang gh JOIN LoSanPham l ON l.MaLo=gh.MaLo WHERE gh.MaHoaDon=@orderId AND gh.TrangThai=N'Đã xuất'`)).recordset;
    await new sql.Request(tx).input('orderId', sql.Int, orderId).query("UPDATE l SET SoLuongDaGiu=SoLuongDaGiu-gh.SoLuong FROM LoSanPham l JOIN GiuHangDonHang gh ON gh.MaLo=l.MaLo WHERE gh.MaHoaDon=@orderId AND gh.TrangThai=N'Đang giữ'");
    if (restoreExported) {
      for (const hold of holds) {
        await new sql.Request(tx).input('lotId', sql.Int, hold.MaLo).input('qty', sql.Int, hold.SoLuong).query('UPDATE LoSanPham SET SoLuongTon=SoLuongTon+@qty WHERE MaLo=@lotId');
        await new sql.Request(tx).input('productId', sql.Int, hold.MaSanPham).input('qty', sql.Int, hold.SoLuong).query('UPDATE SanPham SET SoLuong=SoLuong+@qty WHERE MaSanPham=@productId');
      }
    }
    const shipment = (await new sql.Request(tx).input('orderId', sql.Int, orderId).query('SELECT Id FROM VanChuyen WHERE HoaDonId=@orderId')).recordset[0];
    if (shipment) {
      const inspection = (await new sql.Request(tx).input('shipmentId', sql.Int, shipment.Id).query('SELECT Id FROM KiemTraHangHoan WHERE VanChuyenId=@shipmentId')).recordset[0];
      if (inspection) await new sql.Request(tx).input('inspectionId', sql.Int, inspection.Id).query('DELETE FROM ChiTietKiemTraHangHoan WHERE KiemTraHangHoanId=@inspectionId; DELETE FROM KiemTraHangHoan WHERE Id=@inspectionId');
      await new sql.Request(tx).input('shipmentId', sql.Int, shipment.Id).query('DELETE FROM LichSuVanChuyen WHERE VanChuyenId=@shipmentId; DELETE FROM VanChuyen WHERE Id=@shipmentId');
    }
    await new sql.Request(tx).input('orderId', sql.Int, orderId).query(`DELETE FROM BienDongKho WHERE MaHoaDon=@orderId;
      DELETE FROM GiuHangDonHang WHERE MaHoaDon=@orderId; DELETE FROM LichSuTrangThaiHoaDon WHERE MaHoaDon=@orderId;
      DELETE FROM ChiTietHoaDon WHERE MaHoaDon=@orderId; DELETE FROM HoaDon WHERE MaHoaDon=@orderId`);
    await tx.commit();
  } catch (error) { await tx.rollback(); throw error; }
}

(async () => {
  const pool = await getPool();
  const context = (await pool.request().query(`SELECT TOP 1 tk.MaTaiKhoan,tk.TenDangNhap,tk.VaiTro FROM TaiKhoan tk WHERE tk.VaiTro IN(N'Admin',N'Quản trị viên') ORDER BY tk.MaTaiKhoan;
    SELECT TOP 1 kh.MaKhachHang,kh.HoTen,kh.SoDienThoai,kh.DiaChi FROM KhachHang kh ORDER BY kh.MaKhachHang;
    SELECT TOP 1 sp.MaSanPham,sp.TenSanPham,SUM(l.SoLuongTon-l.SoLuongDaGiu) CoTheBan FROM SanPham sp JOIN LoSanPham l ON l.MaSanPham=sp.MaSanPham
      WHERE sp.TrangThai=1 AND sp.IsDeleted=0 AND (l.HanSuDung IS NULL OR l.HanSuDung>=CONVERT(date,GETDATE())) GROUP BY sp.MaSanPham,sp.TenSanPham HAVING SUM(l.SoLuongTon-l.SoLuongDaGiu)>=2 ORDER BY sp.MaSanPham;
    SELECT TOP 1 Id FROM DonViVanChuyen WHERE TrangThai=1 ORDER BY Id`)).recordsets;
  const [admin, customer, product, carrier] = context.map((set) => set[0]);
  if (!admin || !customer || !product || !carrier) throw new Error('Thiếu Admin, khách hàng, sản phẩm tồn kho hoặc đơn vị vận chuyển để kiểm thử');
  const token = jwt.sign(admin, process.env.JWT_SECRET || 'beauty_store_secret', { expiresIn: '10m' });
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const before = (await pool.request().input('productId', sql.Int, product.MaSanPham).query('SELECT SoLuong FROM SanPham WHERE MaSanPham=@productId')).recordset[0].SoLuong;
  const createdOrders = [];
  try {
    async function createOrder(suffix) {
      const result = await api(token, 'POST', '/hoadon', { MaKhachHang: customer.MaKhachHang, PhuongThucThanhToan: 'COD', GhiChu: `${marker}_${suffix}`, TenNguoiNhan: customer.HoTen, SoDienThoaiNhan: customer.SoDienThoai || '0900000000', DiaChiGiaoHang: customer.DiaChi || 'Địa chỉ kiểm thử', danhSachSanPham: [{ MaSanPham: product.MaSanPham, SoLuong: 1 }] });
      const id = result.payload.data.MaHoaDon; createdOrders.push(id);
      await api(token, 'POST', `/hoadon/${id}/actions`, { action: 'confirm' });
      await api(token, 'POST', `/hoadon/${id}/actions`, { action: 'start_prepare' });
      await api(token, 'POST', `/hoadon/${id}/actions`, { action: 'pack' });
      const eligible = await api(token, 'GET', '/vanchuyen/don-hang-du-dieu-kien');
      if (!eligible.payload.data.some((item) => item.MaHoaDon === id && item.SanPham?.length)) throw new Error('Đơn đã đóng gói không xuất hiện trong danh sách đủ điều kiện');
      const shipment = await api(token, 'POST', '/vanchuyen', { HoaDonId: id, DonViVanChuyenId: carrier.Id, LoaiDichVu: 'Giao nhanh', KhoiLuong: 0.5, PhiVanChuyen: 30000, NgayDuKienGiao: tomorrow, GhiChuGiaoHang: marker });
      if (!/^VC-\d{8}-\d{4}$/.test(shipment.payload.data.MaVanDon)) throw new Error('Mã vận đơn không đúng định dạng VC-YYYYMMDD-XXXX');
      const eligibleAfter = await api(token, 'GET', '/vanchuyen/don-hang-du-dieu-kien');
      if (eligibleAfter.payload.data.some((item) => item.MaHoaDon === id)) throw new Error('Đơn vẫn còn trong danh sách đủ điều kiện sau khi tạo vận đơn');
      return { orderId: id, shipmentId: shipment.payload.data.Id, tracking: shipment.payload.data.MaVanDon };
    }

    const success = await createOrder('SUCCESS');
    const duplicate = await api(token, 'POST', '/vanchuyen', { HoaDonId: success.orderId, DonViVanChuyenId: carrier.Id, LoaiDichVu: 'Giao nhanh', KhoiLuong: 0.5, PhiVanChuyen: 30000, NgayDuKienGiao: tomorrow }, [409]);
    await api(token, 'POST', `/vanchuyen/${success.shipmentId}/actions`, { action: 'picked_up' });
    await api(token, 'POST', `/vanchuyen/${success.shipmentId}/actions`, { action: 'picked_up' });
    await api(token, 'POST', `/vanchuyen/${success.shipmentId}/actions`, { action: 'in_transit' });
    await api(token, 'POST', `/vanchuyen/${success.shipmentId}/actions`, { action: 'out_for_delivery' });
    await api(token, 'POST', `/vanchuyen/${success.shipmentId}/actions`, { action: 'delivered' });
    await api(token, 'POST', `/vanchuyen/${success.shipmentId}/actions`, { action: 'cod_pending' });
    await api(token, 'POST', `/vanchuyen/${success.shipmentId}/actions`, { action: 'cod_reconciled' });
    await api(token, 'POST', `/vanchuyen/${success.shipmentId}/actions`, { action: 'cod_transferred' });
    const successCheck = (await pool.request().input('id', sql.Int, success.shipmentId).query(`SELECT vc.TrangThai,vc.TrangThaiCOD,hd.TrangThai TrangThaiDon,hd.TrangThaiThanhToan,
      (SELECT COUNT(*) FROM LichSuVanChuyen WHERE VanChuyenId=vc.Id) Timeline,
      (SELECT COUNT(*) FROM BienDongKho WHERE MaHoaDon=vc.HoaDonId AND Loai=N'Xuất') SoLanXuat FROM VanChuyen vc JOIN HoaDon hd ON hd.MaHoaDon=vc.HoaDonId WHERE vc.Id=@id`)).recordset[0];
    const searchCheck = await api(token, 'GET', `/vanchuyen?search=${encodeURIComponent(success.tracking)}&status=GIAO_THANH_CONG&payment=COD`);
    const detailCheck = await api(token, 'GET', `/vanchuyen/${success.shipmentId}`);
    console.log('SUCCESS_FLOW', JSON.stringify({ duplicate: duplicate.status, searchResults: searchCheck.payload.pagination.total, products: detailCheck.payload.data.SanPham.length, timelineFromAPI: detailCheck.payload.data.Timeline.length, ...successCheck }));
    await cleanup(pool, success.orderId, true); createdOrders.splice(createdOrders.indexOf(success.orderId), 1);

    const failed = await createOrder('RETURN');
    await api(token, 'POST', `/vanchuyen/${failed.shipmentId}/actions`, { action: 'picked_up' });
    await api(token, 'POST', `/vanchuyen/${failed.shipmentId}/actions`, { action: 'in_transit' });
    await api(token, 'POST', `/vanchuyen/${failed.shipmentId}/actions`, { action: 'out_for_delivery' });
    const missingReason = await api(token, 'POST', `/vanchuyen/${failed.shipmentId}/actions`, { action: 'failed' }, [400]);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await api(token, 'POST', `/vanchuyen/${failed.shipmentId}/actions`, { action: 'failed', reason: 'Không liên hệ được' });
      if (attempt < 3) {
        await api(token, 'POST', `/vanchuyen/${failed.shipmentId}/actions`, { action: 'reschedule', expectedDate: tomorrow, note: `Giao lại lần ${attempt + 1}` });
        await api(token, 'POST', `/vanchuyen/${failed.shipmentId}/actions`, { action: 'retry_delivery' });
      }
    }
    const fourthAttempt = await api(token, 'POST', `/vanchuyen/${failed.shipmentId}/actions`, { action: 'reschedule', expectedDate: tomorrow }, [409]);
    await api(token, 'POST', `/vanchuyen/${failed.shipmentId}/actions`, { action: 'return_to_shop' });
    const stockWhileReturning = (await pool.request().input('productId', sql.Int, product.MaSanPham).query('SELECT SoLuong FROM SanPham WHERE MaSanPham=@productId')).recordset[0].SoLuong;
    await api(token, 'POST', `/vanchuyen/${failed.shipmentId}/actions`, { action: 'returned', note: 'Kiểm tra hàng hoàn đạt', items: [{ MaSanPham: product.MaSanPham, SoLuongNhapLai: 1, SoLuongHuHong: 0, TinhTrang: 'Nguyên tem, đủ điều kiện bán' }] });
    const failedCheck = (await pool.request().input('id', sql.Int, failed.shipmentId).input('productId', sql.Int, product.MaSanPham).query(`SELECT vc.TrangThai,vc.SoLanGiao,hd.TrangThai TrangThaiDon,(SELECT COUNT(*) FROM LichSuVanChuyen WHERE VanChuyenId=vc.Id) Timeline,
      (SELECT SoLuong FROM SanPham WHERE MaSanPham=@productId) TonSauHoan FROM VanChuyen vc JOIN HoaDon hd ON hd.MaHoaDon=vc.HoaDonId WHERE vc.Id=@id`)).recordset[0];
    console.log('RETURN_FLOW', JSON.stringify({ missingReason: missingReason.status, fourthAttempt: fourthAttempt.status, stockWhileReturning, stockBefore: before, ...failedCheck }));
    await cleanup(pool, failed.orderId, false); createdOrders.splice(createdOrders.indexOf(failed.orderId), 1);

    const list = await api(token, 'GET', `/vanchuyen?search=${encodeURIComponent(marker)}`);
    const finalStock = (await pool.request().input('productId', sql.Int, product.MaSanPham).query('SELECT SoLuong FROM SanPham WHERE MaSanPham=@productId')).recordset[0].SoLuong;
    console.log('CLEANUP', JSON.stringify({ testShipmentsRemaining: list.payload.pagination.total, stockBefore: before, stockAfter: finalStock }));
  } finally {
    for (const orderId of createdOrders) {
      try { await cleanup(pool, orderId, true); } catch (error) { console.error('CLEANUP_ERROR', orderId, error.message); }
    }
    await pool.close();
  }
})().catch((error) => { console.error(error.message); process.exit(1); });
