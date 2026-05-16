const { 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    EmbedBuilder 
} = require('discord.js');
const { greenvilleFooter, GREENVILLE_FOOTER_ICON_URL } = require('../utils/embedFooter');
const Settings = require('../models/settings');
const { resolveWelcomeEmbed } = require('./welcome-event');
const { resolveStartupEmbed } = require('../commands/slash/startup');

async function updateSetting(guildId, field, value) {
    let doc = await Settings.findOne({ guildId });
    if (!doc) doc = new Settings({ guildId });
    if (typeof value === 'object' && !Array.isArray(value)) {
        doc.set(field, value);
        doc.markModified(field);
    } else doc[field] = value;
    await doc.save();
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.guild) return;
        const guildId = interaction.guild.id;
        const settings = await Settings.findOne({ guildId });
        const color = '#368f4c';

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'settings_menu') {
                switch (interaction.values[0]) {
                    case 'roles': {
                        const embed = new EmbedBuilder()
                            .setTitle('Roles Configuration')
                            .setDescription('Select a role category to configure (single role ID per category)')
                            .setColor(color)
                            .setThumbnail(GREENVILLE_FOOTER_ICON_URL).setFooter(greenvilleFooter(interaction));
                        const row = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('roles_menu')
                                .setPlaceholder('Select role category')
                                .addOptions([
                                    { label: 'Law Enforcement Officers', value: 'leoRoleId' },
                                    { label: 'Civilian', value: 'civiRoleId' },
                                    { label: 'Early Access', value: 'eaRoleId' },
                                    { label: 'Staff', value: 'staffRoleId' },
                                    { label: 'Administrators', value: 'adminRoleId' },
                                    { label: 'Staffing Department', value: 'staffingDepartmentRoleId' },
                                ])
                        );
                        return interaction.update({ embeds: [embed], components: [row], ephemeral: true });
                    }

                    case 'welcomechannelid': {
                        const modal = new ModalBuilder()
                            .setCustomId('welcome_channel_modal')
                            .setTitle('Set Welcome Channel ID')
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId('welcome_channel_input')
                                        .setLabel('Welcome Channel ID')
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                )
                            );
                        return interaction.showModal(modal);
                    }

                    case 'loggingchannelid': {
                        const modal = new ModalBuilder()
                            .setCustomId('logging_channel_modal')
                            .setTitle('Set Logging Channel ID')
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId('logging_channel_input')
                                        .setLabel('Logging Channel ID')
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                )
                            );
                        return interaction.showModal(modal);
                    }

                    case 'embeds': {
                        const embed = new EmbedBuilder()
                            .setTitle('Embeds Configuration')
                            .setDescription('Select an embed category to configure')
                            .setColor(color)
                            .setThumbnail(GREENVILLE_FOOTER_ICON_URL).setFooter(greenvilleFooter(interaction));
                        const row = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('embeds_menu')
                                .setPlaceholder('Select embed category')
                                .addOptions([
                                    { label: 'Startup Embed', value: 'startupEmbed' },
                                    { label: 'EA Embed', value: 'eaEmbed' },
                                    { label: 'Giveaway Embed', value: 'giveawayEmbed' },
                                    { label: 'Welcome Embed', value: 'welcomeEmbed' },
                                    { label: 'Cohost Embed', value: 'cohostEmbed' },
                                    { label: 'Release Embed', value: 'releaseEmbed' },
                                    { label: 'Reinvites Embed', value: 'reinvitesEmbed' },
                                    { label: 'Over Embed', value: 'overEmbed' },
                                    { label: 'Hate Pings Embed', value: 'hatepingsEmbed' },
                                    { label: 'Supervise Embed', value: 'superviseEmbed' },
                                ])
                        );
                        return interaction.update({ embeds: [embed], components: [row], ephemeral: true });
                    }

                    case 'embed_colors': {
                        const modal = new ModalBuilder()
                            .setCustomId('embed_color_modal')
                            .setTitle('Set Embed Color')
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId('embed_color_input')
                                        .setLabel('Hex Color (e.g., #FF0000)')
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                )
                            );
                        return interaction.showModal(modal);
                    }

                    case 'vehicle_list':
                    case 'trailer_list': {
                        const type = interaction.values[0] === 'vehicle_list' ? 'vehiclelist' : 'trailerlist';
                        const currentList = settings?.[type] || 'No items yet';
                        const embed = new EmbedBuilder()
                            .setTitle(`${type.replace('list','').toUpperCase()} List`)
                            .setDescription(`Current items:\n${currentList}\nSelect an action below:`)
                            .setColor(color)
                            .setThumbnail(GREENVILLE_FOOTER_ICON_URL).setFooter(greenvilleFooter(interaction));
                        const row = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`${type}_menu`)
                                .setPlaceholder('Choose action')
                                .addOptions([
                                    { label: 'Add', value: 'add' },
                                    { label: 'Remove', value: 'remove' },
                                ])
                        );
                        return interaction.update({ embeds: [embed], components: [row], ephemeral: true });
                    }
                }
            }

            const roleFields = ['leoRoleId','civiRoleId','eaRoleId','staffRoleId','adminRoleId','staffingDepartmentRoleId'];
            if (roleFields.includes(interaction.values[0])) {
                const field = interaction.values[0];
                const modal = new ModalBuilder().setCustomId(`role_modal_${field}`).setTitle('Set Role ID');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('role_input_1')
                            .setLabel('Role ID')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );
                return interaction.showModal(modal);
            }

            const embedFields = ['startupEmbed','eaEmbed','giveawayEmbed','setupEmbed','welcomeEmbed','cohostEmbed','cohostendEmbed','releaseEmbed','reinvitesEmbed','overEmbed','hatepingsEmbed','superviseEmbed'];
            if (embedFields.includes(interaction.values[0])) {
                const field = interaction.values[0];
                const currentEmbed = field === 'welcomeEmbed'
                    ? resolveWelcomeEmbed(settings?.[field])
                    : field === 'startupEmbed'
                        ? resolveStartupEmbed(settings?.[field])
                        : settings?.[field] || {};
                const currentTitle = (currentEmbed.title || '').slice(0, 256);
                const currentDescription = (currentEmbed.description || '').slice(0, 4000);
                const currentImage = (currentEmbed.image || '').slice(0, 4000);
                const modal = new ModalBuilder().setCustomId(`embed_modal_${field}`).setTitle('Set Embed');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('title_input')
                            .setLabel('Title')
                            .setStyle(TextInputStyle.Short)
                            .setValue(currentTitle)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('desc_input')
                            .setLabel('Description')
                            .setStyle(TextInputStyle.Paragraph)
                            .setValue(currentDescription)
                            .setRequired(false)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('image_input')
                            .setLabel('Image URL')
                            .setStyle(TextInputStyle.Short)
                            .setValue(currentImage)
                            .setRequired(false)
                    )
                );
                return interaction.showModal(modal);
            }

            if (interaction.customId === 'vehiclelist_menu' || interaction.customId === 'trailerlist_menu') {
                const type = interaction.customId.includes('vehicle') ? 'vehiclelist' : 'trailerlist';
                const action = interaction.values[0];
                const modal = new ModalBuilder().setCustomId(`${type}_${action}`).setTitle(`${action.toUpperCase()} ${type}`);
                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('list_input')
                            .setLabel('Enter each item on a new line')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );
                return interaction.showModal(modal);
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('role_modal_')) {
                const field = interaction.customId.replace('role_modal_','');
                const roleId = interaction.fields.getTextInputValue('role_input_1')?.trim();
                if (!roleId) return interaction.reply({ content: 'A role ID is required!', ephemeral: true });
                await updateSetting(guildId, field, roleId);
                return interaction.reply({ content: 'Role updated successfully!', ephemeral: true });
            }

            if (interaction.customId === 'welcome_message_modal') {
                const message = interaction.fields.getTextInputValue('welcome_message_input');
                await updateSetting(guildId, 'welcomemessage', message);
                return interaction.reply({ content: 'Welcome message updated successfully!', ephemeral: true });
            }
            if (interaction.customId === 'welcome_channel_modal') {
                const channel = interaction.fields.getTextInputValue('welcome_channel_input');
                await updateSetting(guildId, 'welcomechannelid', channel);
                return interaction.reply({ content: `Welcome channel set to <#${channel}>`, ephemeral: true });
            }
            if (interaction.customId === 'logging_channel_modal') {
                const channel = interaction.fields.getTextInputValue('logging_channel_input');
                await updateSetting(guildId, 'logChannelId', channel);
                return interaction.reply({ content: `Logging channel set to <#${channel}>`, ephemeral: true });
            }

            if (interaction.customId.startsWith('embed_modal_')) {
                const field = interaction.customId.replace('embed_modal_','');
                const title = interaction.fields.getTextInputValue('title_input');
                const description = interaction.fields.getTextInputValue('desc_input') || null;
                const image = interaction.fields.getTextInputValue('image_input') || null;
                await updateSetting(guildId, field, { title, description, image });
                return interaction.reply({ content: 'Embed updated successfully!', ephemeral: true });
            }

            if (interaction.customId === 'embed_color_modal') {
                const colorInput = interaction.fields.getTextInputValue('embed_color_input');
                await updateSetting(guildId, 'embedcolor', colorInput);
                return interaction.reply({ content: `Embed color set to ${colorInput}`, ephemeral: true });
            }

            if (interaction.customId.endsWith('_add') || interaction.customId.endsWith('_remove')) {
                const type = interaction.customId.includes('vehicle') ? 'vehiclelist' : 'trailerlist';
                const items = interaction.fields.getTextInputValue('list_input').split('\n').map(i=>i.trim()).filter(i=>i);
                const current = (await Settings.findOne({ guildId }))?.[type]?.split('\n') || [];
                if (interaction.customId.endsWith('_add')) {
                    await updateSetting(guildId, type, [...current, ...items].join('\n'));
                    return interaction.reply({ content: 'Items added successfully!', ephemeral: true });
                } else {
                    await updateSetting(guildId, type, current.filter(i=>!items.includes(i)).join('\n'));
                    return interaction.reply({ content: 'Items removed successfully!', ephemeral: true });
                }
            }
        }
    }
};
