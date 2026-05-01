const { Schema, model } = require('mongoose');

const NotificationSchema = new Schema({
  user:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: Schema.Types.ObjectId, ref: 'Service' },
  type: {
    type: String,
    enum: [
      'service_requested',
      'service_quoted',
      'quote_accepted',
      'quote_rejected',
      'service_accepted',
      'service_in_progress',
      'service_completed',
      'service_cancelled',
      'new_review',
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
