import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import RentRoll from "./pages/RentRoll";
import Contracts from "./pages/Contracts";
import Properties from "./pages/Properties";
import ProtectedRoute from "./components/ProtectedRoute";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Login />;
}

function AppRouter() {
  const location = useLocation();
  // CRITICAL: handle session_id BEFORE protected routes
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rent-roll" element={<RentRoll />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/properties" element={<Properties />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
