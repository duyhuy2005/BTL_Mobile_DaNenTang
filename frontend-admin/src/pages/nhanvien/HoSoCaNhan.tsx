import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { API_ORIGIN, employeesAPI } from '../../services/api';

type Profile = {
  MaNhanVien: number; HoTen: string; SoDienThoaiLienHe?: string | null; NgaySinh?: string | null;
  GioiTinh?: string | null; DiaChi?: string | null; AnhDaiDien?: string | null; ProfileVersion: string;
  TenDangNhap: string; EmailDangNhap?: string | null; ChucVu?: string | null;
  TrangThaiNhanVien: boolean | number; TrangThaiTaiKhoan: string; VaiTro: string;
};
type ProfileForm = { HoTen: string; SoDienThoaiLienHe: string; NgaySinh: string; GioiTinh: string; DiaChi: string };
type PasswordForm = { MatKhauHienTai: string; MatKhauMoi: string; XacNhanMatKhauMoi: string };

const emptyForm: ProfileForm = { HoTen: '', SoDienThoaiLienHe: '', NgaySinh: '', GioiTinh: '', DiaChi: '' };
const emptyPassword: PasswordForm = { MatKhauHienTai: '', MatKhauMoi: '', XacNhanMatKhauMoi: '' };
const apiError = (error: any, fallback: string) => error?.response?.data?.message || (error?.request ? 'Không thể kết nối máy chủ. Kiểm tra Backend rồi thử lại.' : fallback);
const dateInput = (value?: string | null) => value ? String(value).slice(0, 10) : '';
const fromProfile = (profile: Profile): ProfileForm => ({ HoTen: profile.HoTen || '', SoDienThoaiLienHe: profile.SoDienThoaiLienHe || '', NgaySinh: dateInput(profile.NgaySinh), GioiTinh: profile.GioiTinh || '', DiaChi: profile.DiaChi || '' });
const initials = (name?: string) => (name || '?').trim().split(/\s+/).slice(-2).map(x => x[0]).join('').toUpperCase();
const imageUrl = (url?: string | null) => !url ? '' : /^https?:\/\//i.test(url) ? url : `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;

