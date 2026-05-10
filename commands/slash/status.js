const { SlashCommandBuilder, PermissionFlagsBits, ActivityType } = require('discord.js');

const ACTIVITY_MAP = {
    PLAYING: ActivityType.Playing,
    WATCHING: ActivityType.Watching,
    LISTENING: ActivityType.Listening,
    COMPETING: ActivityType.Competing,
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Update the bot\'s presence dynamically')
        .addStringOption(option =>
            option.setName('activity')
                .setDescription('The activity type')
                .setRequired(true)
                .addChoices(
                    { name: 'Playing', value: 'PLAYING' },
                    { name: 'Watching', value: 'WATCHING' },
                    { name: 'Listening', value: 'LISTENING' },
                    { name: 'Competing', value: 'COMPETING' },
                ))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The status message to display')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const activityKey = interaction.options.getString('activity');
        const message = interaction.options.getString('message') || 'Greenville Roleplay Elite™ Sessions';
        const activityType = ACTIVITY_MAP[activityKey];

        try {
            await interaction.client.user.setPresence({
                activities: [{ name: message, type: activityType }],
            });
            await interaction.reply({ content: `Bot status updated to **${activityKey} ${message}**`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to update bot status. Please try again.', ephemeral: true });
        }
    },
};