const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { greenvilleFooter } = require('../../utils/embedFooter');
const Settings = require('../../models/settings');
const ModLog = require('../../models/modlogs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a timeout (unmute) from a member.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to unmute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for unmuting')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ });
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    if (!settings) return interaction.editReply({ content: 'Server settings not found.' });

    const staffRoleId = settings.staffRoleId;
    if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.editReply({ content: 'You must have the Staff role to use this command.' });
    }

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!guildMember) return interaction.editReply({ content: 'User not found in the server.' });
    if (!guildMember.isCommunicationDisabled()) return interaction.editReply({ content: 'That user is not currently muted.' });

    await guildMember.timeout(null, reason);

    const embedColor = '#4C7C58';

    await ModLog.create({ userId: interaction.user.id, targetId: target.id, reason, type: 'unmute', date: new Date() });

    const embed = new EmbedBuilder()
      .setTitle('User Unmuted')
      .setDescription(`<@${target.id}>'s timeout has been removed.`)
      .setColor(embedColor)
      .setFooter(greenvilleFooter(interaction))
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
