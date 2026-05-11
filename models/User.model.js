const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new Schema({
  name:         { type: String,  required: true,  trim: true },
  email:        { type: String,  required: true,  unique: true, lowercase: true, trim: true },
  password:     { type: String,  required: true,  minlength: 6, select: false },
  role:         { type: String,  enum: ['cliente', 'tecnico'], required: true },
  phone:        { type: String,  default: '' },
  avatar:       { type: String,  default: '' },

  location: {
    type:        { type: String, enum: ['Point'] },
    coordinates: { type: [Number] },
  },

  plan:         { type: String, enum: ['free', 'silver', 'gold'], default: 'free' },
  planExpires:  { type: Date },
  specialty:    { type: String, default: '' },
  specialties:  [{ type: String }],
  description:  { type: String, default: '' },
  gallery:      [{ type: String }],

  rating:       { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },

  isVerified:   { type: Boolean, default: false },
  isOnline:     { type: Boolean, default: false },
  isAvailable:  { type: Boolean, default: true },
  isActive:     { type: Boolean, default: true },

  // ── Leads ──────────────────────────────────────────────────
  leadsUsed:    { type: Number, default: 0 },
  leadsResetAt: { type: Date,   default: Date.now },

  // ── WhatsApp CallMeBot ─────────────────────────────────────
  whatsappNumber:  { type: String, default: '' },
  callmebotApiKey: { type: String, default: '', select: false },
  whatsappEnabled: { type: Boolean, default: false },

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

// Resetear leads si cambió el mes
UserSchema.methods.checkLeadsReset = function () {
  const now     = new Date();
  const resetAt = new Date(this.leadsResetAt);
  const sameMonth =
    now.getFullYear() === resetAt.getFullYear() &&
    now.getMonth()    === resetAt.getMonth();
  if (!sameMonth) {
    this.leadsUsed    = 0;
    this.leadsResetAt = now;
  }
};

// Verificar si tiene leads disponibles
UserSchema.methods.hasLeadsAvailable = async function () {
  const Plan = require('./Plan.model');
  this.checkLeadsReset();
  const plan = await Plan.findOne({ name: this.plan });
  if (!plan) return false;
  if (plan.leadsPerMonth === -1) return true;
  return this.leadsUsed < plan.leadsPerMonth;
};

// Consumir un lead
UserSchema.methods.consumeLead = async function () {
  const Plan = require('./Plan.model');
  this.checkLeadsReset();
  const plan = await Plan.findOne({ name: this.plan });
  if (!plan) return;
  if (plan.leadsPerMonth !== -1) {
    this.leadsUsed += 1;
  }
  await this.save();
};

// Leads restantes
UserSchema.methods.leadsRemaining = async function () {
  const Plan = require('./Plan.model');
  this.checkLeadsReset();
  const plan = await Plan.findOne({ name: this.plan });
  if (!plan) return 0;
  if (plan.leadsPerMonth === -1) return -1;
  return Math.max(0, plan.leadsPerMonth - this.leadsUsed);
};

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpires;
  delete obj.callmebotApiKey;
  return obj;
};

module.exports = model('User', UserSchema);
