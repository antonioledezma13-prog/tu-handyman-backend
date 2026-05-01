require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// ── CORS ───────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS bloqueado para: ' + origin));
  },
  credentials: true,
}));

// ── Middlewares ────────────────────────────────────────────
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiters diferenciados ────────────────────────────

// Auth — estricto para prevenir fuerza bruta
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos, espera 15 minutos.' },
  skipSuccessfulRequests: true,
});

// Polling (notificaciones, GPS, servicios) — muy permisivo
const pollLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: { error: 'Demasiadas peticiones por minuto.' },
});

// API general — sin límite para usuarios autenticados
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas peticiones, intenta en un momento.' },
  skip: (req) => !!req.headers.authorization,
});

// Aplicar limiters antes de las rutas
app.use('/api/auth',          authLimiter);
app.use('/api/notifications', pollLimiter);
app.use('/api/services',      pollLimiter);
app.use('/api',               apiLimiter);

// ── Database ───────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => { console.error('❌ DB Error:', err); process.exit(1); });

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/users',         require('./routes/user.routes'));
app.use('/api/services',      require('./routes/service.routes'));
app.use('/api/plans',         require('./routes/plan.routes'));
app.use('/api/reviews',       require('./routes/review.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Tu HandyMan API' }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Error handler global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

// ── Start ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('🚀 Tu HandyMan API corriendo en puerto ' + PORT));
