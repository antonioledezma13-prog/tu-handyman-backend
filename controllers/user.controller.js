const User = require('../models/User.model');

// GET /api/users/technicians
exports.getTechnicians = async (req, res) => {
  try {
    const { specialty, lat, lng, maxDistance = 20000, search } = req.query;
    const filter = { role: 'tecnico', isActive: true };
    if (specialty) filter.specialty = { $regex: specialty, $options: 'i' };
    if (search) filter.$or = [
      { name:      { $regex: search, $options: 'i' } },
      { specialty: { $regex: search, $options: 'i' } },
    ];

    let query;
    if (lat && lng) {
      query = User.find({
        ...filter,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: parseInt(maxDistance),
          },
        },
      });
    } else {
      query = User.find(filter).sort({ rating: -1 });
    }

    const techs = await query.select('-password').limit(50);
    const planPriority = { gold: 3, silver: 2, free: 1 };
    techs.sort((a, b) => (planPriority[b.plan] || 0) - (planPriority[a.plan] || 0) || b.rating - a.rating);

    res.json({ results: techs.length, technicians: techs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users/:id
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/users/me
exports.updateMe = async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'specialty', 'description', 'avatar', 'gallery', 'isOnline', 'isAvailable'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (req.body.lat && req.body.lng) {
      updates.location = {
        type: 'Point',
        coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)],
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/users/me/plan
exports.updatePlan = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['free', 'silver', 'gold'].includes(plan))
      return res.status(400).json({ error: 'Plan inválido.' });

    const expires = plan !== 'free'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { plan, planExpires: expires },
      { new: true }
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/users/me/leads — estado de leads del técnico
exports.getLeads = async (req, res) => {
  try {
    const Plan = require('../models/Plan.model');
    const tech = await User.findById(req.user._id);
    if (!tech) return res.status(404).json({ error: 'Usuario no encontrado.' });

    tech.checkLeadsReset();
    await tech.save();

    const plan = await Plan.findOne({ name: tech.plan });
    const leadsPerMonth  = plan ? plan.leadsPerMonth : 3;
    const unlimited      = leadsPerMonth === -1;
    const leadsRemaining = unlimited ? -1 : Math.max(0, leadsPerMonth - tech.leadsUsed);

    const now       = new Date();
    const resetDate = new Date(tech.leadsResetAt);
    const nextReset = new Date(resetDate.getFullYear(), resetDate.getMonth() + 1, 1);
    const daysToReset = Math.ceil((nextReset - now) / (1000 * 60 * 60 * 24));

    res.json({
      plan:           tech.plan,
      leadsPerMonth,
      leadsUsed:      tech.leadsUsed,
      leadsRemaining,
      unlimited,
      daysToReset:    unlimited ? null : daysToReset,
      nextReset:      unlimited ? null : nextReset,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/users/me/whatsapp
exports.updateWhatsapp = async (req, res) => {
  try {
    const { whatsappNumber, callmebotApiKey, whatsappEnabled } = req.body;
    const updates = {};
    if (whatsappNumber  !== undefined) updates.whatsappNumber  = whatsappNumber.trim();
    if (callmebotApiKey !== undefined) updates.callmebotApiKey = callmebotApiKey.trim();
    if (whatsappEnabled !== undefined) updates.whatsappEnabled = !!whatsappEnabled;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ ok: true, whatsappEnabled: user.whatsappEnabled, whatsappNumber: user.whatsappNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/users/me/whatsapp/test
exports.testWhatsapp = async (req, res) => {
  try {
    const { sendWhatsApp } = require('../utils/whatsapp');
    const user = await User.findById(req.user._id).select('+callmebotApiKey');
    if (!user.whatsappNumber || !user.callmebotApiKey)
      return res.status(400).json({ error: 'Configura tu número y API key primero.' });

    const msg = 'Tu HandyMan — Notificaciones WhatsApp activadas. Recibirás alertas cuando lleguen nuevas solicitudes.';
    const result = await sendWhatsApp(user.whatsappNumber, user.callmebotApiKey, msg);
    res.json({ ok: result.ok, message: result.ok ? 'Mensaje enviado' : 'Falló el envío' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
