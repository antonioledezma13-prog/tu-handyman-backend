const Review  = require('../models/Review.model');
const Service = require('../models/Service.model');
const User    = require('../models/User.model');

// POST /api/reviews  — cliente califica al técnico
exports.createReview = async (req, res) => {
  try {
    const { serviceId, rating, comment } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado.' });
    if (String(service.client) !== String(req.user._id))
      return res.status(403).json({ error: 'Solo el cliente puede calificar.' });
    if (service.status !== 'completed')
      return res.status(400).json({ error: 'El servicio aún no está completado.' });
    if (service.rated)
      return res.status(400).json({ error: 'Este servicio ya fue calificado.' });

    const review = await Review.create({
      service:    serviceId,
      client:     req.user._id,
      technician: service.technician,
      rating,
      comment: comment || '',
    });

    // Actualizar rating promedio del técnico
    const reviews = await Review.find({ technician: service.technician });
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    await User.findByIdAndUpdate(service.technician, {
      rating:       Math.round(avg * 10) / 10,
      totalReviews: reviews.length,
    });

    service.rated = true;
    await service.save();

    res.status(201).json({ review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/reviews/technician/:id
exports.getByTechnician = async (req, res) => {
  try {
    const reviews = await Review.find({ technician: req.params.id })
      .populate('client', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({ results: reviews.length, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
