const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dmall')
        .setDescription('Send a custom DM to all members')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send to all members')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const message = interaction.options.getString('message');
        const guild = interaction.guild;

        if (!guild) {
            return interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const members = await guild.members.fetch();
        let successCount = 0;
        let failureCount = 0;

        for (const [id, member] of members) {
            if (!member.user.bot) {
                try {
                    await member.user.send(message);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to DM ${member.user.tag}:`, error.code || error.message);
                    failureCount++;
                }
                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        await interaction.editReply({ content: `DMs sent successfully to ${successCount} members. Failed to send to ${failureCount} members.` });
    },
};