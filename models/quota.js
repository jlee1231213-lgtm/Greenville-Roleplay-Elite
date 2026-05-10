const mongoose = require('mongoose');

const quotaLogSchema = new mongoose.Schema({
  action: { type: String, enum: ['add', 'remove', 'reset'], required: true },
  amount: { type: Number, required: true },
  reason: { type: String, default: 'No reason provided.' },
  moderatorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const quotaSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  amount: { type: Number, default: 0 },
  logs: { type: [quotaLogSchema], default: [] }
}, { timestamps: true });

quotaSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Quota', quotaSchema);