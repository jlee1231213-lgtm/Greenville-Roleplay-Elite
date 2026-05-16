const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Eco = require('../../models/eco');
const Settings = require('../../models/settings');
const Ticket = require('../../models/tickets');

const TICKET_LOG_CHANNEL_ID = '1503157333704835093';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('payticket')
    .setDescription('Pay a ticket you have received.')
    .addStringOption(option =>
      option.setName('ticket')
        .setDescription('Select the ticket to pay')
        .setRequired(true)
        .setAutocomplete(true)),

  async execute(interaction) {
    await interaction.deferReply({ });
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const ticketId = interaction.options.getString('ticket');
    const ticket = await Ticket.findById(ticketId);
    const settings = await Settings.findOne({ guildId });
    const embedColor = '#4C7C58';

    if (!ticket) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(embedColor).setDescription('Ticket not found.')] });
    if (ticket.UserID !== userId) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(embedColor).setDescription('This ticket is not yours.')] });

    let userEco = await Eco.findOne({ userId });
    if (!userEco) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(embedColor).setDescription('You have no money to pay this ticket.')] });

    let totalBalance = userEco.cash + userEco.bank;
    if (totalBalance < ticket.Price) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(embedColor).setDescription(`You do not have enough funds to pay this ticket. Amount needed: $${ticket.Price}`)] });

    let remaining = ticket.Price;

    if (userEco.bank >= remaining) {
      userEco.bank -= remaining;
      remaining = 0;
    } else {
      remaining -= userEco.bank;
      userEco.bank = 0;
    }

    if (remaining > 0) {
      userEco.cash -= remaining;
    }

    await userEco.save();

    const embed = new EmbedBuilder()
      .setTitle('Ticket Paid')
      .setDescription(`You have successfully paid the ticket.\n**Offense:** ${ticket.Offense}\n**Amount Paid:** $${ticket.Price}`)
      .setColor(embedColor);

    const ticketLogChannelId = ticket.LogChannelID || TICKET_LOG_CHANNEL_ID;
    const ticketLogChannel = interaction.guild.channels.cache.get(ticketLogChannelId)
      || await interaction.client.channels.fetch(ticketLogChannelId).catch(() => null);
    if (ticketLogChannel?.isTextBased?.()) {
      const paidLogEmbed = new EmbedBuilder()
        .setTitle('Ticket Paid')
        .setDescription(`<@${userId}> paid their ticket.`)
        .addFields(
          { name: 'Offense', value: ticket.Offense, inline: false },
          { name: 'Amount Paid', value: `$${ticket.Price}`, inline: true },
          { name: 'Issued By', value: `<@${ticket.OfficerID}>`, inline: true }
        )
        .setColor(embedColor);

      let repliedToIssuedTicket = false;
      if (ticket.LogMessageID) {
        const issuedTicketMessage = await ticketLogChannel.messages.fetch(ticket.LogMessageID).catch(() => null);
        if (issuedTicketMessage) {
          await issuedTicketMessage.reply({ embeds: [paidLogEmbed] }).catch(() => null);
          repliedToIssuedTicket = true;
        }
      }

      if (!repliedToIssuedTicket) {
        await ticketLogChannel.send({ embeds: [paidLogEmbed] }).catch(() => null);
      }
    }

    await ticket.deleteOne();

    await interaction.editReply({ embeds: [embed] });
  }
};
