const { Schema, model } = require('mongoose');

const PlanSchema = new Schema({
  name:           { type: String, enum: ['free', 'silver', 'gold'], unique: true, required: true },
  displayName:    { type: String, required: true },
  price:          { type: Number, required: true },        // USD/mes
  leadsPerMonth:  { type: Number, default: 0 },            // -1 = ilimitado
  searchPriority: { type: Number, default: 1 },            // 1=baja, 2=media, 3=alta
  chatEnabled:    { type: Boolean, default: false },
  callEnabled:    { type: Boolean, default: false },
  galleryEnabled: { type: Boolean, default: false },
  badgeVerified:  { type: Boolean, default: false },
  features:       [{ type: String }],
}, {
  timestamps: true,
});

module.exports = model('Plan', PlanSchema);
