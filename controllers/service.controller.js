const Service      = require('../models/Service.model');
const User         = require('../models/User.model');
const { createNotification } = require('./notification.controller');

// POST /api/services
exports.createService = async (req, res) => {
  try {
    const { category, description, lat, lng, address, scheduledAt } = req.body;

    const location = (lat && lng) ? {
      type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)], address: address || '',
    } : { address: address || '' };

    const service = await Service.create({
      client: req.user._id, category, description, location,
      scheduledAt: scheduledAt || null,
    });

    // Notificar técnicos activos (gold → silver → free)
    const technicians = await User.find({ role: 'tecnico', isActive: true }).select('_id plan');
    const priority = { gold: 3, silver: 2, free: 1 };
    technicians.sort((a, b) => (priority[b.plan] || 0) - (priority[a.plan] || 0));

    await Promise.all(technicians.map(t => createNotification({
      user: t._id, service: service._id, type: 'service_requested',
      title: '🔔 Nueva solicitud de servicio',
      body: `${req.user.name} necesita: ${category} — ${description.slice(0, 60)}`,
    })));

    const populated = await service.populate('client', 'name phone');
    res.status(201).json({ service: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/services/my — historial paginado
exports.myServices = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const field  = req.user.role === 'cliente' ? 'client' : 'technician';
    const filter = { [field]: req.user._id };
    if (status) filter.status = status;

    const total    = await Service.countDocuments(filter);
    const services = await Service.find(filter)
      .populate('client',     'name email phone avatar')
      .populate('technician', 'name email phone avatar specialty rating plan')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({ results: services.length, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/services/pending
exports.pendingServices = async (req, res) => {
  try {
    const services = await Service.find({ status: 'pending' })
      .populate('client', 'name phone avatar')
      .sort({ createdAt: -1 }).limit(30);
    res.json({ results: services.length, services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/services/:id — detalle con ubicaciones
exports.getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('client',     'name email phone avatar')
      .populate('technician', 'name email phone avatar specialty rating plan');
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado.' });

    const isOwner = String(service.client._id)     === String(req.user._id);
    const isTech  = service.technician && String(service.technician._id) === String(req.user._id);
    if (!isOwner && !isTech) return res.status(403).json({ error: 'Sin permiso.' });

    res.json({ service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/services/:id/accept
exports.acceptService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate('client', 'name _id');
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado.' });
    if (service.status !== 'pending')
      return res.status(400).json({ error: 'El servicio ya fue tomado o cancelado.' });

    service.technician = req.user._id;
    service.status     = 'accepted';
    service.acceptedAt = new Date();
    await service.save();

    await createNotification({
      user: service.client._id, service: service._id, type: 'service_accepted',
      title: '✅ Técnico en camino',
      body:  `${req.user.name} aceptó tu solicitud y está en camino.`,
    });

    res.json({ service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/services/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status, price } = req.body;
    if (!['in_progress','completed','cancelled'].includes(status))
      return res.status(400).json({ error: 'Status inválido.' });

    const service = await Service.findById(req.params.id)
      .populate('client',     'name _id')
      .populate('technician', 'name _id');
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado.' });

    const isOwner = String(service.client._id)      === String(req.user._id);
    const isTech  = String(service.technician?._id) === String(req.user._id);
    if (!isOwner && !isTech) return res.status(403).json({ error: 'Sin permiso.' });

    service.status = status;
    if (status === 'completed') { service.completedAt = new Date(); if (price) service.price = price; }
    await service.save();

    const notifs = {
      in_progress: { user: service.client._id,      type: 'service_in_progress', title: '🔧 Trabajo en progreso', body: `${service.technician?.name} ha comenzado el trabajo.` },
      completed:   { user: service.client._id,      type: 'service_completed',   title: '🎉 Trabajo completado',  body: `${service.technician?.name} completó el trabajo. ¡Califica el servicio!` },
      cancelled:   { user: isOwner ? service.technician?._id : service.client._id, type: 'service_cancelled', title: '❌ Servicio cancelado', body: `El servicio de ${service.category} fue cancelado.` },
    };

    if (notifs[status]?.user) {
      await createNotification({ ...notifs[status], service: service._id });
    }

    res.json({ service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/services/:id/tech-location — técnico comparte GPS en tiempo real
exports.updateTechLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'lat y lng requeridos.' });

    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado.' });
    if (String(service.technician) !== String(req.user._id))
      return res.status(403).json({ error: 'Solo el técnico asignado puede actualizar ubicación.' });

    service.techLocation = {
      type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)], updatedAt: new Date(),
    };
    await service.save();

    res.json({ ok: true, techLocation: service.techLocation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
