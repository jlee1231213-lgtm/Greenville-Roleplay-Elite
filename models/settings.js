const { WelcomeChannel } = require('discord.js');
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  welcomechannelid: { type: String, default: null },
  logChannelId: { type: String, default: null },
  leoRoleId: { type: String, default: null },
  civiRoleId: { type: String, default: null },
  eaRoleId: { type: String, default: null },
  staffRoleId: { type: String, default: null },
  adminRoleId: { type: String, default: null },
  staffingDepartmentRoleId: { type: String, default: null },

  embedcolor: { type: String, default: '#368f4c' },

  vehiclelist: { type: String, default: null },
  trailerlist: { type: String, default: null },

  vehicleCaps: [
    {
      roleId: { type: String, required: true },
      cap: { type: Number, required: true }
    }
  ],

  startupEmbed: { title: String, description: String, image: String },
  eaEmbed: { title: String, description: String, image: String },
  giveawayEmbed: { title: String, description: String, image: String },
  welcomeEmbed: { title: String, description: String, image: String },
  cohostEmbed: { title: String, description: String, image: String },
  cohostendEmbed: { title: String, description: String, image: String },
  setupEmbed: { title: String, description: String, image: String },
  releaseEmbed: { title: String, description: String, image: String },
  reinvitesEmbed: { title: String, description: String, image: String },
  overEmbed: { title: String, description: String, image: String },
  hatepingsEmbed: { title: String, description: String, image: String },
  superviseEmbed: { title: String, description: String, image: String },
});

module.exports = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
