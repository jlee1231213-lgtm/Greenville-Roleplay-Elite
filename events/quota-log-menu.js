const { EmbedBuilder } = require('discord.js');
const Settings = require('../models/settings');
const Quota = require('../models/quota');

const POINT_VALUES = {
  host: 2,
  cohost: 1,
  partnership: 0.5,
  supervise: 1,
};

const ACTIVITY_LABELS = {
  host: 'Host',
  cohost: 'Co-Host',
  partnership: 'Partnership',
  supervise: 'Supervise',
};

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith('quotalog_')) return;

    const userId = interaction.customId.split('_')[1];
    if (interaction.user.id !== userId) {
      return interaction.reply({ content: 'This menu is not for you.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;
    const activityType = interaction.values[0];
    const pointsToAdd = POINT_VALUES[activityType];
    const settings = await Settings.findOne({ guildId });
    const embedColor = settings?.embedcolor || '#368f4c';

    if (!pointsToAdd) {
      return interaction.editReply({ content: 'Invalid activity type.' });
    }

    const quotaDoc = await Quota.findOneAndUpdate(
      { guildId, userId },
      {
        $inc: { amount: pointsToAdd },
        $push: {
          logs: {
            $each: [{
              action: 'add',
              amount: pointsToAdd,
              reason: ACTIVITY_LABELS[activityType],
              moderatorId: userId,
              createdAt: new Date(),
            }],
            $slice: -20,
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const logEmbed = new EmbedBuilder()
      .setColor(embedColor)
      .setDescription([
        '## > <a:beatinghearts:1500587804445638897> *__Greenville Roleplay Elite - Quota logged!__* <a:beatinghearts:1500587804445638897>',
        `<a:animatedarrow:1500968506114572359> <@${userId}> has logged (${ACTIVITY_LABELS[activityType]})`,
        `<a:animatedarrow:1500968506114572359> Current points: **${quotaDoc.amount}**`,
        `<a:animatedarrow:1500968506114572359> Added points: **${pointsToAdd}**`,
      ].join('\n'));

    const logChannel = interaction.guild.channels.cache.get(settings?.logChannelId);
    if (logChannel?.isTextBased?.()) {
      await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
    }

    return interaction.editReply({
      content: `✅ Logged **${ACTIVITY_LABELS[activityType]}** (+${pointsToAdd} points). New total: **${quotaDoc.amount}**`,
    });
  },
};
