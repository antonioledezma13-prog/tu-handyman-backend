const { Schema, model } = require('mongoose');

const NotificationSchema = new Schema({
  user:    { type: Schema.Types.ObjectId, ref: 'User', required: true }, // destinatario
  service: { type: Schema.Types.ObjectId, ref: 'Service' },
  type: {
    type: String,
    enum: [
      'service_requested',  // técnico: nuevo trabajo disponible
      'service_accepted',   // cliente: técnico aceptó
      'service_in_progress',// cliente: técnico en camino / trabajando
      'service_completed',  // cliente: trabajo terminado
      'service_cancelled',  // ambos: cancelado
      'new_review',         // técnico: recibió calificación
    ],
    required: true,
  },
  title:   { type: String, required: true },
  body:    { type: String, required: true },
  read:    { type: Boolean, default: false },
}, {
  timestamps: true,
});

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = model('Notification', NotificationSchema);
