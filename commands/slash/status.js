const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Update the bot\'s presence dynamically')
        .addStringOption(option =>
            option.setName('activity')
                .setDescription('The activity type (e.g., PLAYING, WATCHING)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The status message to display')
                .setRequired(true)),

    async execute(interaction) {
        const activity = interaction.options.getString('activity').toUpperCase();
        const message = interaction.options.getString('message');

        try {
            await interaction.client.user.setPresence({
                activities: [{ name: message, type: activity }],
            });
            await interaction.reply({ content: `Bot status updated to **${activity} ${message}**`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to update bot status. Please try again.', ephemeral: true });
        }
    },
};