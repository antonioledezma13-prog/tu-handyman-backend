const Service      = require('../models/Service.model');
const User         = require('../models/User.model');
const { createNotification } = require('./notification.controller');
const { notifyTechNewService } = require('../utils/whatsapp');

// ── POST /api/services ─────────────────────────────────────
exports.createService = async (req, res) => {
  try {
    const { category, description, lat, lng, address, scheduledAt, isEmergency } = req.body;

    const serviceData = {
      client:      req.user._id,
      category,
      description,
      isEmergency: !!isEmergency,
      scheduledAt: scheduledAt || null,
    };

    if (lat && lng) {
      serviceData.location = {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
        address: address || '',
      };
    } else if (address) {
      serviceData.location = { address };
    }

    const service = await Service.create(serviceData);

    const SOS_SPECIALTIES = ['electricidad','cerrajeria','plomeria','mecanica','ac_refrigeracion','gas'];
    let techQuery = { role: 'tecnico', isActive: true, isAvailable: true };

    if (isEmergency && lat && lng) {
      techQuery.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: 5000,
        },
      };
      techQuery.specialty = { $in: SOS_SPECIALTIES };
    }

    // Obtener técnicos con su callmebotApiKey para enviar WhatsApp
    const technicians = await User.find(techQuery)
      .select('_id plan specialty whatsappNumber whatsappEnabled callmebotApiKey')
      .limit(isEmergency ? 10 : 100);

    if (!isEmergency) {
      const priority = { gold: 3, silver: 2, free: 1 };
      technicians.sort((a, b) => (priority[b.plan] || 0) - (priority[a.plan] || 0));
    }

    const descPreview   = (description || '').slice(0, 80);
    const notifTitle    = isEmergency ? '🚨 EMERGENCIA — Servicio urgente' : '🔔 Nueva solicitud de servicio';
    const notifBody     = isEmergency
      ? `¡URGENTE! ${req.user.name} necesita: ${category} — ${descPreview}`
      : `${req.user.name} necesita: ${category} — ${descPreview}`;

    const targetTechs = technicians.slice(0, isEmergency ? 5 : technicians.length);

    // Notificaciones in-app + WhatsApp en paralelo
    await Promise.all([
      // Notificaciones in-app
      ...targetTechs.map(t =>
        createNotification({ user: t._id, service: service._id, type: 'service_requested', title: notifTitle, body: notifBody })
      ),
      // WhatsApp solo a los que tienen habilitado
      ...targetTechs
        .filter(t => t.whatsappEnabled && t.whatsappNumber && t.callmebotApiKey)
        .map(t => notifyTechNewService({
          tech: t,
          clientName:  req.user.name,
          category,
          description: descPreview,
          isEmergency: !!isEmergency,
          address:     address || '',
        })),
    ]);

    const populated = await service.populate('client', 'name phone');
    res.status(201).json({ service: populated });
  } catch (err) {
    console.error('createService error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/services/my ───────────────────────────────────
exports.myServices = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const field  = req.user.role === 'cliente' ? 'client' : 'technician';
    const filter = { [field]: req.user._id };
    if (status) filter.status = status;

    const total    = await Service.countDocuments(filter);
    const services = await Service.find(filter)
      .populate('client',     'name email phone avatar')
      .populate('technician', 'name email phone avatar specialty rating plan isOnline')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({ results: services.length, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/services/pending ──────────────────────────────
exports.pendingServices = async (req, res) => {
  try {
    const services = await Service.find({ status: 'pending' })
      .populate('client', 'name phone avatar')
      .sort({ isEmergency: -1, createdAt: -1 })
      .limit(30);
    res.json({ results: services.length, services });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/services/:id ──────────────────────────────────
exports.getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('client',     'name email phone avatar')
      .populate('technician', 'name email phone avatar specialty rating plan isOnline');

    if (!service) return res.status(404).json({ error: 'Servicio no encontrado.' });

    const isOwner = String(service.client._id)     === String(req.user._id);
    const isTech  = service.technician && String(service.technician._id) === String(req.user._id);
    if (!isOwner && !isTech) return res.status(403).json({ error: 'Sin permiso.' });

    res.json({ service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PATCH /api/services/:id/quote ─────────────────────────
exports.quoteService = async (req, res) => {
  try {
    const { quotedPrice, quotedNote } = req.body;
    if (!quotedPrice) return res.status(400).json({ error: 'quotedPrice requerido.' });

    const service = await Service.findById(req.params.id).populate('client', 'name _id');
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado.' });
    if (service.status !== 'pending')
      return res.status(400).json({ error: 'Solo se puede cotizar servicios pendientes.' });

    service.technician  = req.user._id;
    service.quotedPrice = parseFloat(quotedPrice);
    service.quotedNote  = quotedNote || '';
    service.quotedAt    = new Date();
    service.status      = 'quoted';
    await service.save();

    await createNotification({
      user:    service.client._id,
      service: service._id,
      type:    'service_quoted',
      title:   '💰 Cotización recibida',
      body:    req.user.name + ' cotizó tu servicio en $' + quotedPrice + '. Acepta o rechaza.',
    });

    res.json({ service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PATCH /api/services/:id/respond ───────────────────────
exports.respondQuote = async (req, res) => {
  try {
    const { decision } = req.body;
    if (!['accept','reject'].includes(decision))
      return res.status(400).json({ error: 'decision debe ser accept o reject.' });

    const service = await Service.findById(req.params.id)
      .populate('technician', 'name _id');
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado.' });
    if (String(service.client) !== String(req.user._id))
      return res.status(403).json({ error: 'Solo el cliente puede responder.' });
    if (service.status !== 'quoted')
      return res.status(400).json({ error: 'No hay cotización pendiente.' });

    if (decision === 'accept') {
      service.status          = 'accepted';
      service.price           = service.quotedPrice;
      service.priceApprovedAt = new Date();
      service.acceptedAt      = new Date();

      await createNotification({
        user:    service.technician._id,
        service: service._id,
        type:    'quote_accepted',
        title:   '✅ Cotización aceptada',
        body:    req.user.name + ' aceptó tu cotización de $' + service.quotedPrice + '. ¡Empieza el trabajo!',
      });
    } else {
      service.status = 'rejected';
      await createNotification({
        user:    service.technician._id,
        service: service._id,
        type:    'quote_rejected',
        title:   '❌ Cotización rechazada',
        body:    req.user.name + ' rechazó tu cotización de $' + service.quotedPrice + '.',
      });
    }

    await service.save();
    res.json({ service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PATCH /api/services/:id/status ────────────────────────
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
    if (status === 'completed') {
      service.completedAt = new Date();
      if (price) service.price = price;
    }
    await service.save();

    const notifMap = {
      in_progress: {
        user:  service.client._id,
        type:  'service_in_progress',
        title: '🔧 Trabajo en progreso',
        body:  (service.technician?.name || 'El técnico') + ' comenzó el trabajo.',
      },
      completed: {
        user:  service.client._id,
        type:  'service_completed',
        title: '🎉 Trabajo completado',
        body:  (service.technician?.name || 'El técnico') + ' completó el trabajo. ¡Califica el servicio!',
      },
      cancelled: {
        user:  isOwner ? service.technician?._id : service.client._id,
        type:  'service_cancelled',
        title: '❌ Servicio cancelado',
        body:  'El servicio de ' + service.category + ' fue cancelado.',
      },
    };

    if (notifMap[status]?.user) {
      await createNotification({ ...notifMap[status], service: service._id });
    }

    res.json({ service });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PATCH /api/services/:id/tech-location ─────────────────
exports.updateTechLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'lat y lng requeridos.' });

    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado.' });
    if (String(service.technician) !== String(req.user._id))
      return res.status(403).json({ error: 'Solo el técnico asignado.' });

    service.techLocation = {
      type:        'Point',
      coordinates: [parseFloat(lng), parseFloat(lat)],
      updatedAt:   new Date(),
    };
    await service.save();

    res.json({ ok: true, techLocation: service.techLocation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
