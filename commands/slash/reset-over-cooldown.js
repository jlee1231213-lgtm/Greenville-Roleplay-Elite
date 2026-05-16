const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { greenvilleFooter, greenvilleAuthor } = require("../../utils/embedFooter");
const Settings = require('../../models/settings');
const { overCooldowns } = require('./over');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-over-cooldown')
    .setDescription('Reset the over command cooldown for a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user whose cooldown to reset')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const allowedRoleIds = [settings?.staffRoleId, settings?.adminRoleId].filter(Boolean);

    if (!interaction.member.roles.cache.some(role => allowedRoleIds.includes(role.id))) {
      const errorEmbed = new EmbedBuilder()
        .setDescription('You do not have the required role to use this command.')
        .setColor('#4C7C58')
        .setAuthor(greenvilleAuthor()).setFooter(greenvilleFooter(interaction));
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    const targetUser = interaction.options.getUser('user');
    overCooldowns.delete(targetUser.id);

    const successEmbed = new EmbedBuilder()
      .setDescription(`Reset over cooldown for <@${targetUser.id}>.`)
      .setColor('#4C7C58')
      .setAuthor(greenvilleAuthor()).setFooter(greenvilleFooter(interaction));
    return interaction.editReply({ embeds: [successEmbed] });
  }
};
