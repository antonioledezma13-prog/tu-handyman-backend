const Notification = require('../models/Notification.model');

// Función interna para crear notificación (se llama desde otros controllers)
exports.createNotification = async ({ user, service, type, title, body }) => {
  try {
    await Notification.create({ user, service, type, title, body });
  } catch (err) {
    console.error('Error creando notificación:', err.message);
  }
};

// GET /api/notifications  — notificaciones del usuario autenticado
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate('service', 'category description status')
      .sort({ createdAt: -1 })
      .limit(50);

    const unread = await Notification.countDocuments({ user: req.user._id, read: false });

    res.json({ notifications, unread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/notifications/read-all  — marcar todas como leídas
exports.readAll = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/notifications/:id/read  — marcar una como leída
exports.readOne = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
