const jsonResponse = {
  200: {
    description: 'Thành công',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
  },
  401: { description: 'Thiếu hoặc sai token xác thực' },
  500: { description: 'Lỗi server' }
};

const protectedOperation = (summary: string, parameters: any[] = [], requestBody?: any) => ({
  summary,
  security: [{ bearerAuth: [] }],
  parameters,
  ...(requestBody ? { requestBody } : {}),
  responses: jsonResponse
});

const idParameter = (name = 'id') => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'integer' }
});

const paginationParameters = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, minimum: 1 } },
  { name: 'search', in: 'query', schema: { type: 'string' } }
];

const jsonRequestBody = {
  required: true,
  content: {
    'application/json': {
      schema: { type: 'object', additionalProperties: true }
    }
  }
};

const paths: Record<string, any> = {
  '/api/health': {
    get: { summary: 'Kiểm tra trạng thái backend', tags: ['Health'], responses: { 200: { description: 'Backend đang hoạt động' } } }
  },
  '/api/auth/login': {
    post: {
      summary: 'Đăng nhập và lấy JWT token',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object', required: ['TenDangNhap', 'MatKhau'],
              properties: {
                TenDangNhap: { type: 'string', example: 'admin' },
                MatKhau: { type: 'string', format: 'password', example: 'admin123' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Đăng nhập thành công',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } }
        },
        400: { description: 'Thiếu thông tin đăng nhập' },
        401: { description: 'Sai tài khoản hoặc mật khẩu' }
      }
    }
  },
  '/api/auth/register': {
    post: {
      summary: 'Đăng ký tài khoản',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object', required: ['TenDangNhap', 'MatKhau'],
              properties: {
                TenDangNhap: { type: 'string', example: 'nhanvien01' },
                MatKhau: { type: 'string', format: 'password', example: '123456' },
                VaiTro: { type: 'string', example: 'KhachHang' }
              }
            }
          }
        }
      },
      responses: { 201: { description: 'Đăng ký thành công' }, 400: { description: 'Dữ liệu không hợp lệ' } }
    }
  },
  '/api/dashboard/stats': { get: protectedOperation('Thống kê tổng quan', [], undefined) },
  '/api/dashboard/top-products': { get: protectedOperation('Top sản phẩm bán chạy', [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 5 } }]) },
  '/api/baocao/tong-quan': { get: protectedOperation('Báo cáo tổng quan') },
  '/api/baocao/doanh-thu': { get: protectedOperation('Báo cáo doanh thu', [{ name: 'period', in: 'query', schema: { type: 'integer', default: 30, description: 'Số ngày' } }]) },
  '/api/baocao/san-pham-ban-chay': { get: protectedOperation('Báo cáo sản phẩm bán chạy', [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }]) },
  '/api/baocao/don-hang-trang-thai': { get: protectedOperation('Báo cáo đơn hàng theo trạng thái') },
  '/api/baocao/doanh-thu-danh-muc': { get: protectedOperation('Báo cáo doanh thu theo danh mục') },
  '/api/baocao/khach-hang-top': { get: protectedOperation('Báo cáo khách hàng mua nhiều nhất', [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 5 } }]) },
  '/api/sanpham': {
    get: protectedOperation('Danh sách sản phẩm', paginationParameters),
    post: protectedOperation('Thêm sản phẩm', [], jsonRequestBody)
  },
  '/api/sanpham/{id}': {
    get: protectedOperation('Chi tiết sản phẩm', [idParameter()]),
    put: protectedOperation('Cập nhật sản phẩm', [idParameter()], jsonRequestBody),
    delete: protectedOperation('Xóa sản phẩm', [idParameter()])
  },
  '/api/danhmuc': {
    get: protectedOperation('Danh sách danh mục'),
    post: protectedOperation('Thêm danh mục', [], jsonRequestBody)
  },
  '/api/danhmuc/{id}': {
    get: protectedOperation('Chi tiết danh mục', [idParameter()]),
    put: protectedOperation('Cập nhật danh mục', [idParameter()], jsonRequestBody),
    delete: protectedOperation('Xóa danh mục', [idParameter()])
  },
  '/api/hoadon': {
    get: protectedOperation('Danh sách hóa đơn', paginationParameters),
    post: protectedOperation('Tạo hóa đơn', [], jsonRequestBody)
  },
  '/api/hoadon/{id}': {
    get: protectedOperation('Chi tiết hóa đơn', [idParameter()]),
    delete: protectedOperation('Xóa hóa đơn', [idParameter()])
  },
  '/api/hoadon/{id}/pdf': { get: protectedOperation('Tải hóa đơn PDF', [idParameter()]) },
  '/api/khachhang': {
    get: protectedOperation('Danh sách khách hàng', paginationParameters),
    post: protectedOperation('Thêm khách hàng', [], jsonRequestBody)
  },
  '/api/khachhang/{id}': {
    get: protectedOperation('Chi tiết khách hàng', [idParameter()]),
    put: protectedOperation('Cập nhật khách hàng', [idParameter()], jsonRequestBody),
    delete: protectedOperation('Xóa khách hàng', [idParameter()])
  },
  '/api/nhanvien': {
    get: protectedOperation('Danh sách nhân viên', paginationParameters),
    post: protectedOperation('Thêm nhân viên', [], jsonRequestBody)
  },
  '/api/nhanvien/{id}': {
    get: protectedOperation('Chi tiết nhân viên', [idParameter()]),
    put: protectedOperation('Cập nhật nhân viên', [idParameter()], jsonRequestBody),
    delete: protectedOperation('Xóa nhân viên', [idParameter()])
  },
  '/api/inventory': { get: protectedOperation('Danh sách tồn kho', [...paginationParameters, { name: 'maDanhMuc', in: 'query', schema: { type: 'integer' } }, { name: 'thuongHieu', in: 'query', schema: { type: 'string' } }, { name: 'trangThai', in: 'query', schema: { type: 'string', enum: ['con_hang', 'sap_het', 'het_hang'] } }]) },
  '/api/inventory/statistics': { get: protectedOperation('Thống kê tồn kho') },
  '/api/inventory/alerts': { get: protectedOperation('Cảnh báo tồn kho') },
  '/api/inventory/transactions': { get: protectedOperation('Lịch sử giao dịch kho', [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }]) },
  '/api/inventory/{productId}': { get: protectedOperation('Chi tiết tồn kho sản phẩm', [{ ...idParameter('productId') }]) },
  '/api/upload': {
    post: {
      summary: 'Upload ảnh sản phẩm', tags: ['Upload'], security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['image'], properties: { image: { type: 'string', format: 'binary' } } } } } },
      responses: jsonResponse
    }
  },
  '/api/upload/{filename}': { delete: protectedOperation('Xóa ảnh sản phẩm', [{ name: 'filename', in: 'path', required: true, schema: { type: 'string' } }]) }
};

