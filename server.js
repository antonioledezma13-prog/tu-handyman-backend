require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const app = express();

// ── Middlewares ────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiter global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { error: 'Demasiadas peticiones, intenta más tarde.' },
}));

// ── Database ───────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => { console.error('❌ DB Error:', err); process.exit(1); });

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth.routes'));
app.use('/api/users',    require('./routes/user.routes'));
app.use('/api/services', require('./routes/service.routes'));
app.use('/api/plans',    require('./routes/plan.routes'));
app.use('/api/reviews',  require('./routes/review.routes'));

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
app.listen(PORT, () => console.log(`🚀 Tu HandyMan API corriendo en puerto ${PORT}`));
