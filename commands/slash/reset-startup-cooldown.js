const { SlashCommandBuilder, MessageFlags } = require('discord.js');
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
    await interaction.deferReply({ });
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const allowedRoleIds = [settings?.staffRoleId, settings?.adminRoleId].filter(Boolean);

    if (!interaction.member.roles.cache.some(role => allowedRoleIds.includes(role.id))) {
      return interaction.editReply({
        content: 'You do not have the required role to use this command.',
      });
    }

    const targetUser = interaction.options.getUser('user');
    startupCooldowns.delete(targetUser.id);

    return interaction.editReply({
      content: `Reset startup cooldown for <@${targetUser.id}>.`,
    });
  }
};
