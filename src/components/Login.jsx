// ============================================================================
// DyHuFu Petrol — Login Component
// ============================================================================
// Autenticación de operadores usando Supabase (Email y Contraseña).
// No se permite el registro desde esta pantalla.
// ============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Por favor, ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Customize error messages for better UX
        if (authError.message === "Invalid login credentials") {
          setError("Credenciales incorrectas. Verifica tu correo y contraseña.");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      // If successful, navigate to dashboard
      if (data?.session) {
        navigate("/");
      }
    } catch (err) {
      setError("Error de conexión. Por favor, intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* ── Logo & Header ── */}
        <div className="flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-petrol-500 to-petrol-700 text-white shadow-xl shadow-petrol-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8"
            >
              <path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17" />
              <path d="M15 10h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2v0a1 1 0 0 0 1-1V8l-3-3" />
              <path d="M3 22h12" />
              <path d="M7 8h4" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-surface-50">
            DyHuFu Petrol
          </h2>
          <p className="mt-2 text-center text-sm text-surface-400">
            Sistema de Control de Carburantes
          </p>
        </div>

        {/* ── Login Card ── */}
        <div className="bg-surface-800/60 backdrop-blur-sm border border-surface-700/50 rounded-3xl p-8 shadow-2xl">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {/* ── Error Alert ── */}
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-danger-500/30 bg-danger-500/10 p-4 animate-fade-in">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="h-5 w-5 flex-shrink-0 text-danger-500"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm font-medium text-danger-500">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2"
                >
                  Correo Electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
                    block w-full rounded-xl border border-surface-600/50 bg-surface-900/80
                    px-4 py-3.5 text-surface-100 placeholder:text-surface-600
                    focus:border-petrol-500/60 focus:outline-none focus:ring-2 focus:ring-petrol-500/50
                    transition-all duration-200
                  "
                  placeholder="operador@dyhufu.com"
                />
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="
                    block w-full rounded-xl border border-surface-600/50 bg-surface-900/80
                    px-4 py-3.5 text-surface-100 placeholder:text-surface-600
                    focus:border-petrol-500/60 focus:outline-none focus:ring-2 focus:ring-petrol-500/50
                    transition-all duration-200
                  "
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`
                flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5
                text-base font-semibold text-white transition-all duration-200
                ${
                  loading
                    ? "cursor-not-allowed bg-surface-700 text-surface-500"
                    : "bg-gradient-to-r from-petrol-600 to-petrol-500 shadow-lg shadow-petrol-500/20 hover:shadow-petrol-500/40 active:scale-[0.98]"
                }
              `}
            >
              {loading ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
             <p className="text-xs text-surface-500">
               Solo personal autorizado. Contacta al administrador si no tienes acceso.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
