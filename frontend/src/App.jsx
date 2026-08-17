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
          {/* Future: /admin/students, /admin/keys, /admin/colleges */}
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}