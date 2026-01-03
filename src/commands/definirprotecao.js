const { SlashCommandBuilder } = require('discord.js');
const {
  STATUS,
  getFavelaChoices,
  getFavelaName,
  setFavelaStatus,
  handleBaquesMessage,
} = require('../utils/baquesManager');

const ALLOWED_COMMAND_CHANNEL_ID = '1441104299366289439';
const FAVELA_CHOICES = getFavelaChoices();
const CHANNEL_ERROR_MESSAGE = '❌ Este comando só pode ser usado no canal autorizado.';
const GENERIC_ERROR_MESSAGE = '❌ Não foi possível atualizar essa favela. Tente novamente.';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('definirprotecao')
    .setDescription('Define a favela como protegida (🛡️).')
    .addStringOption(option =>
      option
        .setName('favela')
        .setDescription('Escolha a favela que está protegida.')
        .setRequired(true)
        .addChoices(...FAVELA_CHOICES)
    ),

  async execute(interaction) {
    if (interaction.channelId !== ALLOWED_COMMAND_CHANNEL_ID) {
      return interaction.reply({ content: CHANNEL_ERROR_MESSAGE, ephemeral: true });
    }

    const favelaId = interaction.options.getString('favela', true);

    try {
      const { status } = setFavelaStatus(favelaId, STATUS.PROTECAO.key);
      await handleBaquesMessage(interaction.client, interaction.user.id);

      const favelaName = getFavelaName(favelaId);
      await interaction.reply({
        content: `${status.emoji} ${favelaName} atualizado para ${status.label}.`,
      });
    } catch (error) {
      console.error('Erro no comando /definirprotecao:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: GENERIC_ERROR_MESSAGE });
      } else {
        await interaction.reply({ content: GENERIC_ERROR_MESSAGE, ephemeral: true });
      }
    }
  },
};

