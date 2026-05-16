const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { greenvilleFooter, greenvilleAuthor } = require('../../utils/embedFooter');
const Settings = require('../../models/settings');
const ModLog = require('../../models/modlogs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a member.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to mute')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the mute')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ });
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    if (!settings) return interaction.editReply({ content: 'Server settings not found.' });

    const staffRoleId = settings.staffRoleId;
    if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.editReply({ content: 'You must have the Staff role to use this command.' });
    }

    const target = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason');
    const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!guildMember) return interaction.editReply({ content: 'User not found in the server.' });
    if (!guildMember.moderatable) return interaction.editReply({ content: 'I cannot mute that user.' });

    const ms = duration * 60 * 1000;
    await guildMember.timeout(ms, reason);

    const embedColor = '#4C7C58';

    await ModLog.create({ userId: interaction.user.id, targetId: target.id, reason, type: 'mute', date: new Date() });

    const embed = new EmbedBuilder()
      .setTitle('User Muted')
      .setDescription(`<@${target.id}> has been muted for **${duration} minute(s)**.`)
      .addFields({ name: 'Reason', value: reason })
      .setColor(embedColor)
      .setAuthor(greenvilleAuthor()).setFooter(greenvilleFooter(interaction))
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
