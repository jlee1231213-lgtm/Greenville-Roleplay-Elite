const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings');
const Warrant = require('../../models/warrant');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warrant')
    .setDescription('Issue a warrant for a user.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to issue the warrant for')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('offense')
        .setDescription('Offense committed')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Duration of the warrant (e.g., 24h, 7d)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warrant')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ });
    const guildId = interaction.guild.id;
    const member = interaction.member;

    const settings = await Settings.findOne({ guildId });
    if (!settings) return interaction.editReply({ content: 'Server settings not found!' });

    const leoRoleId = settings.leoRoleId;
    if (!leoRoleId) return interaction.editReply({ content: 'LEO role is not set in server settings.' });
    if (!member.roles.cache.has(leoRoleId)) return interaction.editReply({ content: 'You must have the LEO role to issue warrants.' });

    const targetUser = interaction.options.getUser('user');
    const offense = interaction.options.getString('offense');
    const time = interaction.options.getString('time');
    const reason = interaction.options.getString('reason');

    const newWarrant = new Warrant({
      UserID: targetUser.id,
      OfficerID: member.id,
      Offense: offense,
      Time: time,
      Reason: reason
    });

    await newWarrant.save();

    const dmEmbed = new EmbedBuilder()
      .setTitle(`${interaction.guild.name} | Roleplay Warrant`)
      .setDescription(`Greetings <@${targetUser.id}>, a warrant has been issued against you.

**Offense:** ${offense}
**Duration:** ${time}
**Reason:** ${reason}
**Issued by:** <@${member.id}>

Please comply with authorities to avoid further consequences.`)
      .setColor('#4C7C58')
      .setFooter({ text: 'Greenville Hub™', iconURL: 'https://media.discordapp.net/attachments/1492958669200031814/1505251172150411466/kiaodogcircle_2_.png?ex=6a09f1e5&is=6a08a065&hm=cc710655fb31f9ddd95ec63a37b5b7d48d47ca0308917ecbf724b6415cc3b95d&=&format=webp&quality=lossless&width=818&height=818' });

    targetUser.send({ embeds: [dmEmbed] }).catch(() => null);

    const confirmationEmbed = new EmbedBuilder()
      .setTitle('Warrant Issued')
      .setDescription(`You have successfully issued a warrant for ${targetUser.tag}.\n**Offense:** ${offense}\n**Duration:** ${time}\n**Reason:** ${reason}`)
      .setColor('#4C7C58')
      .setFooter({ text: 'Greenville Hub™', iconURL: 'https://media.discordapp.net/attachments/1492958669200031814/1505251172150411466/kiaodogcircle_2_.png?ex=6a09f1e5&is=6a08a065&hm=cc710655fb31f9ddd95ec63a37b5b7d48d47ca0308917ecbf724b6415cc3b95d&=&format=webp&quality=lossless&width=818&height=818' });

    await interaction.editReply({ embeds: [confirmationEmbed] });
  }
};
