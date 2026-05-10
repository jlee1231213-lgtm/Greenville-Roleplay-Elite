const { MessageFlags } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);

                const isDatabaseIssue = /before initial connection is complete|bad auth|Mongo/i.test(error.message || '');
                const baseContent = isDatabaseIssue
                    ? 'Database is currently unavailable. Please try again shortly.'
                    : 'There was an error while executing this command!';
                const details = !isDatabaseIssue && error?.message
                    ? `\n\`/${interaction.commandName}\` failed: ${String(error.message).slice(0, 120)}`
                    : '';
                const content = `${baseContent}${details}`;

                if (interaction.deferred) {
                    await interaction.editReply({ content });
                } else if (interaction.replied) {
                    await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
                } else {
                    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
                }
            }
        }
    },
};