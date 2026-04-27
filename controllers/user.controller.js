const User = require('../models/User.model');

// GET /api/users/technicians  — lista técnicos con filtros y prioridad por plan
exports.getTechnicians = async (req, res) => {
  try {
    const { specialty, lat, lng, maxDistance = 20000, search } = req.query;

    const filter = { role: 'tecnico', isActive: true };
    if (specialty) filter.specialty = { $regex: specialty, $options: 'i' };
    if (search)    filter.$or = [
      { name:      { $regex: search, $options: 'i' } },
      { specialty: { $regex: search, $options: 'i' } },
    ];

    let query;
    if (lat && lng) {
      // Búsqueda geoespacial
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
      // Sin ubicación: ordenar por plan desc → rating desc
      const planOrder = { gold: 3, silver: 2, free: 1 };
      query = User.find(filter).sort({ rating: -1 });
    }

    const techs = await query.select('-password').limit(50);

    // Reordenar por prioridad de plan (Gold > Silver > Free)
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

// PATCH /api/users/me  — actualizar perfil propio
exports.updateMe = async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'specialty', 'description', 'avatar', 'gallery', 'isOnline'];
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

// PATCH /api/users/me/plan  — actualizar plan
exports.updatePlan = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['free', 'silver', 'gold'].includes(plan))
      return res.status(400).json({ error: 'Plan inválido.' });

    const expires = plan !== 'free'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)  // 30 días
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
