// ============================================================
// W&K CREATION — Frontend (React + Tailwind CSS)
// Application principale du dashboard marchand
// Fichier : App.jsx (point d'entrée)
// ============================================================

import { useState, useEffect, createContext, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';

// ── Initialisation du client Supabase (côté frontend) ───────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Contexte global : session marchand ──────────────────────
const AuthContext = createContext(null);

// ── Hook personnalisé pour utiliser le contexte auth ────────
export function useAuth() {
  return useContext(AuthContext);
}

// ── Constantes de l'application ─────────────────────────────
const PLANS = {
  starter:  { label: 'Starter',  price: 15000, color: '#888' },
  pro:      { label: 'Pro',      price: 25000, color: '#FF6B35' },
  business: { label: 'Business', price: 45000, color: '#0F9B58' }
};

// Formater un montant en FCFA (ex: 127500 → "127 500 FCFA")
const fcfa = (amount) =>
  `${amount.toLocaleString('fr-FR')} FCFA`;


// ============================================================
// COMPOSANT : AuthProvider
// Gère la session utilisateur dans toute l'app
// ============================================================
function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Récupérer la session existante au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchMerchant(session.user.id);
      else setLoading(false);
    });
    
    // Écouter les changements de session (connexion/déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session) await fetchMerchant(session.user.id);
        else { setMerchant(null); setLoading(false); }
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  // Charger le profil marchand depuis Supabase
  async function fetchMerchant(userId) {
    const { data } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', userId)
      .single();
    
    setMerchant(data);
    setLoading(false);
  }
  
  // Déconnexion
  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setMerchant(null);
  }
  
  return (
    <AuthContext.Provider value={{ session, merchant, loading, logout, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}


// ============================================================
// COMPOSANT : LoginPage
// Page de connexion — simple et directe
// ============================================================
function LoginPage({ onRegister }) {
  const { supabase } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError('Email ou mot de passe incorrect');
    }
    setLoading(false);
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Syne, sans-serif' }}>
            W&K Creation
          </h1>
          <p className="text-sm text-gray-500 mt-1">Accédez à votre boutique</p>
        </div>
        
        {/* Formulaire */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@boutique.ci"
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-700">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              required
            />
          </div>
          
          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        
        <p className="text-center text-sm text-gray-500 mt-6">
          Pas encore de boutique ?{' '}
          <button onClick={onRegister} className="text-orange-500 font-medium hover:underline">
            Créer ma boutique
          </button>
        </p>
      </div>
    </div>
  );
}


// ============================================================
// COMPOSANT : App principal
// ============================================================
export default function App() {
  const [view, setView] = useState('login');
  
  return (
    <AuthProvider>
      {view === 'login' && <LoginPage onRegister={() => setView('register')} />}
      {view === 'register' && <div className="text-center p-8">Inscription en cours...</div>}
    </AuthProvider>
  );
}
