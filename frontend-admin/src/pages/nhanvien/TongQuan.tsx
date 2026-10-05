import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ORIGIN, dashboardAPI, invoicesAPI } from '../../services/api';
import { formatCurrency } from '../../utils/format';

type OrderLine = { MaSanPham: number; TenSanPham: string; HinhAnh?: string; SoLuong: number };
type StaffOrder = {
  MaHoaDon: number; HoTen: string; NgayLap: string; TongTien: number; TrangThai: string;
  PhuongThucThanhToan?: string; TrangThaiThanhToan?: string; TrangThaiVanChuyen?: string;
  DonViVanChuyen?: string; MaVanDon?: string; SanPhamTomTat: OrderLine[];
};
type Overview = {
  stats: { ChoXacNhan: number; DangChuanBi: number; DangGiao: number; YeuCauHoanTra: number };
  pendingOrders: StaffOrder[]; preparationOrders: StaffOrder[]; deliveryOrders: StaffOrder[];
  lowStockProducts: Array<{ MaSanPham:number; TenSanPham:string; MaSKU?:string; HinhAnh?:string; CoTheBan:number; NguongCanhBaoTonKho:number }>;
  activities: Array<{ MaLichSu:number; MaHoaDon:number; TrangThaiCu?:string; TrangThaiMoi:string; NgayThayDoi:string; NguoiThayDoi:string }>;
};
type Queue = 'pending' | 'preparation' | 'delivery';

const number = (value: unknown) => Number(value || 0);
const orderCode = (id: number) => `DH${String(id).padStart(8, '0')}`;
const orderStatus: Record<string,string> = {
  CHO_XAC_NHAN:'Chờ xác nhận', DA_XAC_NHAN:'Đã xác nhận', DANG_CHUAN_BI:'Đang chuẩn bị',
  DA_DONG_GOI:'Đã đóng gói', DANG_GIAO:'Đang giao', DA_GIAO:'Đã giao', HOAN_THANH:'Hoàn thành',
  DA_HUY:'Đã hủy', GIAO_THAT_BAI:'Giao thất bại',
};
const paymentStatus: Record<string,string> = { CHUA_THANH_TOAN:'Chưa thanh toán', CHO_THANH_TOAN:'Chờ thanh toán', DA_THANH_TOAN:'Đã thanh toán', CHO_HOAN_TIEN:'Chờ hoàn tiền', DA_HOAN_TIEN:'Đã hoàn tiền' };
const shippingStatus: Record<string,string> = { CHUA_TAO_VAN_DON:'Chưa tạo vận đơn', CHO_LAY_HANG:'Chờ lấy hàng', DA_LAY_HANG:'Đã lấy hàng', DANG_VAN_CHUYEN:'Đang vận chuyển', DANG_GIAO:'Đang giao', GIAO_THANH_CONG:'Giao thành công', GIAO_THAT_BAI:'Giao thất bại', DANG_HOAN_VE:'Đang hoàn về' };
const imageUrl = (value?: string) => !value ? undefined : /^https?:\/\//i.test(value) ? value : `${API_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
const errorText = (error: any) => {
  if (!error?.response) return 'Không thể kết nối Backend. Kiểm tra máy chủ và URL API rồi thử lại.';
  const status = error.response.status;
  if (status === 401) return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Tài khoản không có quyền xem Tổng quan nhân viên.';
  if (status === 404) return 'Backend chưa có API tổng quan nhân viên (404).';
  return error.response.data?.message || `Backend lỗi HTTP ${status}.`;
};
const time = (value: string) => new Date(value).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });

