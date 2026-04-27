const Service = require('../models/Service.model');
const User    = require('../models/User.model');

// POST /api/services  — cliente crea solicitud
exports.createService = async (req, res) => {
  try {
    const { category, description, lat, lng, address, scheduledAt } = req.body;

    const service = await Service.create({
      client:      req.user._id,
      category,
      description,
      location: {
        type:        'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
        address:     address || '',
      },
      scheduledAt: scheduledAt || null,
    });

    res.status(201).json({ service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/services/my  — servicios del usuario autenticado
exports.myServices = async (req, res) => {
  try {
    const field = req.user.role === 'cliente' ? 'client' : 'technician';
    const services = await Service.find({ [field]: req.user._id })
      .populate('client',     'name email phone avatar')
      .populate('technician', 'name email phone avatar specialty rating plan')
      .sort({ createdAt: -1 });

    res.json({ results: services.length, services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/services/pending  — técnico ve solicitudes pendientes cercanas
exports.pendingServices = async (req, res) => {
  try {
    const services = await Service.find({ status: 'pending' })
      .populate('client', 'name phone avatar')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ results: services.length, services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/services/:id/accept  — técnico acepta
exports.acceptService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado.' });
    if (service.status !== 'pending')
      return res.status(400).json({ error: 'El servicio ya fue tomado o cancelado.' });

    service.technician = req.user._id;
    service.status     = 'accepted';
    service.acceptedAt = new Date();
    await service.save();

    res.json({ service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/services/:id/status  — cambiar status (in_progress, completed, cancelled)
exports.updateStatus = async (req, res) => {
  try {
    const { status, price } = req.body;
    const allowed = ['in_progress', 'completed', 'cancelled'];
    if (!allowed.includes(status))
      return res.status(400).json({ error: 'Status inválido.' });

    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado.' });

    // Solo el técnico asignado o el cliente pueden cambiar el status
    const isOwner = String(service.client)     === String(req.user._id);
    const isTech  = String(service.technician) === String(req.user._id);
    if (!isOwner && !isTech)
      return res.status(403).json({ error: 'Sin permiso.' });

    service.status = status;
    if (status === 'completed') { service.completedAt = new Date(); if (price) service.price = price; }
    await service.save();

    res.json({ service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
