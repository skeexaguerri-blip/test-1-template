// ============================================================
// W&K CREATION — Backend API (Node.js + Express)
// Serveur REST pour le dashboard marchand SaaS
// ============================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware globaux ──────────────────────────────────────
app.use(cors({
  origin: [
    'https://app.wkcreation.ci',
    'http://localhost:3000'                          // Dev local autorisé
  ]
}));
app.use(express.json());                             // Parse le body JSON des requêtes

// ── Clients Supabase ────────────────────────────────────────
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);


// ============================================================
// MIDDLEWARE : Vérification du token JWT Supabase
// ============================================================
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Session expirée, reconnectez-vous' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Erreur validation token' });
  }
}


// ============================================================
// ROUTE : POST /api/auth/register
// Inscription d'un nouveau marchand
// ============================================================
app.post('/api/auth/register', async (req, res) => {
  const {
    full_name, email, password, phone,
    shop_name, shop_city, shop_quarter,
    plan = 'starter'
  } = req.body;
  
  const PLAN_PRICES = {
    starter:  15000,
    pro:      25000,
    business: 45000
  };
  
  if (!PLAN_PRICES[plan]) {
    return res.status(400).json({ error: 'Plan invalide' });
  }
  
  try {
    // Générer un slug unique
    let slug = shop_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Vérifier si le slug existe déjà
    const { data: existing } = await supabaseAdmin
      .from('merchants')
      .select('shop_slug')
      .eq('shop_slug', slug)
      .single();
    
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    
    // Créer le compte Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, shop_name }
      }
    });
    
    if (authError) {
      throw new Error(`Erreur création compte : ${authError.message}`);
    }
    
    const merchantId = authData.user.id;
    
    // Créer le profil marchand (INACTIF par défaut)
    const { error: dbError } = await supabaseAdmin
      .from('merchants')
      .insert({
        id: merchantId,
        full_name,
        email,
        phone,
        shop_name,
        shop_slug: slug,
        shop_city,
        shop_quarter,
        plan,
        plan_price_fcfa: PLAN_PRICES[plan],
        is_active: false
      });
    
    if (dbError) throw new Error(dbError.message);
    
    res.status(201).json({
      success: true,
      message: 'Compte créé ! Complétez le paiement pour activer votre boutique.',
      merchant_id: merchantId,
      shop_slug: slug,
      payment_url: 'https://fedapay.com/pay',  // Lien exemple
      plan,
      amount_fcfa: PLAN_PRICES[plan]
    });
    
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: error.message });
  }
});


// ============================================================
// ROUTE : GET /api/dashboard/stats
// Statistiques du dashboard
// ============================================================
app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
  try {
    res.json({
      period: 'today',
      revenue_fcfa: 0,
      orders_count: 0,
      new_customers: 0,
      low_stock_products: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ============================================================
// ROUTE : GET /api/products
// Liste des produits du marchand
// ============================================================
app.get('/api/products', requireAuth, async (req, res) => {
  try {
    res.json({
      products: [],
      total: 0,
      page: 1,
      total_pages: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ============================================================
// Health check
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});


// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
