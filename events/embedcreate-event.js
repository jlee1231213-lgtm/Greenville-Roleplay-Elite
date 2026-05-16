const { EmbedBuilder, MessageFlags } = require('discord.js');
const Settings = require('../models/settings');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        try {
            if (interaction.isModalSubmit() && interaction.customId === 'workembed') {
                await interaction.deferReply({ ephemeral: true });

                const guildName = interaction.guild?.name || "the server";
                const guildIcon = interaction.guild?.iconURL() || null;

                const description = interaction.fields.getTextInputValue('description');
                const thumbnailUrl = interaction.fields.getTextInputValue('thumbnail') || null;
                const imageUrl = interaction.fields.getTextInputValue('image') || null;
                const title = interaction.fields.getTextInputValue('title') || null;

                if (!description) {
                    return interaction.editReply({ content: 'Description is required.' });
                }


                const settings = await Settings.findOne({ guildId: interaction.guild.id });
                const embedColor = '#4C7C58';

                const embed = new EmbedBuilder()
                    .setDescription(description)
                    .setColor(embedColor)
                    .setFooter({ text: 'Greenville Hub™', iconURL: 'https://media.discordapp.net/attachments/1492958669200031814/1505251172150411466/kiaodogcircle_2_.png?ex=6a09f1e5&is=6a08a065&hm=cc710655fb31f9ddd95ec63a37b5b7d48d47ca0308917ecbf724b6415cc3b95d&=&format=webp&quality=lossless&width=818&height=818' });

                if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
                if (imageUrl) embed.setImage(imageUrl);
                if (title) embed.setTitle(title);

                await interaction.channel.send({ embeds: [embed] });

                await interaction.editReply({ content: 'Embed successfully created!', flags: MessageFlags.Ephemeral });

                console.log('Embed sent successfully.');
            }
        } catch (error) {
            console.error('Error processing modal submission:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: 'An error occurred while processing your request.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true });
            }
        }
    },
};
