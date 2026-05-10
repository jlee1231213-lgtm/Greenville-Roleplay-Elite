const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('View information about the bot'),

    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const ping = sent.createdTimestamp - interaction.createdTimestamp;
        const apiPing = interaction.client.ws.ping;

        let settings = await Settings.findOne({ guildId: interaction.guild.id });
        if (!settings) {
            settings = new Settings({ guildId: interaction.guild.id });
            await settings.save();
        }

        const embed = new EmbedBuilder()
            .setColor('#368f4c')
            .setTitle("Bot Information")
            .addFields(
                { name: 'Developer', value: '<@1374682568120598638> , Aero Systems', inline: true },
                { name: 'Server Location', value: 'N/A', inline: true },
                { name: 'Database Location', value: 'New York', inline: true },
                { name: 'Ping', value: `${ping}ms`, inline: true },
                { name: 'API Latency', value: `${apiPing}ms`, inline: true }
            );

        await interaction.editReply({ content: '', embeds: [embed] });
    }
};
