const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
  name:         { type: String,  required: true,  trim: true },
  email:        { type: String,  required: true,  unique: true, lowercase: true, trim: true },
  password:     { type: String,  required: true,  minlength: 6, select: false },
  role:         { type: String,  enum: ['cliente', 'tecnico'], required: true },
  phone:        { type: String,  default: '' },
  avatar:       { type: String,  default: '' },

  // Geolocalización — opcional
  location: {
    type:        { type: String, enum: ['Point'] },
    coordinates: { type: [Number] },  // [lng, lat]
  },

  // Suscripción (técnicos)
  plan:         { type: String, enum: ['free', 'silver', 'gold'], default: 'free' },
  planExpires:  { type: Date },
  specialty:    { type: String, default: '' },
  specialties:  [{ type: String }],   // múltiples especialidades (para SOS matching)
  description:  { type: String, default: '' },
  gallery:      [{ type: String }],

  // Reputación
  rating:       { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },

  // Estado
  isVerified:   { type: Boolean, default: false },
  isOnline:     { type: Boolean, default: false },
  isAvailable:  { type: Boolean, default: true },   // disponible para tomar trabajos
  isActive:     { type: Boolean, default: true },

  // Recuperación de contraseña
  resetToken:        { type: String, select: false },
  resetTokenExpires: { type: Date,   select: false },
}, {
  timestamps: true,
});

UserSchema.index({ location: '2dsphere' }, { sparse: true });
UserSchema.index({ role: 1, plan: -1, rating: -1 });

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpires;
  return obj;
};

module.exports = model('User', UserSchema);
