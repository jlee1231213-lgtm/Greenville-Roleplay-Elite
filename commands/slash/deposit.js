const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Eco = require('../../models/eco');
const Settings = require('../../models/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposit cash into your bank account.')
    .addStringOption(option =>
      option.setName('amount')
        .setDescription('Amount to deposit (or "all" to deposit all cash)')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ });
    const { guild, member } = interaction;

    const settings = await Settings.findOne({ guildId: guild.id });
    const embedColor = '#368f4c';

    if (!settings?.civiRoleId || !member.roles.cache.has(settings.civiRoleId)) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(embedColor)
            .setDescription("You must have the **Civilian** role to use this command.")
        ]
      });
    }

    let userEco = await Eco.findOne({ userId: interaction.user.id });
    if (!userEco) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(embedColor)
            .setDescription("You have no cash to deposit.")
        ]
      });
    }

    let amountInput = interaction.options.getString('amount').toLowerCase();
    let amount;

    if (amountInput === "all") {
      amount = userEco.cash;
      if (amount <= 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(embedColor)
              .setDescription("You have no cash to deposit.")
          ]
        });
      }
    } else {
      amount = parseInt(amountInput);
      if (isNaN(amount) || amount <= 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(embedColor)
              .setDescription("Please provide a valid amount to deposit.")
          ]
        });
      }
      if (userEco.cash < amount) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(embedColor)
              .setDescription("You do not have that much cash to deposit.")
          ]
        });
      }
    }

    userEco.cash -= amount;
    userEco.bank += amount;
    await userEco.save();

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('Deposit Successful')
      .setDescription(`You deposited **$${amount}** into your bank account.`);

    return interaction.editReply({ embeds: [embed] });
  }
};
