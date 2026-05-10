const { 
  Events,
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  PermissionsBitField 
} = require('discord.js');
const discordTranscripts = require('@fluxbot/discord-html-transcripts');
const Ticket = require('../models/support');
const Settings = require('../models/settings');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {

    if (interaction.isStringSelectMenu() && interaction.customId === 'supportOptions') {
      const type = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`ticketModal_${type}`)
        .setTitle('Ticket Information');

      if (type === 'st') modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('helpNeeded')
          .setLabel('What help is needed?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      ));

      if (type === 'mr') modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reportDate')
            .setLabel('Date')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('staffUser')
            .setLabel('Staff User')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('proof')
            .setLabel('Proof (link/image)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        )
      );

      if (type === 'ma') modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reportDate')
            .setLabel('Date')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('civilianUser')
            .setLabel('Civilian User')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('proof')
            .setLabel('Proof (link/image)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
        )
      );

      await interaction.showModal(modal);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticketModal_')) {
      const settings = await Settings.findOne({ guildId: interaction.guild.id });
      const embedColor = settings?.embedcolor || '#368f4c';
      const type = interaction.customId.split('_')[1];
      const ownerId = interaction.user.id;
      const guild = interaction.guild;
      
      // Map type codes to human-readable labels
      const typeLabels = {
        'st': 'General Support',
        'mr': 'Staff Report',
        'ma': 'Civilian Report'
      };
      const selectedOption = typeLabels[type];
      
      // Create ticket name with user and selected option
      const userName = interaction.user.username;
      const ticketName = `${userName}-${selectedOption.toLowerCase().replace(/\s+/g, '-')}`;
      const roleId = type === 'st' ? '1417661969863020583' : '1417663103369478325';
      const everyone = guild.roles.everyone;

      const staffRole = await guild.roles.fetch(roleId).catch(() => null);
      const ownerMember = await guild.members.fetch(ownerId).catch(() => null);

      const permissionOverwrites = [
        { id: everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      ];
      if (ownerMember) permissionOverwrites.push({ id: ownerMember.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });
      if (staffRole) permissionOverwrites.push({ id: staffRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] });

      const ticketChannel = await guild.channels.create({
        name: ticketName,
        type: 0,
        permissionOverwrites,
      });

      let description = '';
      if (type === 'st') description = `**Option Selected:** General Support\n\n**Thank you for opening a ticket within *Greenville Roleplay Elite*. Please wait for the staff team to come and reply.**`;
      if (type === 'mr') description = `**Option Selected:** Staff Report

    **Thank you for opening up a Staff Report within *Greenville Roleplay Elite*. Please wait for the staff team to come and reply.**
`;
      if (type === 'ma') description = `**Option Selected:** Civilian Report

    **Thank you for opening up a Civilian Report within *Greenville Roleplay Elite*. Please wait for the staff team to come and reply.**`;

      const embed = new EmbedBuilder().setColor(embedColor).setDescription(description);
      
      // Add fields for General Support tickets
      if (type === 'st') {
        const today = new Date();
        const dateString = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
        embed.addFields(
          { name: 'Date:', value: `\`\`\`${dateString}\`\`\``, inline: true },
          { name: 'Question/Concern:', value: `\`\`\`${interaction.fields.getTextInputValue('helpNeeded')}\`\`\``, inline: false },
          { name: 'User:', value: `\`\`\`${interaction.user.tag}\`\`\``, inline: true }
        );
      }
      if (type === 'mr') {
        const reportDate = interaction.fields.getTextInputValue('reportDate');
        const staffUser = interaction.fields.getTextInputValue('staffUser');
        embed.addFields(
          { name: 'Date:', value: `\`\`\`${reportDate}\`\`\``, inline: true },
          { name: 'Staff User:', value: `\`\`\`${staffUser}\`\`\``, inline: false },
          { name: 'Proof:', value: `\`\`\`${interaction.fields.getTextInputValue('proof') || 'No proof provided'}\`\`\``, inline: false }
        );
      }
      if (type === 'ma') {
        const reportDate = interaction.fields.getTextInputValue('reportDate');
        const civilianUser = interaction.fields.getTextInputValue('civilianUser');
        embed.addFields(
          { name: 'Date:', value: `\`\`\`${reportDate}\`\`\``, inline: true },
          { name: 'Civilian User:', value: `\`\`\`${civilianUser}\`\`\``, inline: false },
          { name: 'Proof:', value: `\`\`\`${interaction.fields.getTextInputValue('proof') || 'No proof provided'}\`\`\``, inline: false }
        );
      }
      const claimBtn = new ButtonBuilder().setCustomId('claimTicket').setLabel('Claim').setStyle(ButtonStyle.Success);
      const closeBtn = new ButtonBuilder().setCustomId('closeTicket').setLabel('Close').setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder().addComponents(claimBtn, closeBtn);

      const msg = await ticketChannel.send({ content: `<@${ownerId}> <@1501214256442380470>`, embeds: [embed], components: [row] });
      await msg.pin();

      await Ticket.create({
        guildId: guild.id,
        channelId: ticketChannel.id,
        ownerId,
        roleId,
        type
      });

      const logChannel = guild.channels.cache.get('1417296613839339621');
      if (logChannel) logChannel.send({ embeds: [new EmbedBuilder().setColor(embedColor).setDescription(`<@${ownerId}> opened a **${selectedOption}** ticket in <#${ticketChannel.id}>.`)] });

      await interaction.reply({ content: 'Ticket opened!', ephemeral: true });
      return;
    }

    if (interaction.isButton()) {
      const ticketData = await Ticket.findOne({ channelId: interaction.channel.id });
      if (!ticketData) return;
      const logChannel = interaction.guild.channels.cache.get('1417296613839339621');
      const settings = await Settings.findOne({ guildId: interaction.guild.id });
      const embedColor = settings?.embedcolor || '#368f4c';

      if (interaction.customId === 'claimTicket') {
        if (ticketData.claimed) return interaction.reply({ content: 'Ticket already claimed!', ephemeral: true });
        if (!interaction.member.roles.cache.has(ticketData.roleId)) return interaction.reply({ content: 'You cannot claim this ticket.', ephemeral: true });

        ticketData.claimed = interaction.user.id;
        await ticketData.save();

        await interaction.channel.permissionOverwrites.edit(ticketData.roleId, { ViewChannel: false });
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder().setCustomId('unclaimTicket').setLabel('Unclaim').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('closeTicket').setLabel('Close').setStyle(ButtonStyle.Danger)
          );

        const msg = await interaction.channel.messages.fetch({ limit: 10 }).then(ms => ms.find(m => m.embeds.length));
        if (msg) msg.edit({ components: [row] });

        await interaction.reply({ content: `<@${interaction.user.id}> claimed the ticket.`, ephemeral: false });
        if (logChannel) logChannel.send({ embeds: [new EmbedBuilder().setColor(embedColor).setDescription(`<@${interaction.user.id}> claimed ticket <#${interaction.channel.id}>.`)] });
        return;
      }

      if (interaction.customId === 'unclaimTicket') {
        if (ticketData.claimed !== interaction.user.id) return interaction.reply({ content: 'You did not claim this ticket.', ephemeral: true });

        ticketData.claimed = null;
        await ticketData.save();

        await interaction.channel.permissionOverwrites.edit(ticketData.roleId, { ViewChannel: true });
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder().setCustomId('claimTicket').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('closeTicket').setLabel('Close').setStyle(ButtonStyle.Danger)
          );

        const msg = await interaction.channel.messages.fetch({ limit: 10 }).then(ms => ms.find(m => m.embeds.length));
        if (msg) msg.edit({ components: [row] });

        await interaction.reply({ content: `<@${interaction.user.id}> unclaimed the ticket.`, ephemeral: false });
        if (logChannel) logChannel.send({ embeds: [new EmbedBuilder().setColor(embedColor).setDescription(`<@${interaction.user.id}> unclaimed ticket <#${interaction.channel.id}>.`)] });
        return;
      }

      if (interaction.customId === 'closeTicket') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`confirmClose_${interaction.user.id}`).setLabel('Confirm Close').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`denyClose_${interaction.user.id}`).setLabel('Keep Open').setStyle(ButtonStyle.Secondary)
        );

        const requestEmbed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle('Close Request')
          .setDescription(`<@${ticketData.ownerId}>, <@${interaction.user.id}> requested to close this ticket.\n\nDo you want to close it?`);

        await interaction.reply({ content: `<@${ticketData.ownerId}>`, embeds: [requestEmbed], components: [row], ephemeral: false });
        return;
      }

      if (interaction.customId.startsWith('denyClose_')) {
        const requesterId = interaction.customId.split('_')[1];
        if (interaction.user.id !== ticketData.ownerId) {
          await interaction.reply({ content: 'Only the ticket creator can respond to this close request.', ephemeral: true });
          return;
        }

        await interaction.update({ content: `Close request denied by <@${interaction.user.id}> (requested by <@${requesterId}>).`, embeds: [], components: [] });
        return;
      }

      if (interaction.customId.startsWith('confirmClose_')) {
        const requesterId = interaction.customId.split('_')[1];
        if (interaction.user.id !== ticketData.ownerId) {
          await interaction.reply({ content: 'Only the ticket creator can confirm closing this ticket.', ephemeral: true });
          return;
        }

        const transcript = await discordTranscripts.createTranscript(interaction.channel);
        const closedAt = new Date();

        const finalEmbed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle('Ticket Closed')
          .setDescription('We hope we were able to help you.')
          .addFields(
            { name: 'Owner', value: `<@${ticketData.ownerId}>`, inline: true },
            { name: 'Requested by', value: `<@${requesterId}>`, inline: true },
            { name: 'Closed by', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Opened at', value: `<t:${Math.floor(ticketData.createdAt.getTime()/1000)}:F>`, inline: true },
            { name: 'Closed at', value: `<t:${Math.floor(closedAt.getTime()/1000)}:F>`, inline: true }
          );

        const ownerMember = await interaction.guild.members.fetch(ticketData.ownerId).catch(() => null);
        if (ownerMember) ownerMember.send({ embeds: [finalEmbed], files: [transcript] }).catch(() => null);

        if (logChannel) logChannel.send({ embeds: [finalEmbed], files: [transcript] });

        await Ticket.deleteOne({ channelId: interaction.channel.id });
        await interaction.update({ content: `<@${interaction.user.id}> approved close request from <@${requesterId}>. Closing ticket in 5 seconds...`, embeds: [], components: [] });
        setTimeout(() => interaction.channel.delete(), 5000);
      }
    }
  }
};
