import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';

const API = 'http://localhost:3000/api';
const IMG = 'http://localhost:3000';
const getToken = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '-';
const fmtDateTime = (d?: string) => d ? new Date(d).toLocaleString('vi-VN') : '-';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  'Cho xu ly':  { label: 'Chờ xử lý',       color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'Chờ xử lý': { label: 'Chờ xử lý',       color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'Tiep nhan':  { label: 'Đang tiếp nhận',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'Đang xử lý':{ label: 'Đang tiếp nhận',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'Kiem tra':   { label: 'Đang kiểm tra',   color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  'Cho duyet':  { label: 'Chờ Admin duyệt', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  'Da duyet':   { label: 'Đã duyệt',        color: 'bg-green-100 text-green-700 border-green-200' },
  'Đã duyệt':  { label: 'Đã duyệt',        color: 'bg-green-100 text-green-700 border-green-200' },
  'Tu choi':    { label: 'Từ chối',         color: 'bg-red-100 text-red-700 border-red-200' },
  'Từ chối':   { label: 'Từ chối',         color: 'bg-red-100 text-red-700 border-red-200' },
  'Hoan tien':  { label: 'Đã hoàn tiền',    color: 'bg-purple-100 text-purple-700 border-purple-200' },
  'Hoan tat':   { label: 'Hoàn tất',        color: 'bg-gray-100 text-gray-600 border-gray-200' },
  'Hoàn tất':  { label: 'Hoàn tất',        color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' };
  return <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${s.color}`}>{s.label}</span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-xs text-gray-400 w-32 flex-shrink-0 mt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-800 flex-1">{value || '-'}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function ChiTietHoanTra() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.VaiTro === 'Admin';

  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Modal states
  const [showApprove, setShowApprove]   = useState(false);
  const [showReject, setShowReject]     = useState(false);
  const [showRefund, setShowRefund]     = useState(false);
  const [showInspect, setShowInspect]   = useState(false);
  const [submitting, setSubmitting]     = useState(false);

  // Form states
  const [approveForm, setApproveForm] = useState({ NhapLaiKho: true, SoTienHoan: '', PhuongThucHoan: 'chuyen_khoan', GhiChu: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [refundForm, setRefundForm]   = useState({ PhuongThucHoan: 'chuyen_khoan', TenTaiKhoan: '', SoTaiKhoan: '', NganHang: '', GhiChu: '' });
  const [inspectForm, setInspectForm] = useState({ TinhTrangSP: 'con_seal', KetQua: 'du_dieu_kien', GhiChu: '' });

  const loadData = async () => {
    setLoading(true); setError('');
    try {
      const r = await axios.get(`${API}/hoandoitra/${id}`, { headers: getToken() });
      setData(r.data.data);
      // Prefill approve form với SoTienHoan hiện tại
      if (r.data.data.SoTienHoan) {
        setApproveForm(f => ({ ...f, SoTienHoan: String(r.data.data.SoTienHoan) }));
      }
    } catch (e: any) {
      setError(e.response?.data?.message || 'Không thể tải dữ liệu');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [id]);

  // ── actions ──────────────────────────────────────────────────────────────
  const doAction = async (url: string, body: object, successMsg: string) => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/hoandoitra/${id}/${url}`, body, { headers: getToken() });
      alert(successMsg);
      setShowApprove(false); setShowReject(false); setShowRefund(false); setShowInspect(false);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Có lỗi xảy ra');
    } finally { setSubmitting(false); }
  };

  const handleReceive  = () => doAction('receive', {}, 'Đã tiếp nhận yêu cầu');
  const handleApprove  = () => doAction('approve', { ...approveForm, SoTienHoan: Number(approveForm.SoTienHoan) }, 'Đã duyệt yêu cầu hoàn trả');
  const handleReject   = () => {
    if (!rejectReason.trim()) { alert('Vui lòng nhập lý do từ chối'); return; }
    doAction('reject', { LyDoTuChoi: rejectReason }, 'Đã từ chối yêu cầu');
  };
  const handleInspect  = () => doAction('inspect', inspectForm, 'Đã lưu kết quả kiểm tra');
  const handleRefund   = () => doAction('refund',  refundForm, 'Hoàn tiền thành công');

  // ── trạng thái → button ──────────────────────────────────────────────────
  const canReceive = ['Cho xu ly', 'Chờ xử lý'].includes(data?.TrangThai);
  const canInspect = ['Tiep nhan', 'Đang tiếp nhận', 'Đang xử lý', 'Kiem tra'].includes(data?.TrangThai);
  const canApprove = isAdmin && ['Cho duyet', 'Chờ Admin duyệt'].includes(data?.TrangThai);
  const canReject  = isAdmin && ['Cho duyet', 'Chờ Admin duyệt', 'Da duyet', 'Đã duyệt'].includes(data?.TrangThai);
  const canRefund  = isAdmin && ['Da duyet', 'Đã duyệt'].includes(data?.TrangThai);

  if (loading) return (
    <div className="flex items-center justify-center h-80">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
    </div>
  );

  if (error) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium mb-3">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">Thử lại</button>
      </div>
    </div>
  );

  if (!data) return null;

  // ── Tính số tiền hoàn ──────────────────────────────────────────────────
  const tongTienSP = data.chiTiet?.reduce((s: number, ct: any) => s + ct.ThanhTien, 0) || 0;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/returns')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mb-4">
          ← Quay lại danh sách
        </button>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-xs text-gray-400">Mã yêu cầu</p>
              <p className="text-xl font-bold text-pink-600">{data.MaYeuCau}</p>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div>
              <p className="text-xs text-gray-400">Mã đơn hàng</p>
              <p className="text-lg font-bold text-blue-600">{data.MaHoaDonHienThi}</p>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div>
              <p className="text-xs text-gray-400">Ngày yêu cầu</p>
              <p className="font-medium text-gray-800">{fmtDate(data.NgayYeuCau)}</p>
            </div>
            <div className="w-px h-10 bg-gray-200"></div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Trạng thái</p>
              <StatusBadge status={data.TrangThai} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {canReceive && (
              <button onClick={handleReceive} disabled={submitting}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50">
                Tiếp nhận
              </button>
            )}
            {canInspect && (
              <button onClick={() => setShowInspect(true)}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600">
                Nhập kết quả KT
              </button>
            )}
            {canApprove && (
              <button onClick={() => setShowApprove(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600">
                Phê duyệt
              </button>
            )}
            {canReject && (
              <button onClick={() => setShowReject(true)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
                Từ chối
              </button>
            )}
            {canRefund && (
              <button onClick={() => setShowRefund(true)}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600">
                Hoàn tiền
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row 1: Thông tin khách hàng + Thông tin đơn hàng */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Thông tin khách hàng">
          <InfoRow label="Họ tên"       value={data.TenKhachHang} />
          <InfoRow label="Số điện thoại" value={data.SoDienThoaiKH} />
          <InfoRow label="Email"         value={data.EmailKH} />
          <InfoRow label="Địa chỉ"       value={data.DiaChiKH} />
        </Card>

        <Card title="Thông tin đơn hàng">
          <InfoRow label="Mã đơn hàng"         value={data.MaHoaDonHienThi} />
          <InfoRow label="Ngày đặt"             value={fmtDate(data.NgayLap)} />
          <InfoRow label="Phương thức TT"       value={data.PhuongThucThanhToan} />
          <InfoRow label="Tổng tiền đơn"        value={<span className="text-pink-600 font-bold">{formatCurrency(data.TongTienDonHang)}</span>} />
        </Card>
      </div>

      {/* Row 2: Sản phẩm hoàn trả + Lý do */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Sản phẩm yêu cầu hoàn trả">
          {(!data.chiTiet || data.chiTiet.length === 0)
            ? <p className="text-sm text-gray-400 text-center py-4">Không có sản phẩm</p>
            : data.chiTiet.map((ct: any) => (
              <div key={ct.MaChiTiet} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                {ct.HinhAnh
                  ? <img src={`${IMG}${ct.HinhAnh}`} alt="" className="w-12 h-12 object-cover rounded-lg border flex-shrink-0"
                      onError={e => (e.currentTarget.style.display='none')} />
                  : <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0"></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{ct.TenSanPham}</p>
                  <p className="text-xs text-gray-400">SL: {ct.SoLuong} × {formatCurrency(ct.DonGia)}</p>
                  {ct.TrangThaiSanPham && (
                    <span className="text-xs text-blue-600">{ct.TrangThaiSanPham}</span>
                  )}
                </div>
                <p className="font-bold text-pink-600 text-sm">{formatCurrency(ct.ThanhTien)}</p>
              </div>
            ))
          }
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Tổng giá trị sản phẩm</span>
            <span className="font-bold text-pink-600">{formatCurrency(tongTienSP)}</span>
          </div>
          {data.SoTienHoan > 0 && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-gray-500">Số tiền hoàn</span>
              <span className="font-bold text-green-600">{formatCurrency(data.SoTienHoan)}</span>
            </div>
          )}
        </Card>

        <Card title="Lý do hoàn trả">
          <InfoRow label="Loại yêu cầu" value={
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${data.LoaiYeuCau?.includes('Đổi') ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
              {data.LoaiYeuCau}
            </span>
          } />
          <InfoRow label="Lý do" value={data.LyDo} />
          {data.MoTaChiTiet && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">Mô tả chi tiết</p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{data.MoTaChiTiet}</div>
            </div>
          )}
          {data.LyDoTuChoi && (
            <div className="mt-3">
              <p className="text-xs text-red-400 mb-1">Lý do từ chối</p>
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">{data.LyDoTuChoi}</div>
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Kết quả kiểm tra + Hoàn tiền */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Kết quả kiểm tra sản phẩm">
          {!data.kiemTra
            ? <p className="text-sm text-gray-400 text-center py-6">Chưa có kết quả kiểm tra</p>
            : <>
              <InfoRow label="Người kiểm tra" value={data.kiemTra.TenNguoiKiemTra} />
              <InfoRow label="Ngày kiểm tra"  value={fmtDate(data.kiemTra.NgayKiemTra)} />
              <InfoRow label="Tình trạng SP"  value={
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                  {({'con_seal':'Còn nguyên seal','da_mo':'Đã mở hộp','co_su_dung':'Có dấu hiệu sử dụng','hu_hong':'Hư hỏng','thieu_phu_kien':'Thiếu phụ kiện'} as Record<string,string>)[data.kiemTra.TinhTrangSP] || data.kiemTra.TinhTrangSP}
                </span>
              } />
              <InfoRow label="Kết quả" value={
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${data.kiemTra.KetQua==='du_dieu_kien'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>
                  {data.kiemTra.KetQua==='du_dieu_kien'?'Đủ điều kiện hoàn trả':'Không đủ điều kiện'}
                </span>
              } />
              {data.kiemTra.GhiChu && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-1">Ghi chú</p>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{data.kiemTra.GhiChu}</div>
                </div>
              )}
            </>
          }
        </Card>

        <Card title="Thông tin hoàn tiền">
          {!data.hoanTien
            ? <p className="text-sm text-gray-400 text-center py-6">Chưa thực hiện hoàn tiền</p>
            : <>
              <InfoRow label="Mã giao dịch"   value={<span className="font-mono text-xs">{data.hoanTien.MaGiaoDich}</span>} />
              <InfoRow label="Số tiền hoàn"   value={<span className="text-green-600 font-bold">{formatCurrency(data.hoanTien.SoTienHoan)}</span>} />
              <InfoRow label="Phương thức"     value={data.hoanTien.PhuongThucHoan} />
              {data.hoanTien.TenTaiKhoan && <InfoRow label="Tên TK"       value={data.hoanTien.TenTaiKhoan} />}
              {data.hoanTien.SoTaiKhoan  && <InfoRow label="Số TK"        value={data.hoanTien.SoTaiKhoan} />}
              {data.hoanTien.NganHang    && <InfoRow label="Ngân hàng"     value={data.hoanTien.NganHang} />}
              <InfoRow label="Người thực hiện" value={data.hoanTien.TenNguoiThucHien} />
              <InfoRow label="Ngày hoàn"       value={fmtDateTime(data.hoanTien.NgayHoan)} />
              {data.hoanTien.GhiChu && <InfoRow label="Ghi chú" value={data.hoanTien.GhiChu} />}
            </>
          }
        </Card>
      </div>

      {/* Row 4: Timeline */}
      <Card title="Lịch sử xử lý">
        {(!data.timeline || data.timeline.length === 0)
          ? <p className="text-sm text-gray-400 text-center py-4">Chưa có lịch sử</p>
          : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              {data.timeline.map((t: any, i: number) => (
                <div key={t.MaLichSu} className="relative mb-5 last:mb-0">
                  <div className={`absolute -left-6 w-4 h-4 rounded-full border-2 border-white ${i===data.timeline.length-1?'bg-pink-500':'bg-gray-300'}`}></div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        {t.TrangThaiCu && (
                          <>
                            <span className="text-xs text-gray-500">{STATUS_MAP[t.TrangThaiCu]?.label || t.TrangThaiCu}</span>
                            <span className="text-gray-300">→</span>
                          </>
                        )}
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_MAP[t.TrangThaiMoi]?.color || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {STATUS_MAP[t.TrangThaiMoi]?.label || t.TrangThaiMoi}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{fmtDateTime(t.NgayThayDoi)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      {t.GhiChu && <p className="text-xs text-gray-600 italic">{t.GhiChu}</p>}
                      <p className="text-xs text-gray-400 ml-auto">{t.NguoiThayDoi}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </Card>

      {/* ══ MODAL: Phê duyệt ════════════════════════════════════════════════ */}
      {showApprove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-bold text-gray-800">Xác nhận phê duyệt hoàn trả</h2>
              <button onClick={() => setShowApprove(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                <p><span className="text-gray-500">Mã yêu cầu:</span> <span className="font-semibold">{data.MaYeuCau}</span></p>
                <p><span className="text-gray-500">Khách hàng:</span> <span className="font-semibold">{data.TenKhachHang}</span></p>
                <p><span className="text-gray-500">Giá trị SP:</span> <span className="font-bold text-green-700">{formatCurrency(tongTienSP)}</span></p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Số tiền hoàn (đ) *</label>
                <input type="number" value={approveForm.SoTienHoan}
                  onChange={e => setApproveForm(f => ({ ...f, SoTienHoan: e.target.value }))}
                  max={tongTienSP}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                  placeholder="Nhập số tiền hoàn..." />
                <p className="text-xs text-gray-400 mt-1">Tối đa: {formatCurrency(tongTienSP)}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phương thức hoàn tiền</label>
                <select value={approveForm.PhuongThucHoan}
                  onChange={e => setApproveForm(f => ({ ...f, PhuongThucHoan: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none">
                  <option value="chuyen_khoan">Chuyển khoản</option>
                  <option value="hoan_phuong_thuc">Hoàn về phương thức thanh toán</option>
                  <option value="tien_mat">Tiền mặt tại cửa hàng</option>
                </select>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <input type="checkbox" id="nhapLaiKho" checked={approveForm.NhapLaiKho}
                  onChange={e => setApproveForm(f => ({ ...f, NhapLaiKho: e.target.checked }))}
                  className="w-4 h-4 accent-green-500" />
                <label htmlFor="nhapLaiKho" className="text-sm text-gray-700 cursor-pointer">
                  Cho phép nhập lại kho (sản phẩm đủ điều kiện bán lại)
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú</label>
                <textarea rows={2} value={approveForm.GhiChu}
                  onChange={e => setApproveForm(f => ({ ...f, GhiChu: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                  placeholder="Ghi chú khi duyệt..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowApprove(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
                <button onClick={handleApprove} disabled={submitting || !approveForm.SoTienHoan}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50">
                  {submitting ? 'Đang xử lý...' : 'Xác nhận duyệt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Từ chối ══════════════════════════════════════════════════ */}
      {showReject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-bold text-gray-800">Từ chối yêu cầu hoàn trả</h2>
              <button onClick={() => setShowReject(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
                <p className="text-red-700">Yêu cầu <span className="font-semibold">{data.MaYeuCau}</span> của khách hàng <span className="font-semibold">{data.TenKhachHang}</span> sẽ bị từ chối.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lý do từ chối *</label>
                <textarea rows={4} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none"
                  placeholder="Nhập lý do từ chối yêu cầu hoàn trả..." />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowReject(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
                <button onClick={handleReject} disabled={submitting || !rejectReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                  {submitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Hoàn tiền ════════════════════════════════════════════════ */}
      {showRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-bold text-gray-800">Thực hiện hoàn tiền</h2>
              <button onClick={() => setShowRefund(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Khách hàng:</span>
                  <span className="font-semibold">{data.TenKhachHang}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-500">Số tiền hoàn:</span>
                  <span className="font-bold text-purple-700 text-base">{formatCurrency(data.SoTienHoan)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phương thức hoàn tiền *</label>
                <select value={refundForm.PhuongThucHoan}
                  onChange={e => setRefundForm(f => ({ ...f, PhuongThucHoan: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none">
                  <option value="chuyen_khoan">Chuyển khoản</option>
                  <option value="hoan_phuong_thuc">Hoàn về phương thức TT ban đầu</option>
                  <option value="tien_mat">Tiền mặt tại cửa hàng</option>
                </select>
              </div>

              {refundForm.PhuongThucHoan === 'chuyen_khoan' && (
                <div className="space-y-3 bg-gray-50 rounded-lg p-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tên tài khoản</label>
                    <input value={refundForm.TenTaiKhoan} onChange={e => setRefundForm(f => ({ ...f, TenTaiKhoan: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                      placeholder="Nguyen Van A" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Số tài khoản</label>
                      <input value={refundForm.SoTaiKhoan} onChange={e => setRefundForm(f => ({ ...f, SoTaiKhoan: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                        placeholder="0123456789" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ngân hàng</label>
                      <input value={refundForm.NganHang} onChange={e => setRefundForm(f => ({ ...f, NganHang: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                        placeholder="Vietcombank" />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú</label>
                <input value={refundForm.GhiChu} onChange={e => setRefundForm(f => ({ ...f, GhiChu: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  placeholder="Ghi chú hoàn tiền..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowRefund(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
                <button onClick={handleRefund} disabled={submitting}
                  className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 disabled:opacity-50">
                  {submitting ? 'Đang xử lý...' : 'Xác nhận hoàn tiền'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Kết quả kiểm tra ════════════════════════════════════════ */}
      {showInspect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-5 border-b">
              <h2 className="font-bold text-gray-800">Nhập kết quả kiểm tra</h2>
              <button onClick={() => setShowInspect(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tình trạng sản phẩm *</label>
                <select value={inspectForm.TinhTrangSP}
                  onChange={e => setInspectForm(f => ({ ...f, TinhTrangSP: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none">
                  <option value="con_seal">Còn nguyên seal</option>
                  <option value="da_mo">Đã mở hộp</option>
                  <option value="co_su_dung">Có dấu hiệu sử dụng</option>
                  <option value="hu_hong">Hư hỏng</option>
                  <option value="thieu_phu_kien">Thiếu phụ kiện</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kết quả kiểm tra *</label>
                <select value={inspectForm.KetQua}
                  onChange={e => setInspectForm(f => ({ ...f, KetQua: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none">
                  <option value="du_dieu_kien">Đủ điều kiện hoàn trả</option>
                  <option value="khong_du_dieu_kien">Không đủ điều kiện hoàn trả</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú của nhân viên</label>
                <textarea rows={3} value={inspectForm.GhiChu}
                  onChange={e => setInspectForm(f => ({ ...f, GhiChu: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  placeholder="Mô tả tình trạng sản phẩm sau kiểm tra..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowInspect(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Hủy</button>
                <button onClick={handleInspect} disabled={submitting}
                  className="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">
                  {submitting ? 'Đang lưu...' : 'Lưu kết quả'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
