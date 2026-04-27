const Plan = require('../models/Plan.model');

// GET /api/plans
exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ price: 1 });
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/plans/seed  — carga inicial de planes (solo en desarrollo)
exports.seedPlans = async (req, res) => {
  try {
    await Plan.deleteMany({});
    const plans = await Plan.insertMany([
      {
        name: 'free', displayName: 'Básico', price: 0,
        leadsPerMonth: 3, searchPriority: 1,
        chatEnabled: false, callEnabled: false, galleryEnabled: false, badgeVerified: false,
        features: ['Perfil básico', 'Hasta 3 leads/mes'],
      },
      {
        name: 'silver', displayName: 'Silver', price: 15,
        leadsPerMonth: 20, searchPriority: 2,
        chatEnabled: true, callEnabled: false, galleryEnabled: false, badgeVerified: false,
        features: ['Perfil completo + foto', 'Hasta 20 leads/mes', 'Prioridad media en búsqueda', 'Chat directo'],
      },
      {
        name: 'gold', displayName: 'Gold', price: 35,
        leadsPerMonth: -1, searchPriority: 3,
        chatEnabled: true, callEnabled: true, galleryEnabled: true, badgeVerified: true,
        features: ['Perfil premium + galería', 'Leads ilimitados', 'Máxima prioridad', 'Chat + llamada', 'Insignia verificado ⭐'],
      },
    ]);
    res.status(201).json({ plans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
