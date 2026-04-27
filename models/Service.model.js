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

  location: {
    type:        { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true },  // [lng, lat]
    address:     { type: String, default: '' },
  },

  price:        { type: Number, default: 0 },
  scheduledAt:  { type: Date },
  acceptedAt:   { type: Date },
  completedAt:  { type: Date },

  // Rating posterior al servicio
  rated:        { type: Boolean, default: false },
}, {
  timestamps: true,
});

ServiceSchema.index({ location: '2dsphere' });
ServiceSchema.index({ client: 1, status: 1 });
ServiceSchema.index({ technician: 1, status: 1 });

module.exports = model('Service', ServiceSchema);
