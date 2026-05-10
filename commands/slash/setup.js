const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings');
const StartupSession = require('../../models/startupsession');
const { activeStartupSessions } = require('./startup');

const DEFAULT_SETUP_EMBED = {
  title: '<a:loading:1500587786649211051> *__Greenville Roleplay Elite - Session Preparation!__* <a:loading:1500587786649211051>',
  description: '<:dot:1500584469906591971> {{user}} is officially setting up their session! While you wait for **EA & Release**, make sure you registered a **vehicle**.\n**Please don\'t ping the host** during this time, setup takes **5-10 minutes.**',
  image: null,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Send a session preparation message'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    if (settings) {
      const staffRoleId = settings.staffRoleId;
      if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
        return interaction.editReply({ content: 'You must have the Staff role to use this command.' });
      }
    }

    const userId = interaction.user.id;

    let replyTarget = null;
    const startupFromDb = await StartupSession.findOne({ guildId: interaction.guild.id }).sort({ createdAt: -1 });
    if (startupFromDb) {
      try {
        const startupChannel = await interaction.client.channels.fetch(startupFromDb.channelId);
        if (startupChannel?.isTextBased?.()) {
          replyTarget = await startupChannel.messages.fetch(startupFromDb.messageId).catch(() => null);
        }
      } catch {
        replyTarget = null;
      }
    }

    if (!replyTarget) {
      const latestStartup = [...activeStartupSessions.entries()]
        .filter(([, data]) => data.type === 'session')
        .sort((a, b) => b[1].timestamp - a[1].timestamp)[0];

      if (latestStartup) {
        const [, startupData] = latestStartup;
        if (startupData.messageId) {
          try {
            replyTarget = await interaction.channel.messages.fetch(startupData.messageId);
          } catch {
            replyTarget = null;
          }
        }
      }
    }

    const setupTemplate = settings?.setupEmbed || DEFAULT_SETUP_EMBED;
    const setupTitle = (setupTemplate.title || DEFAULT_SETUP_EMBED.title || '').trim();
    const setupDescription = (setupTemplate.description || DEFAULT_SETUP_EMBED.description)
      .replace(/\{\{user\}\}|\$user/g, `<@${userId}>`)
      .replace(/\\n/g, '\n');

    // Discord does not render markdown headings in embed titles. If title starts with ##,
    // move it into the description so the heading styling works.
    const finalDescription = setupTitle.startsWith('##')
      ? `${setupTitle}\n${setupDescription}`
      : setupDescription;

    const setupEmbed = new EmbedBuilder()
      .setDescription(finalDescription)
      .setColor('#368f4c')
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    if (setupTitle && !setupTitle.startsWith('##')) {
      setupEmbed.setTitle(setupTitle);
    }

    if (setupTemplate.image?.startsWith('http')) {
      setupEmbed.setImage(setupTemplate.image);
    }

    try {
      if (replyTarget?.reply) await replyTarget.reply({ embeds: [setupEmbed] });
      else await interaction.channel.send({ embeds: [setupEmbed] });
    } catch {
      return interaction.editReply({
        content: 'I do not have access to post setup in that channel. Please check channel permissions.',
      });
    }

    await interaction.editReply({ content: 'Setup message sent.' });
  },
};