export default function HoSoCaNhan() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<ProfileForm>(emptyForm);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [fieldName, setFieldName] = useState('');
  const [password, setPassword] = useState<PasswordForm>(emptyPassword);
  const [passwordFieldError, setPasswordFieldError] = useState('');
  const [passwordErrorField, setPasswordErrorField] = useState('');
  const [showPassword, setShowPassword] = useState<Record<keyof PasswordForm, boolean>>({ MatKhauHienTai: false, MatKhauMoi: false, XacNhanMatKhauMoi: false });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  const load = useCallback(async () => {
    setLoading(true); setError(''); setNotice('');
    try {
      const response = await employeesAPI.myProfile();
      if (!response.data?.success || !response.data?.data) throw new Error(response.data?.message || 'Máy chủ không trả hồ sơ nhân viên');
      const data = response.data.data as Profile;
      setProfile(data); setSaved(fromProfile(data)); setForm(fromProfile(data));
    } catch (e: any) { setError(apiError(e, 'Không tải được hồ sơ nhân viên')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    const guardLink = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.origin !== window.location.origin || anchor.pathname === window.location.pathname) return;
      if (!window.confirm('Bạn còn thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?')) { event.preventDefault(); event.stopPropagation(); }
    };
    document.addEventListener('click', guardLink, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guardLink, true); };
  }, [dirty]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault(); if (!profile || saving || !dirty) return;
    setSaving(true); setError(''); setNotice(''); setFieldError(''); setFieldName('');
    try {
      const response = await employeesAPI.updateMyProfile({ ...form, NgaySinh: form.NgaySinh || null, ProfileVersion: profile.ProfileVersion });
      const data = response.data?.data as Profile;
      setProfile(data); setSaved(fromProfile(data)); setForm(fromProfile(data));
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...user, HoTen: data.HoTen, AnhDaiDien: data.AnhDaiDien || null }));
      window.dispatchEvent(new Event('beautystore:user-updated'));
      setNotice('Đã lưu thông tin hồ sơ.');
    } catch (e: any) {
      setError(apiError(e, 'Không lưu được hồ sơ'));
      if (e?.response?.status === 409) setFieldError('Tải phiên bản mới nhất để đối chiếu; nội dung bạn nhập vẫn được giữ.');
      else { setFieldName(e?.response?.data?.field || ''); setFieldError(e?.response?.data?.message || ''); }
    } finally { setSaving(false); }
  };

  const cancelChanges = () => { setForm(saved); setError(''); setFieldError(''); setFieldName(''); setNotice('Đã khôi phục thông tin đã lưu gần nhất.'); };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Ảnh đại diện tối đa 5 MB.'); return; }
    if (file.type && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Chỉ nhận ảnh JPEG, PNG hoặc WEBP.'); return; }
    const data = new FormData(); data.append('image', file);
    const preview = URL.createObjectURL(file); setAvatarPreview(preview);
    setUploading(true); setError(''); setNotice('');
    try {
      const response = await employeesAPI.uploadMyAvatar(data);
      const avatar = response.data?.data?.AnhDaiDien;
      if (!avatar) throw new Error('Máy chủ chưa trả đường dẫn ảnh đã lưu');
      setProfile(current => current ? { ...current, AnhDaiDien: avatar, ProfileVersion: response.data?.data?.ProfileVersion || current.ProfileVersion } : current);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...user, AnhDaiDien: avatar }));
      window.dispatchEvent(new Event('beautystore:user-updated'));
      setNotice('Đã cập nhật ảnh đại diện.');
    } catch (e: any) { setError(apiError(e, 'Không tải được ảnh đại diện')); }
    finally { URL.revokeObjectURL(preview); setAvatarPreview(''); setUploading(false); }
  };

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault(); if (passwordSaving) return;
    setError(''); setNotice(''); setPasswordFieldError(''); setPasswordErrorField('');
    if (password.MatKhauMoi.length < 8 || password.MatKhauMoi.length > 72) { setError('Mật khẩu mới phải dài từ 8 đến 72 ký tự.'); return; }
    if (password.MatKhauMoi !== password.XacNhanMatKhauMoi) { setError('Mật khẩu mới và xác nhận không khớp.'); return; }
    setPasswordSaving(true);
    try {
      const response = await employeesAPI.changeMyPassword(password);
      setPassword(emptyPassword); setNotice(response.data?.message || 'Đổi mật khẩu thành công.');
    } catch (e: any) { setError(apiError(e, 'Không đổi được mật khẩu')); setPasswordFieldError(e?.response?.data?.message || ''); setPasswordErrorField(e?.response?.data?.field || ''); }
    finally { setPasswordSaving(false); }
  };

  if (loading) return <main className="p-5 md:p-7"><div className="mx-auto max-w-7xl animate-pulse space-y-4"><div className="h-10 w-64 rounded bg-slate-200"/><div className="grid gap-5 lg:grid-cols-[350px_1fr]"><div className="h-[420px] rounded-2xl bg-slate-100"/><div className="h-[420px] rounded-2xl bg-slate-100"/></div></div></main>;
  if (!profile) return <main className="p-5 md:p-7"><div className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"><p>{error || 'Không có dữ liệu hồ sơ nhân viên.'}</p><button onClick={() => void load()} className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold">Thử lại</button></div></main>;

  const jobStatus = profile.TrangThaiNhanVien ? 'Đang hoạt động' : 'Ngừng hoạt động';
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-7">
    <div className="mx-auto max-w-7xl space-y-5">
      <header><div className="mb-2 text-xs text-slate-500">Nhân viên　/　<span className="font-semibold text-slate-800">Hồ sơ cá nhân</span></div><h1 className="text-3xl font-extrabold tracking-tight">Hồ sơ cá nhân</h1><p className="mt-1 text-slate-500">Quản lý thông tin cá nhân và bảo mật tài khoản</p></header>
      {(error || notice) && <div role="status" className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><span>{error || notice}</span>{fieldError && <span>{fieldError}</span>}{error && <button onClick={() => { if (!dirty || window.confirm('Tải lại hồ sơ sẽ bỏ các nội dung bạn đang sửa. Bạn muốn tiếp tục?')) void load(); }} className="font-semibold underline">{dirty ? 'Tải lại (bỏ thay đổi)' : 'Thử lại'}</button>}</div>}
      <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <div className="relative mx-auto mb-4 h-36 w-36 overflow-hidden rounded-full bg-[#10213d] text-5xl font-semibold text-white ring-4 ring-slate-100">{(avatarPreview || profile.AnhDaiDien) && <img className="absolute inset-0 h-full w-full object-cover" src={avatarPreview || imageUrl(profile.AnhDaiDien)} alt="Ảnh đại diện" onError={e => { e.currentTarget.remove(); }}/>}<span className="grid h-full w-full place-items-center">{initials(profile.HoTen)}</span></div>
            <h2 className="text-2xl font-bold">{profile.HoTen || 'Chưa cập nhật'}</h2><p className="mt-1 text-slate-500">NV{String(profile.MaNhanVien).padStart(4, '0')}</p>
            <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${profile.TrangThaiNhanVien ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>● {jobStatus}</span>
            <p className="mt-3 text-slate-600">{profile.ChucVu || 'Chưa cập nhật chức vụ'}</p>
            <input ref={fileInput} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar}/>
            <button disabled={uploading} onClick={() => fileInput.current?.click()} className="mt-5 w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold hover:bg-slate-50 disabled:opacity-60">{uploading ? 'Đang tải ảnh…' : '📷  Thay ảnh đại diện'}</button>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-5 text-xl font-bold">▣　Thông tin công tác</h2><dl className="space-y-4 text-sm">{[['Mã nhân viên',`NV${String(profile.MaNhanVien).padStart(4,'0')}`],['Vai trò',profile.VaiTro === 'NhanVien' ? 'Nhân viên' : profile.VaiTro],['Chức vụ',profile.ChucVu || 'Chưa cập nhật'],['Ngày vào làm','Chưa cập nhật']].map(([label,value])=><div key={label} className="grid grid-cols-2 gap-3"><dt className="text-slate-500">{label}:</dt><dd className="font-semibold">{value}</dd></div>)}</dl><p className="mt-5 border-t pt-4 text-xs text-slate-500">🔒 Mã nhân viên, vai trò, trạng thái, chức vụ và ngày vào làm do Admin quản lý.</p></section>
        </div>
        <div className="space-y-5">
          <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><h2 className="text-xl font-bold">♙　Thông tin cá nhân</h2><p className="mt-1 text-sm text-slate-500">Cập nhật thông tin liên hệ của bạn</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">Họ và tên <b className="text-red-500">*</b><input maxLength={100} required value={form.HoTen} onChange={e=>setForm(f=>({...f,HoTen:e.target.value}))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"/>{fieldName==='HoTen'&&<small className="mt-1 block text-red-600">{fieldError}</small>}</label>
              <label className="text-sm font-medium">Số điện thoại liên hệ<input maxLength={20} value={form.SoDienThoaiLienHe} onChange={e=>setForm(f=>({...f,SoDienThoaiLienHe:e.target.value}))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"/>{fieldName==='SoDienThoaiLienHe'&&<small className="mt-1 block text-red-600">{fieldError}</small>}</label>
              <label className="text-sm font-medium">Email đăng nhập<input value={profile.EmailDangNhap || 'Chưa cập nhật'} readOnly className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-500"/><small className="mt-1 block text-slate-400">Email định danh chỉ đọc; chưa có quy trình xác minh thay đổi.</small></label>
              <label className="text-sm font-medium">Ngày sinh<input type="date" max={new Date().toISOString().slice(0,10)} value={form.NgaySinh} onChange={e=>setForm(f=>({...f,NgaySinh:e.target.value}))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500"/>{fieldName==='NgaySinh'&&<small className="mt-1 block text-red-600">{fieldError}</small>}</label>
              <label className="text-sm font-medium">Giới tính<select value={form.GioiTinh} onChange={e=>setForm(f=>({...f,GioiTinh:e.target.value}))} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">Chưa cập nhật</option><option>Nam</option><option>Nữ</option><option>Khác</option></select>{fieldName==='GioiTinh'&&<small className="mt-1 block text-red-600">{fieldError}</small>}</label>
              <label className="text-sm font-medium">Địa chỉ liên hệ<input maxLength={500} value={form.DiaChi} onChange={e=>setForm(f=>({...f,DiaChi:e.target.value}))} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-amber-500"/>{fieldName==='DiaChi'&&<small className="mt-1 block text-red-600">{fieldError}</small>}</label>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">Ngày sinh, giới tính và địa chỉ là tùy chọn.</span><div className="flex gap-3"><button type="button" disabled={!dirty || saving} onClick={cancelChanges} className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold disabled:opacity-50">Hủy thay đổi</button><button disabled={!dirty || saving} className="rounded-lg bg-amber-400 px-5 py-2.5 font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu thông tin'}</button></div></div>
          </form>
          <form onSubmit={updatePassword} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><h2 className="text-xl font-bold">⬟　Bảo mật tài khoản</h2><div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]"><div className="space-y-4">{([['MatKhauHienTai','Mật khẩu hiện tại'],['MatKhauMoi','Mật khẩu mới'],['XacNhanMatKhauMoi','Xác nhận mật khẩu mới']] as const).map(([key,label])=><label key={key} className="block text-sm font-medium">{label} <b className="text-red-500">*</b><span className="mt-1.5 flex rounded-lg border border-slate-300 focus-within:border-amber-500"><input required type={showPassword[key]?'text':'password'} autoComplete="new-password" value={password[key]} onChange={e=>setPassword(p=>({...p,[key]:e.target.value}))} className="min-w-0 flex-1 rounded-lg px-3 py-2.5 outline-none"/><button type="button" aria-label={showPassword[key]?'Ẩn mật khẩu':'Hiện mật khẩu'} onClick={()=>setShowPassword(p=>({...p,[key]:!p[key]}))} className="px-3 text-slate-500">◉</button></span>{passwordErrorField===key&&<small className="mt-1 block text-red-600">{passwordFieldError}</small>}</label>)}<button disabled={passwordSaving || !password.MatKhauHienTai || !password.MatKhauMoi || !password.XacNhanMatKhauMoi} className="rounded-lg border border-amber-500 px-5 py-2.5 font-semibold text-amber-700 disabled:opacity-50">{passwordSaving?'Đang đổi…':'Đổi mật khẩu'}</button></div><aside className="rounded-xl bg-blue-50 p-5 text-blue-900"><h3 className="font-bold">🔒 Lưu ý bảo mật</h3><p className="mt-3 text-sm leading-6">Không chia sẻ mật khẩu. Mật khẩu mới tối thiểu 8 ký tự. Phiên đăng nhập hiện tại còn hiệu lực đến khi JWT hết hạn.</p></aside></div></form>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">ℹ Bạn chỉ được chỉnh sửa hồ sơ của chính mình.</div>
        </div>
      </div>
    </div>
  </main>;
}
