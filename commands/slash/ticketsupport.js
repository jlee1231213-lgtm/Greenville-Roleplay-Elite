const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const { greenvilleFooter } = require('../../utils/embedFooter');
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
      .setDescription(`# > <a:GVH_beatinghearts:1504244806803783717> *Greenville Hub - __Support Center__* <a:GVH_beatinghearts:1504244806803783717>
<a:GVH_animatedarrow:1504244827062010131> Welcome to the support section. To ensure your request is handled quickly and efficiently, please select the appropriate category below and provide clear, detailed information.

<:green_management:1505053416630648832>   \`General Support\`
Use this option for any general inquiries or assistance related to the server.

 <:former_staff:1505053433659527290>  \`Staff Report\`
Select this option if you need to report a staff member for misconduct or inappropriate behavior. 
All reports are taken seriously and handled confidentially. Provide as much detail as possible, including evidence (screenshots, timestamps, etc.).

<:gvruuser:1505053458955505734>  \`Civilian Report\`
Use this option to report a non-staff member (civilian) for breaking server rules.
Please include clear evidence and a detailed description of the incident to help us review your report effectively.

-# <a:GVH_animatedarrow:1504244827062010131> **Please Note:** If you do not respond to your ticket within **24 Hours**, it will be __automatically__ closed.`)
      .setColor(embedColor)
      .setImage("https://media.discordapp.net/attachments/1492958669200031814/1505240193949499504/image.png?ex=6a09e7ac&is=6a08962c&hm=1f547b1a5aba54e28dd75919f1be64bfd1414688b954c7ed832362b0a5bb2963&=&format=webp&quality=lossless&width=2320&height=768")
      .setFooter(greenvilleFooter(interaction));


    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('supportOptions')
          .setPlaceholder('╭ •  Hub, Selection(s)')
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
