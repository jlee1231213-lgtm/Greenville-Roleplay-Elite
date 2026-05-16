const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const Settings = require('../../models/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Manage and configure the server settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embedColor = '#4C7C58';

    const embed = new EmbedBuilder()
      .setTitle('Server Settings Panel')
      .setDescription(
        `Welcome to the **Server Settings Panel**.  
        Here you can configure and manage important settings of your server.  

        Use the dropdown menu below to select a category and view or modify its settings.  
        Only members with administrator permissions can access this panel.  

        You can manage roles, embed templates, vehicle/trailer lists, vehicle caps, and set the default embed colors for messages.`
      )
      .setColor(embedColor)
      .setFooter({ text: 'Greenville Hub™', iconURL: 'https://media.discordapp.net/attachments/1492958669200031814/1505251172150411466/kiaodogcircle_2_.png?ex=6a09f1e5&is=6a08a065&hm=cc710655fb31f9ddd95ec63a37b5b7d48d47ca0308917ecbf724b6415cc3b95d&=&format=webp&quality=lossless&width=818&height=818' });

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('settings_menu')
        .setPlaceholder('Select a settings category to configure')
        .addOptions([
          { label: 'Trailer List', value: 'trailer_list', description: 'View or update the list of trailers available in the server' },
          { label: 'Vehicle Caps', value: 'vehicle_caps', description: 'Configure role-based vehicle caps' },
          { label: 'Embeds', value: 'embeds', description: 'Manage all custom embeds used across the server' },
          { label: 'Welcome Channel ID', value: 'welcomechannelid', description: 'Configure the welcome channel id.' },
          { label: 'Logging Channel ID', value: 'loggingchannelid', description: 'Configure the logging channel id.' },
          { label: 'Roles', value: 'roles', description: 'Configure server roles like Admin, Staff, and special categories' },
          { label: 'Embed Colors', value: 'embed_colors', description: 'Set the default color for embeds sent by the bot' },
        ])
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: false });
  }
};