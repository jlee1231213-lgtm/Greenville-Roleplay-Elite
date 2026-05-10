const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const Settings = require('../../models/settings');

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

    const content = `## > :loading: *__Greenville Roleplay Elite - Session Preparation!__* :loading:\n<:dot:1500584469906591971> <@${userId}> is officially setting up their session! While you wait for **EA & Release**, make sure you registered a **vehicle**.\n**Please don't ping the host** during this time, setup takes **5-10 minutes.**`;

    await interaction.channel.send({ content });
    await interaction.editReply({ content: 'Setup message sent.' });
  },
};
