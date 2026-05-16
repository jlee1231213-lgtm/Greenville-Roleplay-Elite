const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { greenvilleFooter, GREENVILLE_FOOTER_ICON_URL } = require("../../utils/embedFooter");
const Settings = require('../../models/settings');
const SessionLog = require('../../models/sessionlog');
const ModLog = require('../../models/modlogs');
const Quota = require('../../models/quota');

const POINT_VALUES = {
  host: 2,
  cohost: 1,
  partnership: 0.5,
  supervise: 1,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff-profile')
    .setDescription('Show a staff member\'s profile')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Staff member to check')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user') || interaction.user;
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = '#4C7C58';

    const sessionCount = await SessionLog.countDocuments({ userId: user.id, sessiontype: 'session' });
    const cohostCount = await SessionLog.countDocuments({ userId: user.id, sessiontype: 'cohost' });
    const superviseCount = await SessionLog.countDocuments({ userId: user.id, sessiontype: 'supervise' });
    const moderationCount = await ModLog.countDocuments({ userId: user.id, type: 'moderation' });
    const strikeCount = await ModLog.countDocuments({ targetId: user.id, type: 'staff-strike' });

    const embed = new EmbedBuilder()
      .setTitle(`Staff Profile - ${user.tag}`)
      .setDescription(`**User:** <@${user.id}>\n**UserID**: ${user.id}\n\n**Sessions Hosted:** ${sessionCount}\n**Sessions Co-Hosted:** ${cohostCount}\n**Sessions Super-vised:** ${superviseCount}`)
      .setColor(embedColor)
      .setThumbnail(user.displayAvatarURL())
      .setThumbnail(GREENVILLE_FOOTER_ICON_URL).setFooter(greenvilleFooter(interaction));

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`staffprofile_sessions_${user.id}`)
        .setLabel('Hosted Session(s)')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`staffprofile_cohost_${user.id}`)
        .setLabel('Co-Hosted Session(s)')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`staffprofile_supervise_${user.id}`)
        .setLabel('Super-vised Session(s)')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`staffprofile_partnership_${user.id}`)
        .setLabel('Partnership')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [embed], components: [buttons] });
  }
};
