const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { greenvilleFooter, GREENVILLE_FOOTER_ICON_URL } = require('../../utils/embedFooter');
const Settings = require('../../models/settings');
const Vehicle = require('../../models/vehicle');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register a vehicle for yourself')
        .addStringOption(option =>
            option.setName('year')
                .setDescription('Year of the vehicle')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('brand')
                .setDescription('Brand of the vehicle')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('model')
                .setDescription('Model of the vehicle')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Color of the vehicle')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('plate')
                .setDescription('Plate number of the vehicle')
                .setRequired(true)),

    async execute(interaction) {
    await interaction.deferReply();
        const guildId = interaction.guild.id;
        const member = interaction.member;

        const settings = await Settings.findOne({ guildId });
        const embedColor = '#4C7C58';

        if (!settings) return interaction.editReply({ content: 'Server settings not found!' });

        const civRoleId = settings.civiRoleId;
        if (!civRoleId) return interaction.editReply({ content: 'Civilian role is not set in server settings.' });
        if (!member.roles.cache.has(civRoleId)) return interaction.editReply({ content: 'You must have the Civilian role to register a vehicle.' });

        const userId = interaction.user.id;
        const vehicleCount = await Vehicle.countDocuments({ UserID: userId });

        let cap = 6;
        const capObj = settings.vehicleCaps.find(vc => vc.roleId && member.roles.cache.has(vc.roleId));
        if (capObj) cap = capObj.cap;

        if (vehicleCount >= cap) return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(embedColor)
                    .setDescription(`You have reached your vehicle cap of ${cap}.`)
                    .setThumbnail(GREENVILLE_FOOTER_ICON_URL).setFooter(greenvilleFooter(interaction))
            ]
        });

        const year = interaction.options.getString('year');
        const brand = interaction.options.getString('brand');
        const model = interaction.options.getString('model');
        const color = interaction.options.getString('color');
        const plate = interaction.options.getString('plate').toUpperCase();

        const newVehicle = new Vehicle({
            UserID: userId,
            year,
            brand,
            model,
            Color: color,
            Plate: plate
        });

        await newVehicle.save();

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle('Vehicle Registered')
            .setDescription(`Successfully registered **${brand} ${model} (${year})** with plate **${plate}** and color **${color}**.`)
            .setThumbnail(GREENVILLE_FOOTER_ICON_URL).setFooter(greenvilleFooter(interaction));

        return interaction.editReply({ embeds: [embed], });
    }
};
