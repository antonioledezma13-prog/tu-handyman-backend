const { Schema, model } = require('mongoose');

const ServiceSchema = new Schema({
  client:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  technician: { type: Schema.Types.ObjectId, ref: 'User', default: null },

  category: {
    type: String, required: true,
    enum: ['plomeria','electricidad','mecanica','electronica','carpinteria',
           'ac_refrigeracion','pintura','cerrajeria','gas','otro'],
  },
  description: { type: String, required: true },
  isEmergency: { type: Boolean, default: false },  // SOS flag

  status: {
    type: String,
    enum: [
      'pending',      // cliente solicitó, esperando técnico
      'quoted',       // técnico envió cotización, cliente pendiente de aprobar
      'accepted',     // cliente aprobó cotización
      'in_progress',  // trabajo en curso
      'completed',    // completado
      'cancelled',    // cancelado
      'rejected',     // cliente rechazó la cotización
    ],
    default: 'pending',
  },

  // Cotización
  quotedPrice:   { type: Number },          // precio propuesto por técnico
  quotedNote:    { type: String, default: '' }, // nota de la cotización
  quotedAt:      { type: Date },
  priceApprovedAt: { type: Date },

  // Precio final al completar
  price:       { type: Number, default: 0 },

  // Ubicación del trabajo (GPS del cliente)
  location: {
    type:        { type: String },
    coordinates: { type: [Number] },
    address:     { type: String },
  },

  // Ubicación en tiempo real del técnico
  techLocation: {
    type:        { type: String },
    coordinates: { type: [Number] },
    updatedAt:   { type: Date },
  },

  scheduledAt: { type: Date },
  acceptedAt:  { type: Date },
  completedAt: { type: Date },
  rated:       { type: Boolean, default: false },
}, {
  timestamps: true,
});

ServiceSchema.index({ location: '2dsphere' },     { sparse: true });
ServiceSchema.index({ techLocation: '2dsphere' }, { sparse: true });
ServiceSchema.index({ client: 1, status: 1 });
ServiceSchema.index({ technician: 1, status: 1 });
ServiceSchema.index({ isEmergency: 1, status: 1 });

module.exports = model('Service', ServiceSchema);
