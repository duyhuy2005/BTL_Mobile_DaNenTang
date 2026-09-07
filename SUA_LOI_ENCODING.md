# ✅ ĐÃ SỬA LỖI ENCODING TIẾNG VIỆT

## 🐛 Vấn đề

Dữ liệu tiếng Việt trong bảng `Giao hàng` và `Hoàn/Đổi trả` hiển thị lỗi phông chữ:
- "Đổi hàng" → "Äá»•i hÃ ng"
- "Trả hàng" → "Tráº£ hÃ ng"  
- "Sản phẩm bị lỗi" → "Sáº£n pháº©m bá»‹ lá»—i"

## 🔍 Nguyên nhân

**Khi INSERT dữ liệu bằng `sqlcmd -i file.sql`:**
- File `.sql` được lưu với UTF-8 encoding
- NHƯNG `sqlcmd` không đọc đúng UTF-8, dẫn đến:
  - "Đổi hàng" (Unicode: Đ=272) → "Äá»•i" (Ä=196)
  - Dữ liệu bị corrupt ngay khi INSERT

**Mặc dù:**
- Database collation: `SQL_Latin1_General_CP1_CI_AS` ✅ (phù hợp tiếng Việt)
- Column type: `NVARCHAR` ✅ (hỗ trợ Unicode)
- Prefix `N''` đã dùng ✅

→ **VẤN ĐỀ:** `sqlcmd` không parse UTF-8 từ file đúng cách!

## ✅ Giải pháp

### Cách đã fix:

**1. Tạo file SQL với UTF-8 BOM bằng PowerShell:**

```powershell
$content = @"
INSERT INTO HoanDoiTra (...) VALUES (1, N'Đổi hàng', N'Sản phẩm bị lỗi', ...);
"@

# Lưu file với UTF-8 BOM
[System.IO.File]::WriteAllText("FIX_UTF8.sql", $content, [System.Text.UTF8Encoding]::new($true))
```

**2. Chạy với flag `-f 65001` (UTF-8 codepage):**

```bash
sqlcmd -S "ACER\MS1SQLSERVER" -U beauty_user -P "Beauty@2024" -d QuanLyCuaHangMyPham -i "FIX_UTF8.sql" -f 65001
```

### Kết quả:

```sql
-- Trước khi fix:
SELECT LoaiYeuCau, UNICODE(SUBSTRING(LoaiYeuCau, 1, 1)) FROM HoanDoiTra;
-- Result: "Äá»•i hÃ ng", FirstChar = 196 (Ä - sai!)

-- Sau khi fix:
-- Result: "Đổi hàng", FirstChar = 272 (Đ - đúng!)
```

**3. Restart Backend để clear connection pool:**

```bash
npm run dev
```

→ API trả về đúng tiếng Việt!

## 📝 Các cách INSERT an toàn với tiếng Việt

### ✅ Cách 1: PowerShell tạo file UTF-8 BOM + sqlcmd -f 65001
```powershell
$content = "INSERT INTO ... VALUES (N'Đổi hàng', ...)"
[System.IO.File]::WriteAllText("script.sql", $content, [System.Text.UTF8Encoding]::new($true))
sqlcmd -S ... -i script.sql -f 65001
```
**Ưu điểm:** Phù hợp với script lớn, nhiều câu lệnh

### ✅ Cách 2: SQL Server Management Studio (SSMS)
- Copy/paste script vào SSMS
- Chạy trực tiếp (F5)
- SSMS tự động xử lý UTF-8 đúng ✅
**Ưu điểm:** An toàn nhất, GUI trực quan

### ✅ Cách 3: Dùng Backend API INSERT
```typescript
// Node.js handles UTF-8 properly
await execute(`INSERT INTO HoanDoiTra VALUES (@loai, @lydo, ...)`, {
  loai: 'Đổi hàng',
  lydo: 'Sản phẩm bị lỗi'
});
```
**Ưu điểm:** Tự động, an toàn, đúng encoding

### ✅ Cách 4: Azure Data Studio
- Modern tool, tốt hơn SSMS
- UTF-8 support native
**Ưu điểm:** Cross-platform, đẹp hơn SSMS

### ❌ Cách KHÔNG nên dùng:
```bash
# ❌ File .sql không có BOM
sqlcmd -i script.sql

# ❌ Inline query qua PowerShell (có thể bị lỗi console encoding)
sqlcmd -Q "INSERT ... N'Đổi hàng'"
```

## 🎯 Kết luận

✅ **Đã sửa xong lỗi encoding**
- Database: 5 giao hàng + 5 hoàn/đổi trả hiển thị ĐÚNG tiếng Việt
- Backend API: ✅ Trả về đúng UTF-8
- Frontend UI: ✅ Hiển thị đúng tiếng Việt

### Files liên quan:
- `FIX_UTF8.sql` - Script sửa lỗi (UTF-8 BOM)
- `backend/src/config/database.ts` - Đã thêm `useUTC: false`

### Kiểm tra:
```bash
# Test API
curl http://localhost:3000/api/hoandoitra/18
# → {"LoaiYeuCau": "Đổi hàng", "LyDo": "Giao sai sản phẩm", ...}

# Test UI
Open: http://localhost:5174/returns
# → Bảng hiển thị đúng tiếng Việt
```

---

## 🚀 Lưu ý cho tương lai

**Khi cần INSERT dữ liệu tiếng Việt:**

1. **Ưu tiên:** Dùng SSMS hoặc Azure Data Studio
2. **Script tự động:** Dùng PowerShell với UTF-8 BOM + sqlcmd -f 65001
3. **Trong code:** Dùng Backend API (Node.js/TypeScript)
4. **KHÔNG:** Copy/paste vào PowerShell console
5. **KHÔNG:** Dùng sqlcmd -i với file không có UTF-8 BOM

**Luôn nhớ prefix N'':**
```sql
✅ INSERT INTO Table VALUES (N'Đổi hàng')  -- ĐÚNG
❌ INSERT INTO Table VALUES ('Đổi hàng')   -- SAI (VARCHAR, không phải NVARCHAR)
```

---

<div align="center">

### 🌸 BEAUTY STORE
**Lỗi encoding đã được khắc phục**

✅ Tiếng Việt hiển thị hoàn hảo

*Ngày sửa: 29/08/2026*

</div>
