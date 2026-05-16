const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Settings = require('../../models/settings');
const StartupSession = require('../../models/startupsession');
const { activeStartupSessions } = require('./startup');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_SUPERVISE_EMBED = {
  title: '## <a:beatinghearts:1500587804445638897>  *__Greenville Roleplay Elite - Session Supervise!__* <a:beatinghearts:1500587804445638897>',
  description: '<:dot:1500584469906591971> {{user}} is supervising this current session, expect this to go smoothly, and expect a better experience within the session!!',
  image: null,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('supervise')
    .setDescription('Supervise a session'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = '#4C7C58';
    const allowedRoleId = settings?.staffRoleId;
    if (!allowedRoleId || !interaction.member.roles.cache.has(allowedRoleId)) return interaction.editReply({ content: 'No permission' });
    const userId = interaction.user.id;
    const timestamp = new Date();
    const sessionId = uuidv4();
    activeStartupSessions.set(sessionId, { userId, timestamp, type: 'supervise' });

    let replyTarget = null;

    const startupFromDb = await StartupSession.findOne({ guildId: interaction.guild.id }).sort({ createdAt: -1 });
    if (startupFromDb) {
      try {
        const startupChannel = await interaction.client.channels.fetch(startupFromDb.channelId);
        replyTarget = await startupChannel.messages.fetch(startupFromDb.messageId);
      } catch {
        replyTarget = null;
      }
    }

    if (!replyTarget) {
      const latestStartup = [...activeStartupSessions.entries()]
        .filter(([id, data]) => data.type === 'session')
        .sort((a, b) => b[1].timestamp - a[1].timestamp)[0];

      if (latestStartup) {
        const [id, data] = latestStartup;
        if (data.messageId) {
          try {
            replyTarget = await interaction.channel.messages.fetch(data.messageId);
          } catch {
            replyTarget = null;
          }
        }
      }
    }

    const superviseTemplate = settings?.superviseEmbed || DEFAULT_SUPERVISE_EMBED;
    const superviseEmbed = new EmbedBuilder()
      .setTitle(superviseTemplate.title || DEFAULT_SUPERVISE_EMBED.title)
      .setDescription(
        (superviseTemplate.description || DEFAULT_SUPERVISE_EMBED.description)
          .replace(/\{\{user\}\}|\$user/g, `<@${userId}>`)
      )
      .setColor(embedColor)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });
    if (superviseTemplate.image?.startsWith('http')) superviseEmbed.setImage(superviseTemplate.image);

    if (replyTarget && replyTarget.reply) await replyTarget.reply({ embeds: [superviseEmbed] });
    else await interaction.channel.send({ embeds: [superviseEmbed] });

    await interaction.editReply({ content: 'Supervise registered successfully.', flags: MessageFlags.Ephemeral });
  }
};
