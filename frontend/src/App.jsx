import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MyLearning from "./pages/MyLearning.jsx";
import Modules from "./pages/Modules.jsx";
import ModuleDetail from "./pages/ModuleDetail.jsx";
import ActivateProduct from "./pages/ActivateProduct.jsx";
import Progress from "./pages/Progress.jsx";
import Profile from "./pages/Profile.jsx";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard.jsx";
import SuperAdminColleges from "./pages/admin/SuperAdminColleges.jsx";
import SuperAdminAdmins from "./pages/admin/SuperAdminAdmins.jsx";
import SuperAdminUsers from "./pages/admin/SuperAdminUsers.jsx";
import SuperAdminProducts from "./pages/admin/SuperAdminProducts.jsx";
import SuperAdminProductKeys from "./pages/admin/SuperAdminProductKeys.jsx";
import SuperAdminLicenses from "./pages/admin/SuperAdminLicenses.jsx";
import SuperAdminAuditLogs from "./pages/admin/SuperAdminAuditLogs.jsx";
import SuperAdminSettings from "./pages/admin/SuperAdminSettings.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-learning" element={<MyLearning />} />
          <Route path="/modules" element={<Modules />} />
          <Route path="/modules/:productId" element={<ModuleDetail />} />
          <Route path="/activate" element={<ActivateProduct />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/profile" element={<Profile />} />

          {/* Super Admin only — enforced by allowedRoles here AND by
              requireSuperAdmin() on every backend route these pages call.
              This nesting is a UX convenience, not the security boundary. */}
          <Route element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]} />}>
            <Route path="/admin" element={<SuperAdminDashboard />} />
            <Route path="/admin/colleges" element={<SuperAdminColleges />} />
            <Route path="/admin/admins" element={<SuperAdminAdmins />} />
            <Route path="/admin/all-users" element={<SuperAdminUsers />} />
            <Route path="/admin/products" element={<SuperAdminProducts />} />
            <Route path="/admin/product-keys" element={<SuperAdminProductKeys />} />
            <Route path="/admin/licenses" element={<SuperAdminLicenses />} />
            <Route path="/admin/audit-logs" element={<SuperAdminAuditLogs />} />
            <Route path="/admin/settings" element={<SuperAdminSettings />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}