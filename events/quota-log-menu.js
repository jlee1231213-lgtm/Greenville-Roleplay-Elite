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
  host: 'Session Hosted',
  cohost: 'Co-Host',
  partnership: 'Partnership',
  supervise: 'Supervise',
};

function formatLoggedTitle(activityLabel) {
  return `## > *__Greenville Hub, ${activityLabel} logged__*`;
}

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
    const embedColor = settings?.embedcolor || '#4C7C58';

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

    const activityLabel = ACTIVITY_LABELS[activityType];
    const logEmbed = new EmbedBuilder()
      .setColor(embedColor)
      .setDescription([
        formatLoggedTitle(activityLabel),
        `<a:GVH_animatedarrow:1504244827062010131> <@${userId}> logged a ${activityLabel.toLowerCase()}`,
      ].join('\n'))
      .addFields(
        { name: 'User', value: interaction.user.username, inline: true },
        { name: 'Points', value: `+${pointsToAdd}`, inline: true },
        { name: 'Total', value: `${quotaDoc.amount}`, inline: true }
      )
      .setThumbnail(interaction.user.displayAvatarURL());

    const logChannel = interaction.guild.channels.cache.get('1501033146941050920');
    if (logChannel?.isTextBased?.()) {
      await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
    }

    return interaction.editReply({
      content: `✅ Logged **${ACTIVITY_LABELS[activityType]}** (+${pointsToAdd} points). New total: **${quotaDoc.amount}**`,
    });
  },
};
