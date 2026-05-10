const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings');
const { activeStartupSessions } = require('./startup');

const DEFAULT_SETUP_EMBED = {
  title: '## > :loading: *__Greenville Roleplay Elite - Session Preparation!__* :loading:',
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

    const latestStartup = [...activeStartupSessions.entries()]
      .filter(([, data]) => data.type === 'session')
      .sort((a, b) => b[1].timestamp - a[1].timestamp)[0];

    let replyTarget = null;
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

    const setupTemplate = settings?.setupEmbed || DEFAULT_SETUP_EMBED;
    const setupEmbed = new EmbedBuilder()
      .setTitle(setupTemplate.title || DEFAULT_SETUP_EMBED.title)
      .setDescription(
        (setupTemplate.description || DEFAULT_SETUP_EMBED.description)
          .replace(/\{\{user\}\}|\$user/g, `<@${userId}>`)
          .replace(/\\n/g, '\n')
      )
      .setColor('#368f4c')
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    if (setupTemplate.image?.startsWith('http')) {
      setupEmbed.setImage(setupTemplate.image);
    }

    if (replyTarget?.reply) await replyTarget.reply({ embeds: [setupEmbed] });
    else await interaction.channel.send({ embeds: [setupEmbed] });

    await interaction.editReply({ content: 'Setup message sent.' });
  },
};
