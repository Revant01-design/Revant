import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const session_id = match?.[1];
    if (!session_id) { navigate("/"); return; }

    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id });
        setUser(data.user);
        window.history.replaceState({}, "", "/dashboard");
        navigate("/dashboard", { replace: true, state: { user: data.user } });
      } catch (e) {
        console.error(e);
        navigate("/", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center" data-testid="auth-callback-loading">
        <div className="w-12 h-12 border-2 border-[#0A1A2F] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-[#0A1A2F] font-medium">Iniciando sesión…</p>
      </div>
    </div>
  );
}
