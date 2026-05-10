const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings');
const ModLog = require('../../models/modlogs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('proof')
        .setDescription('Optional proof link')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guild.id;
    const member = interaction.member;
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const proof = interaction.options.getString('proof') || null;

    const settings = await Settings.findOne({ guildId });
    if (!settings) return interaction.editReply({ content: 'Server settings not found!' });

    const adminRoleId = settings.adminRoleId;
    if (!adminRoleId) return interaction.editReply({ content: 'Admin role is not set in server settings.' });
    if (!member.roles.cache.has(adminRoleId)) return interaction.editReply({ content: 'You must have the Admin role to use this command.' });

    const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!guildMember) return interaction.editReply({ content: 'User not found in the server.' });

    const embedColor = '#368f4c';

    const dmEmbed = new EmbedBuilder()
      .setTitle(`${interaction.guild.name} | Banned`)
      .setDescription(`You have been banned from **${interaction.guild.name}**.
        
> **Reason**: ${reason}
> **Proof**: ${proof || 'No proof provided'}
> **Moderator**: <@${interaction.user.id}>/${interaction.user.tag}`)
      .setColor(embedColor)
      .setTimestamp();

    await target.send({ embeds: [dmEmbed] }).catch(() => null);

    await guildMember.ban({ reason });

    const newLog = new ModLog({
      userId: interaction.user.id,
      targetId: target.id,
      reason,
      type: 'ban',
      proof,
      date: new Date()
    });
    await newLog.save();

    const replyEmbed = new EmbedBuilder()
      .setTitle('User Banned')
      .setDescription(`<@${target.id}> has been banned from the server.`)
      .setColor(embedColor)
      .setTimestamp();

    return interaction.editReply({ embeds: [replyEmbed] });
  }
};
