import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Categories from './pages/Categories';
import CreateInvoice from './pages/CreateInvoice';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries';
import DeliveryDetail from './pages/DeliveryDetail';
import InvoiceDetail from './pages/InvoiceDetail';
import Invoices from './pages/Invoices';
import Login from './pages/Login';
import Products from './pages/Products';
import ReturnDetail from './pages/ReturnDetail';
import Returns from './pages/Returns';
import Staff from './pages/Staff';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
        <Route path="/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
        <Route path="/invoices" element={<PrivateRoute><Invoices /></PrivateRoute>} />
        <Route path="/invoices/:id" element={<PrivateRoute><InvoiceDetail /></PrivateRoute>} />
        <Route path="/invoices/create" element={<PrivateRoute><CreateInvoice /></PrivateRoute>} />
        <Route path="/deliveries" element={<PrivateRoute><Deliveries /></PrivateRoute>} />
        <Route path="/deliveries/:id" element={<PrivateRoute><DeliveryDetail /></PrivateRoute>} />
        <Route path="/returns" element={<PrivateRoute><Returns /></PrivateRoute>} />
        <Route path="/returns/:id" element={<PrivateRoute><ReturnDetail /></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
        <Route path="/staff" element={<PrivateRoute><Staff /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
