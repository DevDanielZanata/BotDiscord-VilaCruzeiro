const { SlashCommandBuilder } = require('discord.js');
const { handleBaquesMessage } = require('../utils/baquesManager');

const ALLOWED_COMMAND_CHANNEL_ID = '1441104299366289439';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('enviarlistabaque')
    .setDescription('Atualiza a Lista de Baques no canal designado.'),

  async execute(interaction) {
    if (interaction.channelId !== ALLOWED_COMMAND_CHANNEL_ID) {
      return interaction.reply({
        content: '❌ Este comando só pode ser usado no canal autorizado.',
        ephemeral: true,
      });
    }

    try {
      await handleBaquesMessage(interaction.client, interaction.user.id);
      await interaction.reply({
        content: '✅\n\n Lista enviada/atualizada com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao processar Lista de Baques:', error);
      const message = '❌ Não foi possível atualizar a Lista de Baques. Tente novamente.';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: message });
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    }
  },
};

