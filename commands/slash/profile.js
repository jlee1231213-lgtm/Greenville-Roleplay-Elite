const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Vehicle = require('../../models/vehicle');
const Ticket = require('../../models/tickets');
const License = require('../../models/license');
const Settings = require('../../models/settings');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Displays the roleplay profile of a user.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Select a user to view their profile. If not selected, shows your profile.')
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: false });

      const selectedUser = interaction.options.getUser('user') || interaction.user;
      if (!selectedUser || !selectedUser.username) {
        return interaction.reply({ content: 'Invalid user selected.', ephemeral: true });
      }

      const guildId = interaction.guild.id;
      const settings = await Settings.findOne({ guildId });
      const embedColor = '#4C7C58';

      const userId = selectedUser.id;
      const guild = interaction.guild;


      const license = await License.findOne({ userId }).catch(() => null);
      const licenseStatus = license?.status || 'Active';

      const vehicles = await Vehicle.find({ UserID: userId }).catch(() => []);
      const vehicleCount = vehicles.length;
      const vehicleList = vehicles.map(v => `• ${v.brand} ${v.model} (${v.year}) | Color: ${v.Color} | Plate: ${v.Plate}`).join('\n') || 'No registered vehicles';

      const apikey = "37a80efe-6341-4a19-b8f8-dcd656bf7add";
      const bloxlinkUrl = `https://api.blox.link/v4/public/guilds/${guild.id}/discord-to-roblox/${userId}`;
      const bloxlinkResponse = await axios.get(bloxlinkUrl, { headers: { 'Authorization': apikey } }).catch(() => null);

      let robloxID, robloxUsername, robloxProfileLink, robloxThumbnail;

      if (bloxlinkResponse?.status === 200 && bloxlinkResponse.data.robloxID) {
        robloxID = bloxlinkResponse.data.robloxID;
        robloxProfileLink = `https://www.roblox.com/users/${robloxID}/profile`;
      }

      if (robloxID) {
        const [robloxResponse, headshotResponse] = await Promise.all([
          axios.get(`https://users.roblox.com/v1/users/${robloxID}`).catch(() => null),
          axios.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxID}&size=150x150&format=Png`).catch(() => null),
        ]);

        if (robloxResponse?.status === 200) robloxUsername = robloxResponse.data.name;
        if (headshotResponse?.status === 200 && headshotResponse.data.data.length > 0) {
          robloxThumbnail = headshotResponse.data.data[0].imageUrl;
        }
      }

      const profileEmbed = new EmbedBuilder()
        .setTitle('Roleplay Profile')
        .setDescription(
`All information about the user has been provided below
**Roblox Username:** ${robloxUsername || 'N/A'}
**User ID:** ${userId}
**Registered Vehicles (${vehicleCount}):**

**License Status:** ${licenseStatus}`
        )
        .setThumbnail(robloxThumbnail || selectedUser.displayAvatarURL({ dynamic: true }) || '')
        .setColor(embedColor)
        .setFooter({ text: 'Greenville Hub™', iconURL: 'https://media.discordapp.net/attachments/1492958669200031814/1505251172150411466/kiaodogcircle_2_.png?ex=6a09f1e5&is=6a08a065&hm=cc710655fb31f9ddd95ec63a37b5b7d48d47ca0308917ecbf724b6415cc3b95d&=&format=webp&quality=lossless&width=818&height=818' });

      const buttons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`profile_vehicles_${userId}_page_1`)
            .setLabel('Registered Assets')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`profile_tickets_${userId}`)
            .setLabel('Public Service Records')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`profile_balance_${userId}`)
            .setLabel('Account Balance')
            .setStyle(ButtonStyle.Secondary),
        );

      await interaction.editReply({ embeds: [profileEmbed], components: [buttons] });

    } catch (error) {
      console.error('Error executing profile command:', error);
      await interaction.reply({ content: 'An error occurred while executing the command.', ephemeral: true });
    }
  },
};
