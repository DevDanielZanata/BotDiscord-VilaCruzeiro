const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, Colors, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const ROLE_ID = '1418246429914300458';
const JUSTIFICATIVA_CHANNEL_ID = '1422580726183886929';
const PRESENCA_CHANNEL_ID = '1446606810323750953';
const ALLOWED_COMMAND_CHANNEL_ID = '1446606810323750953';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('enviarreuniao')
    .setDescription('Envia notificação de reunião para membros com cargo específico.')
    .addStringOption(option =>
      option
        .setName('data')
        .setDescription('Data e hora da reunião (ex: 25/12 20:00)')
        .setRequired(true)
    ),

  async execute(interaction) {
    // Verificar se o comando está sendo usado no canal permitido
    if (interaction.channelId !== ALLOWED_COMMAND_CHANNEL_ID) {
      return interaction.reply({ 
        content: '❌ Este comando só pode ser usado no canal autorizado.', 
        ephemeral: true 
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const dataHora = interaction.options.getString('data', true);
    const guild = interaction.guild;

    try {
      // Buscar o cargo
      const role = await guild.roles.fetch(ROLE_ID);
      if (!role) {
        return interaction.editReply({ content: '❌ Cargo não encontrado!' });
      }

      // Buscar todos os membros com o cargo
      const members = await guild.members.fetch();
      const membersWithRole = members.filter(member => 
        member.roles.cache.has(ROLE_ID) && !member.user.bot
      );

      if (membersWithRole.size === 0) {
        return interaction.editReply({ content: '❌ Nenhum membro encontrado com este cargo!' });
      }

      // Criar embed da reunião
      const embedReuniao = new EmbedBuilder()
        .setTitle('📅 Reunião Agendada')
        .setDescription(`Haverá uma reunião na data e hora prevista.`)
        .addFields(
          { name: '📆 Data e Hora', value: `**${dataHora}**`, inline: false },
          { name: '👥 Participantes', value: `Todos os membros com o cargo ${role.name}`, inline: false }
        )
        .setColor(Colors.Blue)
        .setThumbnail(guild.iconURL())
        .setFooter({ text: 'Por favor, confirme sua presença ou justifique sua ausência', iconURL: guild.iconURL() })
        .setTimestamp();

      // Armazenar data da reunião no customId dos botões para uso posterior
      // Usando base64 para evitar problemas com caracteres especiais
      const dataHoraEncoded = Buffer.from(dataHora).toString('base64');
      
      const buttonJustificativa = new ButtonBuilder()
        .setCustomId(`justificativa_${dataHoraEncoded}`)
        .setLabel('Explicar Justificativa')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('📝');

      const buttonPresenca = new ButtonBuilder()
        .setCustomId(`presenca_${dataHoraEncoded}`)
        .setLabel('Marcar Presença')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');

      const row = new ActionRowBuilder()
        .addComponents(buttonJustificativa, buttonPresenca);

      // Enviar DM para cada membro
      let sucessos = 0;
      let falhas = 0;

      for (const member of membersWithRole.values()) {
        try {
          await member.send({
          embeds: [embedReuniao],
          components: [row]
          });
          sucessos++;
        } catch (error) {
          console.error(`Erro ao enviar DM para ${member.user.tag}:`, error);
          falhas++;
        }
      }

      await interaction.editReply({
        content: `✅ Notificação enviada!\n📊 **Estatísticas:**\n• ✅ Enviadas: ${sucessos}\n• ❌ Falhas: ${falhas}\n• 📅 Data/Hora: ${dataHora}`
      });

    } catch (error) {
      console.error('Erro no comando /enviarreuniao:', error);
      await interaction.editReply({ content: '❌ Erro ao executar o comando. Verifique os logs.' });
    }
  },
};