const addSimpleResource = (prefix: string, label: string) => {
  paths[`${prefix}`] = {
    get: protectedOperation(`Danh sách ${label}`, paginationParameters),
    post: protectedOperation(`Thêm ${label}`, [], jsonRequestBody)
  };
  paths[`${prefix}/{id}`] = {
    get: protectedOperation(`Chi tiết ${label}`, [idParameter()]),
    put: protectedOperation(`Cập nhật ${label}`, [idParameter()], jsonRequestBody),
    delete: protectedOperation(`Xóa ${label}`, [idParameter()])
  };
};

addSimpleResource('/api/giaohang', 'giao hàng');
addSimpleResource('/api/nhacungcap', 'nhà cung cấp');
addSimpleResource('/api/phieunhap', 'phiếu nhập');
addSimpleResource('/api/phieuxuat', 'phiếu xuất');

paths['/api/khuyenmai'] = { get: protectedOperation('Danh sách khuyến mãi') };
paths['/api/khuyenmai/{id}'] = {
  put: protectedOperation('Cập nhật khuyến mãi', [idParameter()], jsonRequestBody),
  delete: protectedOperation('Xóa khuyến mãi', [idParameter()])
};
paths['/api/hoandoitra'] = {
  get: protectedOperation('Danh sách hoàn trả'),
};
paths['/api/hoandoitra/statistics'] = { get: protectedOperation('Thống kê hoàn trả') };
paths['/api/hoandoitra/{id}'] = { get: protectedOperation('Chi tiết hoàn trả', [idParameter()]) };
for (const action of ['receive', 'inspect', 'approve', 'reject', 'refund']) {
  paths[`/api/hoandoitra/{id}/${action}`] = {
    post: protectedOperation(`Hoàn trả: ${action}`, [idParameter()], jsonRequestBody)
  };
}
paths['/api/hoandoitra/{id}/order-products'] = { get: protectedOperation('Sản phẩm trong đơn hoàn trả', [idParameter()]) };
paths['/api/hoandoitra/{id}/history'] = { get: protectedOperation('Lịch sử hoàn trả', [idParameter()]) };
paths['/api/giaohang/{id}/status'] = { put: protectedOperation('Cập nhật trạng thái giao hàng', [idParameter()], jsonRequestBody) };
paths['/api/giaohang/stats/summary'] = { get: protectedOperation('Thống kê giao hàng') };
paths['/api/khuyenmai/stats'] = { get: protectedOperation('Thống kê khuyến mãi') };
paths['/api/yeuthich/{maKhachHang}'] = { get: protectedOperation('Danh sách yêu thích', [{ ...idParameter('maKhachHang') }]) };
paths['/api/yeuthich'] = { post: protectedOperation('Thêm sản phẩm yêu thích', [], jsonRequestBody) };
paths['/api/yeuthich/{maYeuThich}'] = { delete: protectedOperation('Xóa yêu thích', [{ ...idParameter('maYeuThich') }]) };
paths['/api/yeuthich/check/{maKhachHang}/{maSanPham}'] = {
  get: protectedOperation('Kiểm tra sản phẩm yêu thích', [
    { ...idParameter('maKhachHang') },
    { ...idParameter('maSanPham') }
  ])
};

const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Beauty Store Backend API',
    version: '1.0.0',
    description: 'Tài liệu API quản lý cửa hàng mỹ phẩm. Đăng nhập ở /api/auth/login, sau đó bấm Authorize và nhập Bearer token.'
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development server' }],
  tags: [
    { name: 'Auth', description: 'Đăng nhập và đăng ký' },
    { name: 'Health', description: 'Kiểm tra hệ thống' },
    { name: 'Upload', description: 'Quản lý hình ảnh' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      ApiResponse: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: { type: 'object', additionalProperties: true } } },
      LoginResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: { type: 'string' }, data: { type: 'object', properties: { token: { type: 'string' }, user: { type: 'object', additionalProperties: true } } } } }
    }
  },
  paths
};

export default swaggerDocument;
