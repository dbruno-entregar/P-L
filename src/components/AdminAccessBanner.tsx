import React, { useState } from 'react';
import { getSupabaseClient } from '../services/supabaseService';
import { CheckCircle2, AlertCircle, LogIn, LogOut } from 'lucide-react';

interface AdminAccessBannerProps {
  onShowToast: (msg: string) => void;
}

export const AdminAccessBanner: React.FC<AdminAccessBannerProps> = ({ onShowToast }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userSession, setUserSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      onShowToast('Ingresá correo y contraseña');
      return;
    }

    setLoading(true);
    try {
      const client = getSupabaseClient();
      if (!client) {
        // Fallback local admin
        setUserSession(email);
        onShowToast('Sesión de administrador local iniciada.');
        setLoading(false);
        return;
      }

      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        onShowToast(`Aviso: ${error.message}. (Operando en modo admin local)`);
        setUserSession(email);
      } else {
        setUserSession(data.user?.email || email);
        onShowToast('Sesión de administrador iniciada correctamente en Supabase.');
      }
    } catch (err: any) {
      setUserSession(email);
      onShowToast(`Acceso local activado (${err.message || 'Sin conexión cloud'})`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const client = getSupabaseClient();
      if (client) {
        await client.auth.signOut();
      }
    } catch (e) {
      // ignore
    }
    setUserSession(null);
    onShowToast('Sesión de administrador cerrada.');
  };

  return (
    <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 mb-6 border border-[#E5E7EB] bg-white rounded-xl text-[#1A1A1A] shadow-sm">
      <div className="flex flex-col gap-0.5">
        <p className="mono text-[10px] text-[#2563EB] font-bold tracking-[0.09em] uppercase">
          ADMINISTRACIÓN DE FLOTA
        </p>
        <strong className="text-[13px] font-semibold text-[#1A1A1A] flex items-center gap-1.5">
          {userSession ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              Sesión activa: {userSession} (Permiso para publicar y editar)
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-[#EF4444]" />
              Iniciá sesión o administrá localmente para actualizar datos de flota.
            </>
          )}
        </strong>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {userSession ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#FEE2E2] text-[#EF4444] text-[12px] font-semibold rounded-lg border border-[#FCA5A5] transition-colors cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir de la sesión
          </button>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              placeholder="Correo administrador"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="px-3 py-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg text-[12px] text-[#1A1A1A] focus:outline-none focus:border-[#2563EB] focus:bg-white w-48"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="px-3 py-1.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg text-[12px] text-[#1A1A1A] focus:outline-none focus:border-[#2563EB] focus:bg-white w-36"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};
