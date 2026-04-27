const jwt  = require('jsonwebtoken');
const User = require('../models/User.model');

// Verifica el JWT en el header Authorization: Bearer <token>
exports.protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
      return res.status(401).json({ error: 'No autenticado. Proporciona un token.' });

    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive)
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo.' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

// Restringe a roles específicos: restrictTo('tecnico')
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
  next();
};
