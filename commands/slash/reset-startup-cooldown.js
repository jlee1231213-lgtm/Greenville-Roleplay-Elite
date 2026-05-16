const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const { greenvilleFooter, GREENVILLE_FOOTER_ICON_URL } = require('../../utils/embedFooter');
const Settings = require('../../models/settings');
const { startupCooldowns } = require('./startup');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-startup-cooldown')
    .setDescription('Reset the startup command cooldown for a user')
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
        .setThumbnail(GREENVILLE_FOOTER_ICON_URL).setFooter(greenvilleFooter(interaction));
      return interaction.editReply({
        embeds: [errorEmbed],
      });
    }

    const targetUser = interaction.options.getUser('user');
    startupCooldowns.delete(targetUser.id);

    const successEmbed = new EmbedBuilder()
      .setDescription(`Reset startup cooldown for <@${targetUser.id}>.`)
      .setColor('#4C7C58')
      .setThumbnail(GREENVILLE_FOOTER_ICON_URL).setFooter(greenvilleFooter(interaction));
    return interaction.editReply({
      embeds: [successEmbed],
    });
  }
};
