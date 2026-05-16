
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings');
const Vehicle = require('../../models/vehicle');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unregister')
        .setDescription('Unregister one of your vehicles')
        .addStringOption(option =>
            option.setName('vehicle')
                .setDescription('Select a vehicle to unregister')
                .setRequired(true)
                .setAutocomplete(true)),
    async execute(interaction) {
    await interaction.deferReply();
        const guildId = interaction.guild.id;
        const settings = await Settings.findOne({ guildId });
        const embedColor = '#4C7C58';

        const userId = interaction.user.id;
        const vehicleName = interaction.options.getString('vehicle');

        const vehicle = await Vehicle.findOne({ 
            UserID: userId, 
            $or: [
                { brand: vehicleName },
                { model: vehicleName },
                { $expr: { $concat: ["$brand", " ", "$model", " (", "$year", ")"] } }
            ]
        });

        if (!vehicle) return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(embedColor)
                    .setDescription('You do not own this vehicle.')
            ]
        });

        await vehicle.deleteOne();

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('Vehicle Unregistered')
            .setDescription(`Vehicle **${vehicle.brand} ${vehicle.model} (${vehicle.year})** has been unregistered successfully.`);

        return interaction.editReply({ embeds: [embed], });
    }
};
