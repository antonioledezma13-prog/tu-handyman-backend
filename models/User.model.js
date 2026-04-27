const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
  name:         { type: String,  required: true,  trim: true },
  email:        { type: String,  required: true,  unique: true, lowercase: true, trim: true },
  password:     { type: String,  required: true,  minlength: 6, select: false },
  role:         { type: String,  enum: ['cliente', 'tecnico'], required: true },
  phone:        { type: String,  default: '' },
  avatar:       { type: String,  default: '' },

  // Geolocalización (solo técnicos y clientes con ubicación activa)
  location: {
    type:        { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },  // [lng, lat]
  },

  // Suscripción (solo técnicos)
  plan:         { type: String, enum: ['free', 'silver', 'gold'], default: 'free' },
  planExpires:  { type: Date },
  specialty:    { type: String, default: '' },          // solo técnicos
  description:  { type: String, default: '' },          // bio técnico
  gallery:      [{ type: String }],                     // URLs fotos de trabajos

  // Reputación
  rating:       { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },

  // Estado
  isVerified:   { type: Boolean, default: false },
  isOnline:     { type: Boolean, default: false },
  isActive:     { type: Boolean, default: true },

  // Recuperación de contraseña
  resetToken:        { type: String, select: false },
  resetTokenExpires: { type: Date,   select: false },
}, {
  timestamps: true,
});

// Índice 2dsphere para $near / $geoWithin
UserSchema.index({ location: '2dsphere' });
UserSchema.index({ role: 1, plan: -1, rating: -1 }); // búsqueda con prioridad por plan

// Hash contraseña antes de guardar
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Comparar contraseña
UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// No exponer password en JSON
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpires;
  return obj;
};

module.exports = model('User', UserSchema);
