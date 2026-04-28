const { Schema, model } = require('mongoose');

const ServiceSchema = new Schema({
  client:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  technician:  { type: Schema.Types.ObjectId, ref: 'User', default: null },

  category:    { type: String, required: true,
    enum: ['plomeria','electricidad','mecanica','electronica','carpinteria',
           'ac_refrigeracion','pintura','cerrajeria','otro'] },
  description: { type: String, required: true },

  status: {
    type: String,
    enum: ['pending','accepted','in_progress','completed','cancelled'],
    default: 'pending',
  },

  // Ubicación del trabajo (GPS del cliente)
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] }, // [lng, lat]
    address:     { type: String, default: '' },
  },

  // Ubicación en tiempo real del técnico
  techLocation: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
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

ServiceSchema.index({ location: '2dsphere' });
ServiceSchema.index({ techLocation: '2dsphere' });
ServiceSchema.index({ client: 1, status: 1 });
ServiceSchema.index({ technician: 1, status: 1 });

module.exports = model('Service', ServiceSchema);