function Pill({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'amber'|'blue'|'green'|'rose'|'slate' }) {
  const colors = { amber:'bg-amber-50 text-amber-800', blue:'bg-blue-50 text-blue-800', green:'bg-emerald-50 text-emerald-800', rose:'bg-rose-50 text-rose-800', slate:'bg-slate-100 text-slate-700' };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${colors[tone]}`}>{children}</span>;
}

export default function StaffDashboard() {
  const navigate = useNavigate();
  const user = useMemo(() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } }, []);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<Queue>('pending');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const response = await dashboardAPI.getStaffOverview();
      if (!response.data?.success || !response.data?.data) throw new Error('API tổng quan trả dữ liệu không đúng cấu trúc.');
      setData(response.data.data as Overview);
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(true); }, 60_000);
    const onVisible = () => { if (!document.hidden) void load(true); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  const rows = queue === 'pending' ? data?.pendingOrders : queue === 'preparation' ? data?.preparationOrders : data?.deliveryOrders;
  const runAction = async (order: StaffOrder) => {
    const action = order.TrangThai === 'CHO_XAC_NHAN' ? 'confirm' : order.TrangThai === 'DA_XAC_NHAN' ? 'start_prepare' : order.TrangThai === 'DANG_CHUAN_BI' ? 'pack' : null;
    if (order.TrangThai === 'DA_DONG_GOI') { navigate(`/deliveries?createFor=${order.MaHoaDon}`); return; }
    if (!action) { navigate(`/invoices/${order.MaHoaDon}`); return; }
    const labels: Record<string,string> = { confirm:'Xác nhận đơn', start_prepare:'Bắt đầu chuẩn bị đơn', pack:'Xác nhận đã đóng gói đơn' };
    if (!window.confirm(`${labels[action]} ${orderCode(order.MaHoaDon)}?`)) return;
    setBusyId(order.MaHoaDon); setNotice('');
    try {
      await invoicesAPI.action(order.MaHoaDon, { action });
      setNotice(`Đã cập nhật ${orderCode(order.MaHoaDon)}.`);
      await load(true);
    } catch (e:any) {
      setNotice(e?.response?.status === 409 ? `${e.response.data?.message || 'Đơn đã được thay đổi bởi người khác.'} Danh sách đang được tải lại.` : errorText(e));
      await load(true);
    } finally { setBusyId(null); }
  };

  const stats = data?.stats;
  const cards = [
    { label:'Đơn chờ xác nhận', value:stats?.ChoXacNhan, icon:'▤', tone:'amber', click:()=>setQueue('pending') },
    { label:'Chuẩn bị / chờ bàn giao', value:stats?.DangChuanBi, icon:'◇', tone:'gold', click:()=>setQueue('preparation') },
    { label:'Đang giao hàng', value:stats?.DangGiao, icon:'⇢', tone:'blue', click:()=>setQueue('delivery') },
    { label:'Yêu cầu hoàn trả chờ duyệt', value:stats?.YeuCauHoanTra, icon:'↶', tone:'rose', click:()=>navigate('/returns?status=CHO_DUYET') },
  ];
  const tabs: Array<{ id:Queue; label:string; count?:number }> = [
    { id:'pending', label:'Chờ xác nhận', count:stats?.ChoXacNhan },
    { id:'preparation', label:'Chuẩn bị / chờ bàn giao', count:stats?.DangChuanBi },
    { id:'delivery', label:'Đang giao', count:stats?.DangGiao },
  ];

  if (loading && !data) return <div className="min-h-[70vh] bg-slate-50 p-8"><div className="mx-auto max-w-7xl animate-pulse space-y-5"><div className="h-12 w-1/3 rounded-xl bg-white"/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{tabs.concat(tabs.slice(0,1)).map((tab,i)=><div key={`${tab.id}-${i}`} className="h-32 rounded-2xl bg-white"/>)}</div><div className="h-96 rounded-2xl bg-white"/></div></div>;

  return <div className="min-h-[calc(100vh-72px)] bg-[#f5f7fb] px-4 py-5 sm:px-6 lg:px-7">
    <div className="mx-auto max-w-[1600px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-medium text-slate-500">Nhân viên <span className="mx-1">/</span> Tổng quan</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#12223f]">Tổng quan</h1><p className="mt-1 text-slate-600">Chào {user.HoTen || user.TenDangNhap || 'bạn'}, cùng bắt đầu một ngày làm việc hiệu quả!</p></div>
        <div className="flex items-center gap-3"><span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Dữ liệu hệ thống</span><button onClick={()=>void load(true)} disabled={refreshing} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-amber-400 disabled:opacity-50">{refreshing?'Đang cập nhật…':'↻ Làm mới'}</button></div>
      </header>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button onClick={()=>void load()} className="rounded-lg bg-rose-700 px-3 py-2 font-semibold text-white">Thử lại</button></div>}
      {notice && <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Đóng thông báo">×</button></div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(card=><button key={card.label} onClick={card.click} disabled={!data} className="group flex min-h-32 items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-default">
          <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-full text-3xl ${card.tone==='amber'?'bg-orange-50 text-orange-800':card.tone==='gold'?'bg-amber-50 text-amber-800':card.tone==='blue'?'bg-blue-50 text-blue-900':'bg-rose-50 text-rose-800'}`}>{card.icon}</span>
          <span><span className="block text-sm text-slate-600">{card.label}</span><strong className="mt-1 block text-3xl leading-none text-[#12223f]">{data ? number(card.value).toLocaleString('vi-VN') : '—'}</strong><span className="mt-2 block text-sm font-semibold text-amber-700">Mở danh sách →</span></span>
        </button>)}
      </section>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.95fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="text-lg font-extrabold text-[#12223f]">Đơn hàng cần xử lý</h2><p className="mt-0.5 text-xs text-slate-500">Đơn tồn đọng mọi ngày, sắp xếp từ đơn cũ nhất</p></div><Link className="text-sm font-semibold text-amber-700 hover:underline" to="/invoices">Mở quản lý đơn →</Link></div>
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-2">{tabs.map(tab=><button key={tab.id} onClick={()=>setQueue(tab.id)} className={`whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-semibold ${queue===tab.id?'border-b-2 border-amber-500 bg-amber-50 text-amber-900':'text-slate-500 hover:bg-slate-50'}`}>{tab.label} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{data ? number(tab.count) : '—'}</span></button>)}</div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="px-4 py-3 text-left">Mã đơn</th><th className="px-4 py-3 text-left">Khách hàng / sản phẩm</th><th className="px-4 py-3 text-left">Tổng tiền</th><th className="px-4 py-3 text-left">Đơn hàng</th><th className="px-4 py-3 text-left">Thanh toán</th><th className="px-4 py-3 text-left">Vận chuyển</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">
            {error && !data ? <tr><td colSpan={7} className="p-10 text-center text-slate-500">Không có dữ liệu do lỗi tải. Hãy thử lại sau khi sửa kết nối.</td></tr> : !rows?.length ? <tr><td colSpan={7} className="p-10 text-center text-slate-400">Không có đơn trong nhóm này.</td></tr> : rows.map(order=>{
              const actionLabel = order.TrangThai==='CHO_XAC_NHAN'?'Xử lý':order.TrangThai==='DA_XAC_NHAN'?'Chuẩn bị':order.TrangThai==='DANG_CHUAN_BI'?'Đóng gói':order.TrangThai==='DA_DONG_GOI'?'Tạo vận đơn':'Chi tiết';
              const products = order.SanPhamTomTat || [];
              return <tr key={order.MaHoaDon} className="hover:bg-amber-50/30"><td className="px-4 py-3"><Link to={`/invoices/${order.MaHoaDon}`} className="font-bold text-[#142747] hover:text-amber-700">{orderCode(order.MaHoaDon)}</Link><span className="mt-1 block text-xs text-slate-400">{time(order.NgayLap)}</span></td><td className="px-4 py-3"><b className="block max-w-44 truncate text-slate-800">{order.HoTen || 'Khách lẻ'}</b><div className="mt-1 flex items-center gap-1">{products.slice(0,2).map((product,index)=><span key={`${product.MaSanPham}-${index}`} className="h-7 w-7 overflow-hidden rounded-md bg-slate-100"><img src={imageUrl(product.HinhAnh)} alt="" className="h-full w-full object-cover" onError={e=>{e.currentTarget.style.display='none'}}/></span>)}<span className="max-w-36 truncate text-xs text-slate-500">{products[0]?.TenSanPham || 'Chi tiết đơn'}{products.length>1?` +${products.length-1}`:''}</span></div></td><td className="whitespace-nowrap px-4 py-3 font-bold">{formatCurrency(number(order.TongTien))}</td><td className="px-4 py-3"><Pill tone={order.TrangThai==='CHO_XAC_NHAN'?'amber':order.TrangThai==='DA_DONG_GOI'?'green':'blue'}>{orderStatus[order.TrangThai] || order.TrangThai}</Pill></td><td className="px-4 py-3"><Pill tone={order.TrangThaiThanhToan==='DA_THANH_TOAN'?'green':'slate'}>{paymentStatus[order.TrangThaiThanhToan || ''] || order.TrangThaiThanhToan || order.PhuongThucThanhToan || 'Chưa rõ'}</Pill></td><td className="px-4 py-3"><Pill tone={order.TrangThaiVanChuyen==='GIAO_THANH_CONG'?'green':'slate'}>{shippingStatus[order.TrangThaiVanChuyen || ''] || order.TrangThaiVanChuyen || 'Chưa tạo vận đơn'}</Pill></td><td className="px-4 py-3 text-right"><button onClick={()=>void runAction(order)} disabled={busyId===order.MaHoaDon} className="whitespace-nowrap rounded-lg bg-[#172944] px-3 py-2 text-xs font-bold text-white hover:bg-amber-500 hover:text-slate-950 disabled:opacity-50">{busyId===order.MaHoaDon?'Đang lưu…':actionLabel}</button></td></tr>;
            })}
          </tbody></table></div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-[#12223f]">Việc cần xử lý</h2><p className="text-xs text-slate-500">Số việc đang mở theo trạng thái hiện tại</p></div><Link to="/returns" className="text-sm font-semibold text-amber-700">Hoàn trả →</Link></div>
            {[['Đơn cần xác nhận',stats?.ChoXacNhan,'pending'],['Đơn đang chuẩn bị / chờ bàn giao',stats?.DangChuanBi,'preparation'],['Yêu cầu hoàn trả chờ duyệt',stats?.YeuCauHoanTra,'returns']].map(([label,value,target])=><button key={String(label)} onClick={()=>target==='returns'?navigate('/returns?status=CHO_DUYET'):setQueue(target as Queue)} disabled={!data} className="flex w-full items-center gap-3 border-t border-slate-100 py-3 text-left first:border-0"><span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-900">✓</span><span className="flex-1 text-sm font-medium text-slate-800">{label}</span><strong className="text-sm text-slate-500">{data?number(value).toLocaleString('vi-VN'):'—'}</strong><span className="text-slate-400">→</span></button>)}
          </section>
          <section className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-[#12223f]">Sản phẩm cần chú ý</h2><p className="text-xs text-slate-500">Tồn có thể bán không vượt ngưỡng cảnh báo</p></div><Link to="/warehouse" className="text-sm font-semibold text-amber-700">Mở kho →</Link></div>
            {error&&!data?<p className="py-4 text-sm text-slate-500">Chưa tải được tồn kho.</p>:!data?.lowStockProducts.length?<p className="py-4 text-sm text-slate-500">Không có sản phẩm dưới ngưỡng tồn kho.</p>:data.lowStockProducts.map(product=><button key={product.MaSanPham} onClick={()=>navigate('/warehouse')} className="flex w-full items-center gap-3 border-t border-rose-100 py-2.5 text-left first:border-0"><span className="h-11 w-11 overflow-hidden rounded-lg bg-white"><img src={imageUrl(product.HinhAnh)} alt="" className="h-full w-full object-cover" onError={e=>{e.currentTarget.style.display='none'}}/></span><span className="min-w-0 flex-1"><b className="block truncate text-sm text-slate-800">{product.TenSanPham}</b><small className="text-slate-500">{product.MaSKU || `SP${product.MaSanPham}`}</small></span><Pill tone={number(product.CoTheBan)===0?'rose':'amber'}>Còn {number(product.CoTheBan)}</Pill></button>)}
          </section>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-[#12223f]">Hoạt động gần đây</h2><p className="text-xs text-slate-500">Lịch sử thay đổi trạng thái đơn hàng từ hệ thống</p></div><button onClick={()=>void load(true)} disabled={refreshing} className="text-sm font-semibold text-amber-700">{refreshing?'Đang cập nhật…':'Cập nhật'}</button></div>
        {error&&!data?<p className="py-5 text-sm text-slate-500">Chưa tải được lịch sử hoạt động.</p>:!data?.activities.length?<p className="py-5 text-sm text-slate-400">Chưa có lịch sử thao tác.</p>:<div className="grid gap-x-8 md:grid-cols-2">{data.activities.map(item=><div key={item.MaLichSu} className="flex gap-3 border-t border-slate-100 py-3 first:border-0"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 ring-4 ring-amber-50"/><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">Đơn {orderCode(item.MaHoaDon)} · {orderStatus[item.TrangThaiMoi]||item.TrangThaiMoi}</p><p className="mt-0.5 text-xs text-slate-500">{item.NguoiThayDoi} · {time(item.NgayThayDoi)}</p></div><Link to={`/invoices/${item.MaHoaDon}`} className="text-xs font-semibold text-amber-700">Xem</Link></div>)}</div>}
      </section>
    </div>
  </div>;
}
