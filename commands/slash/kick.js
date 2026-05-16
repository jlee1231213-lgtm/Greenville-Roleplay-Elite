const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { greenvilleFooter, greenvilleAuthor } = require('../../utils/embedFooter');
const Settings = require('../../models/settings');
const ModLog = require('../../models/modlogs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    if (!settings) return interaction.editReply({ content: 'Server settings not found.' });

    const staffRoleId = settings.staffRoleId;
    if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.editReply({ content: 'You must have the Staff role to use this command.' });
    }

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!guildMember) return interaction.editReply({ content: 'User not found in the server.' });
    if (!guildMember.kickable) return interaction.editReply({ content: 'I cannot kick that user.' });

    const embedColor = '#4C7C58';

    const dmEmbed = new EmbedBuilder()
      .setTitle(`${interaction.guild.name} | Kicked`)
      .setDescription(`You have been kicked from **${interaction.guild.name}**.\n\n> **Reason**: ${reason}\n> **Moderator**: <@${interaction.user.id}>`)
      .setColor(embedColor)
      .setAuthor(greenvilleAuthor()).setFooter(greenvilleFooter(interaction))
      .setTimestamp();

    await target.send({ embeds: [dmEmbed] }).catch(() => null);
    await guildMember.kick(reason);

    await ModLog.create({ userId: interaction.user.id, targetId: target.id, reason, type: 'kick', date: new Date() });

    const embed = new EmbedBuilder()
      .setTitle('User Kicked')
      .setDescription(`<@${target.id}> has been kicked from the server.`)
      .setColor(embedColor)
      .setAuthor(greenvilleAuthor()).setFooter(greenvilleFooter(interaction))
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
