const { Schema, model } = require('mongoose');

const ReviewSchema = new Schema({
  service:    { type: Schema.Types.ObjectId, ref: 'Service', required: true, unique: true },
  client:     { type: Schema.Types.ObjectId, ref: 'User',    required: true },
  technician: { type: Schema.Types.ObjectId, ref: 'User',    required: true },
  rating:     { type: Number, required: true, min: 1, max: 5 },
  comment:    { type: String, default: '', maxlength: 500 },
}, {
  timestamps: true,
});

ReviewSchema.index({ technician: 1 });

module.exports = model('Review', ReviewSchema);
