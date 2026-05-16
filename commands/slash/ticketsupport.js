const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const Settings = require('../../models/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketsupport')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .setDescription('Open a ticket support dropdown.'),
  async execute(interaction) {
    await interaction.deferReply({ });
    const channelid = `${interaction.channel.id}`
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = settings?.embedcolor || '#4C7C58';


        const embed = new EmbedBuilder()
      .setDescription(`## <:Beige_flying_star:1500584694859694252> *__Greenville Hub - Support Center__* <:Beige_flying_star:1500584694859694252>
<:dasharrow:1500584579721990155> Welcome to the support section. To ensure your request is handled quickly and efficiently, please select the appropriate category below and provide clear, detailed information.

<:green_management:1500587061525221616>  \`General Support\`
Use this option for any general inquiries or assistance related to the server.

 <:former_staff:1500586001175675083> \`Staff Report\`
Select this option if you need to report a staff member for misconduct or inappropriate behavior. 
All reports are taken seriously and handled confidentially. Provide as much detail as possible, including evidence (screenshots, timestamps, etc.).

<:Civilian:1500584557986975874> \`Civilian Report\`
Use this option to report a non-staff member (civilian) for breaking server rules.
Please include clear evidence and a detailed description of the incident to help us review your report effectively.

-# <:dasharrow:1500584579721990155> **Please Note:** If you do not respond to your ticket within **24 Hours**, it will be __automatically__ closed.`)
  .setColor(embedColor)
      .setImage("https://media.discordapp.net/attachments/1502790559486705755/1502794173168877761/Screenshot_20260509_180725_Discord.jpg?ex=6a0101a3&is=69ffb023&hm=cf4ee71c0834161dc84044cee5e84fc2b5177e962b8d36b239447890a3fc6072&=&format=webp&width=2160&height=468")
      .setFooter({ text: `${interaction.guild.name}`, iconURL: `${interaction.guild.iconURL()}` });


    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('supportOptions')
          .setPlaceholder('╭  • 🌱•  Elite, Selections')
          .addOptions([
            {
              label: 'General Support',
              description: 'Open a ticket for general inquiries or assistance.',
              value: 'st',
            },
            {
              label: 'Staff Report',
              description: 'Report a staff member for misconduct.',
              value: 'mr',
            },
            {
              label: 'Civilian Report',
              description: 'Report a non-staff member for breaking rules.',
              value: 'ma',
            },
          ])
      );

    const supportChannel = interaction.guild.channels.cache.get(`${channelid}`);
    if (supportChannel) {
      await supportChannel.send({ embeds: [embed], components: [row] });
      await interaction.editReply({ content: 'The support ticket options have been sent.' });
    } else {
      await interaction.editReply({ content: 'Unable to find the support channel.' });
    }
  },
};