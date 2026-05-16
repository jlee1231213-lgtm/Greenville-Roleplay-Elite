const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Eco = require('../../models/eco');
const Settings = require('../../models/settings');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your balance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check balance of')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply({ });

        const targetUser = interaction.options.getUser('user') || interaction.user;

        const settings = await Settings.findOne({ guildId: interaction.guild.id });
        if (!settings) {
            return interaction.editReply({ content: "Settings are not configured for this server." });
        }

        const civiRoleId = settings.civiRoleId;
        if (civiRoleId && !interaction.member.roles.cache.has(civiRoleId)) {
            return interaction.editReply({ content: "You must be a Civilian to use this command." });
        }

        let userData = await Eco.findOne({ userId: targetUser.id });
        if (!userData) {
            userData = new Eco({
                userId: targetUser.id,
                cash: 3000,
                bank: 0,
                starterEcoGivenBefore: true
            });
            await userData.save();
        }

        const allUsers = await Eco.find({});
        const sorted = allUsers
            .map(u => ({
                userId: u.userId,
                total: (u.cash || 0) + (u.bank || 0)
            }))
            .sort((a, b) => b.total - a.total);

        const position = sorted.findIndex(u => u.userId === targetUser.id) + 1;
        const totalPlayers = sorted.length;

        const embed = new EmbedBuilder()
            .setTitle(`${targetUser.username}'s Balance`)
            .setDescription(
                `Cash: $${userData.cash.toLocaleString()}\n` +
                `Bank: $${userData.bank.toLocaleString()}\n` +
                `Total: $${(userData.cash + userData.bank).toLocaleString()}\n\n` +
                `Leaderboard Position: **#${position}** out of ${totalPlayers}`
            )
            .setColor('#4C7C58');

        await interaction.editReply({ embeds: [embed] });
    }
};
