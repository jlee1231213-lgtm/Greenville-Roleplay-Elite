const { EmbedBuilder } = require('discord.js');
const Settings = require('../models/settings');
const SessionLog = require('../models/sessionlog');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isButton()) return;

    const [prefix, type, userId] = interaction.customId.split('_');
    if (prefix !== 'staffprofile') return;
    if (interaction.user.id !== userId) {
      return interaction.reply({ content: "You can't control another user's staff profile.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = '#368f4c';

    if (type === 'sessions') {
      const sessions = await SessionLog.find({ userId, sessiontype: 'session' }).sort({ timestarted: -1 });
      const description = sessions.length
        ? sessions.map(s => {
            const start = s.timestarted.toLocaleString();
            const end = s.timeended ? s.timeended.toLocaleString() : 'Still Active';
            const duration = s.timeended ? ((s.timeended - s.timestarted)/1000).toFixed(0)+'s' : 'N/A';
            return `• **Started:** ${start} | **Ended:** ${end} | **Duration:** ${duration}`;
          }).join('\n')
        : 'No session records found.';

      const embed = new EmbedBuilder()
        .setTitle(`Sessions (${sessions.length})`)
        .setDescription(description)
        .setColor(embedColor);

      await interaction.editReply({ embeds: [embed] });
    }

    if (type === 'cohost') {
      const cohosts = await SessionLog.find({ userId, sessiontype: 'cohost' }).sort({ timestarted: -1 });
      const itemsPerPage = 11;
      const description = cohosts.length
        ? cohosts.slice(0, itemsPerPage).map(s => {
            const start = s.timestarted.toLocaleString();
            const end = s.timeended ? s.timeended.toLocaleString() : 'Still Active';
            const duration = s.timeended ? ((s.timeended - s.timestarted)/1000).toFixed(0)+'s' : 'N/A';
            return `• **Started:** ${start} | **Ended:** ${end} | **Duration:** ${duration}`;
          }).join('\n')
        : 'No cohost records found.';

      const embed = new EmbedBuilder()
        .setTitle(`Cohost Sessions (${cohosts.length})`)
        .setDescription(description)
        .setColor(embedColor);

      await interaction.editReply({ embeds: [embed] });
    }

    if (type === 'supervise') {
      const supervises = await SessionLog.find({ userId, sessiontype: 'supervise' }).sort({ timestarted: -1 });
      const itemsPerPage = 11;
      const description = supervises.length
        ? supervises.slice(0, itemsPerPage).map(s => {
            const start = s.timestarted.toLocaleString();
            const end = s.timeended ? s.timeended.toLocaleString() : 'Still Active';
            const duration = s.timeended ? ((s.timeended - s.timestarted)/1000).toFixed(0)+'s' : 'N/A';
            return `• **Started:** ${start} | **Ended:** ${end} | **Duration:** ${duration}`;
          }).join('\n')
        : 'No supervise records found.';

      const embed = new EmbedBuilder()
        .setTitle(`Supervise Sessions (${supervises.length})`)
        .setDescription(description)
        .setColor(embedColor);

      await interaction.editReply({ embeds: [embed] });
    }
  }
};
