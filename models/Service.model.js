const { Schema, model } = require('mongoose');

const ServiceSchema = new Schema({
  client:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  technician: { type: Schema.Types.ObjectId, ref: 'User', default: null },

  category: {
    type: String, required: true,
    enum: ['plomeria','electricidad','mecanica','electronica','carpinteria',
           'ac_refrigeracion','pintura','cerrajeria','otro'],
  },
  description: { type: String, required: true },

  status: {
    type: String,
    enum: ['pending','accepted','in_progress','completed','cancelled'],
    default: 'pending',
  },

  // Ubicación del trabajo — completamente opcional, sin defaults
  location: {
    type:        { type: String },
    coordinates: { type: [Number] },
    address:     { type: String },
  },

  // Ubicación técnico — completamente opcional, sin defaults
  techLocation: {
    type:        { type: String },
    coordinates: { type: [Number] },
    updatedAt:   { type: Date },
  },

  price:       { type: Number, default: 0 },
  scheduledAt: { type: Date },
  acceptedAt:  { type: Date },
  completedAt: { type: Date },
  rated:       { type: Boolean, default: false },
}, {
  timestamps: true,
});

// Índices 2dsphere con sparse:true — solo indexa docs que TENGAN coordenadas
ServiceSchema.index({ location: '2dsphere' },     { sparse: true });
ServiceSchema.index({ techLocation: '2dsphere' }, { sparse: true });
ServiceSchema.index({ client: 1, status: 1 });
ServiceSchema.index({ technician: 1, status: 1 });

module.exports = model('Service', ServiceSchema);
