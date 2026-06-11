import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { motion } from 'framer-motion';

const Onboarding = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          navigate('/dashboard');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen friendly-gradient flex flex-col items-center justify-center p-4">
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-soft p-8 flex flex-col gap-8 relative overflow-hidden"
      >
        {/* Decoración superior sutil */}
        <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>

        {/* Logo & Branding */}
        <div className="flex flex-col items-center gap-4 text-center mt-4">
          <div className="w-20 h-20 rounded-2xl bg-primary-container flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-4xl text-primary">ev_station</span>
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-on-background tracking-tight">StacionaT</h1>
            <p className="text-sm text-on-surface-variant">Estacionamiento inteligente.</p>
          </div>
        </div>

        {/* Authentication Core */}
        <div className="w-full flex flex-col gap-6">
          <form onSubmit={handleAuth} className="flex flex-col gap-4 w-full">
            {error && (
              <div className="bg-error-container text-on-error-container rounded-xl p-3 text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">mail</span>
                <input 
                  type="email" 
                  placeholder="Tu correo electrónico" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container text-on-surface h-12 rounded-xl pl-12 pr-4 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant/50 text-[15px]"
                  required
                />
              </div>
              
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">lock</span>
                <input 
                  type="password" 
                  placeholder="Tu contraseña" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container text-on-surface h-12 rounded-xl pl-12 pr-4 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant/50 text-[15px]"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-primary text-on-primary h-12 rounded-xl font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-md disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined">{isSignUp ? 'person_add' : 'arrow_forward'}</span>
              )}
              {isSignUp ? 'Crear mi cuenta' : 'Ingresar'}
            </button>
            
            <button 
              type="button" 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary font-medium hover:underline transition-colors text-center"
            >
              {isSignUp ? 'Ya tengo cuenta. Iniciar Sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </form>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-outline-variant"></div>
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">O usa</span>
            <div className="flex-1 h-px bg-outline-variant"></div>
          </div>
          
          <button 
            onClick={handleGoogleAuth}
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-white text-on-background h-12 rounded-xl border border-outline-variant hover:bg-surface-container active:scale-[0.98] transition-all shadow-sm font-medium text-[15px]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
            </svg>
            Continuar con Google
          </button>
        </div>

      </motion.main>
    </div>
  );
};

export default Onboarding;
