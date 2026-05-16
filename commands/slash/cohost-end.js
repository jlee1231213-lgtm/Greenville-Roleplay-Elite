const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Settings = require('../../models/settings');
const SessionLog = require('../../models/sessionlog');
const { activeStartupSessions } = require('../slash/startup');

const DEFAULT_COHOST_END_EMBED = {
  title: 'Session Co-Host Ended',
  description: '{{user}} Has stopped Co-Hosting for this session.',
  image: null,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cohost-end')
    .setDescription('End a cohost session'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = '#4C7C58';
    const allowedRoleIds = [settings?.staffRoleId, settings?.adminRoleId].filter(Boolean);
    if (!interaction.member.roles.cache.some(role => allowedRoleIds.includes(role.id))) return interaction.editReply({ embeds: [new EmbedBuilder().setDescription('You do not have the required role to use this command.').setColor(embedColor)] });
    const userId = interaction.user.id;

    const sessionEntry = [...activeStartupSessions.entries()]
      .find(([id, data]) => data.userId === userId && data.type === 'cohost');
    if (!sessionEntry) return interaction.editReply({ embeds: [new EmbedBuilder().setDescription('No active cohost session found in memory for you.').setColor(embedColor)] });

    const [sessionId, sessionData] = sessionEntry;
    await SessionLog.create({ guildId: interaction.guild.id, sessiontype: sessionData.type, sessionId, userId: sessionData.userId, timestarted: sessionData.timestamp, timeended: new Date() });
    activeStartupSessions.delete(sessionId);

    const cohostEndTemplate = settings?.cohostendEmbed || DEFAULT_COHOST_END_EMBED;
    const endEmbed = new EmbedBuilder()
      .setTitle(cohostEndTemplate.title || DEFAULT_COHOST_END_EMBED.title)
      .setDescription(
        (cohostEndTemplate.description || DEFAULT_COHOST_END_EMBED.description)
          .replace(/\{\{user\}\}|\$user/g, `<@${userId}>`)
      )
      .setColor(embedColor)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });
    if (cohostEndTemplate.image?.startsWith('http')) endEmbed.setImage(cohostEndTemplate.image);
    if (cohostEndTemplate.thumbnail?.startsWith('http')) endEmbed.setThumbnail(cohostEndTemplate.thumbnail);

    const originalCohostMessage = await interaction.channel.messages.fetch(sessionData.messageId).catch(() => null);

    if (originalCohostMessage && originalCohostMessage.reply) await originalCohostMessage.reply({ embeds: [endEmbed] });
    else await interaction.channel.send({ embeds: [endEmbed] });

    await interaction.editReply({ content: 'Command executed successfully', flags: MessageFlags.Ephemeral });
  }
};
