const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const User   = require('../models/User.model');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, specialty } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'El correo ya está registrado.' });

    const user = await User.create({
      name, email, password,
      role: role || 'cliente',
      phone: phone || '',
      specialty: role === 'tecnico' ? (specialty || '') : '',
    });

    const token = signToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Correo y contraseña requeridos.' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ error: 'Credenciales incorrectas.' });

    if (!user.isActive)
      return res.status(403).json({ error: 'Cuenta desactivada.' });

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ user: req.user });
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ error: 'No existe cuenta con ese correo.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken        = crypto.createHash('sha256').update(token).digest('hex');
    user.resetTokenExpires = Date.now() + 30 * 60 * 1000; // 30 min
    await user.save({ validateBeforeSave: false });

    // TODO: enviar correo con el token
    res.json({ message: 'Correo de recuperación enviado.', token }); // quitar token en producción
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/auth/reset-password/:token
exports.resetPassword = async (req, res) => {
  try {
    const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetToken: hashed,
      resetTokenExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ error: 'Token inválido o expirado.' });

    user.password          = req.body.password;
    user.resetToken        = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    const jwtToken = signToken(user._id);
    res.json({ token: jwtToken, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
