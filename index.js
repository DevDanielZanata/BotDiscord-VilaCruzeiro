require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Events,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  Colors
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
  }
} else {
  console.warn('⚠️ Pasta de comandos não encontrada em src/commands.');
}

const eventsPath = path.join(__dirname, 'src', 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }
} else {
  console.warn('⚠️ Pasta de eventos não encontrada em src/events.');
}

client.once('ready', async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  // Envia botão "Verificar" ao canal fixo
  const canal = await client.channels.fetch('1418246062694727783'); // <<< Substitua pelo ID real
  const botaoVerificar = new ButtonBuilder()
    .setCustomId('abrirModal')
    .setLabel('✅ Iniciar Verificação')
    .setStyle(ButtonStyle.Primary)
    // .setEmoji('🔐');

  const row = new ActionRowBuilder().addComponents(botaoVerificar);

  // Embed estilizado para a mensagem de verificação
  const embedVerificacao = new EmbedBuilder()
    .setTitle('🔐 Sistema de Verificação')
    .setDescription('Bem-vindo ao nosso servidor! Para acessar todos os canais, você precisa se verificar primeiro.')
    .addFields(
      { name: '📋 O que você precisa:', value: '• Seu nome completo\n• Seu ID de identificação', inline: false },
      { name: '⏱️ Tempo de resposta:', value: '• Geralmente em poucos minutos', inline: false },
      { name: '🎯 Após a verificação:', value: '• Acesso a todos os canais\n• Cargo de membro verificado\n• Nickname personalizado', inline: false }
    )
    .setColor(Colors.Blue)
    .setThumbnail(client.user.displayAvatarURL())
    .setFooter({ text: 'Clique no botão abaixo para começar', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  await canal.send({
    embeds: [embedVerificacao],
    components: [row],
  });
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Erro ao executar o comando.', ephemeral: true });
    }
  }

  if (interaction.isButton() && interaction.customId === 'abrirModal') {
    // Abre o modal quando o botão for clicado
    const modal = new ModalBuilder()
      .setCustomId('verificacaoModal')
      .setTitle('🔐 Formulário de Verificação');

    const nomeInput = new TextInputBuilder()
      .setCustomId('nomeInput')
      .setLabel('👤 Seu Nome')
      .setPlaceholder('Ex.: João Silva')
      .setRequired(true)
      .setStyle(TextInputStyle.Short)
      .setMinLength(3)
      .setMaxLength(32);

    const idInput = new TextInputBuilder()
      .setCustomId('idInput')
      .setLabel('🆔 Seu ID')
      .setPlaceholder('Ex.: 3085')
      .setRequired(true)
      .setStyle(TextInputStyle.Short)
      .setMinLength(1)
      .setMaxLength(10);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nomeInput),
      new ActionRowBuilder().addComponents(idInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'verificacaoModal') {
    const nome = interaction.fields.getTextInputValue('nomeInput');
    const id = interaction.fields.getTextInputValue('idInput');
    const pedidosChannel = interaction.guild.channels.cache.find(ch => ch.name === 'aceitar-set');

    if (!pedidosChannel) return interaction.reply({ content: '❌ Canal de pedidos não encontrado!', ephemeral: true });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}_${nome}_${id}`).setLabel('✅ Aprovar').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId(`recusar_${interaction.user.id}`).setLabel('❌ Recusar').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );

    // Embed estilizado para o pedido de verificação
    const embedPedido = new EmbedBuilder()
      .setTitle('🔒 Novo Pedido de Verificação')
      .setDescription('Um novo usuário solicitou verificação no servidor.')
      .addFields(
        { name: '👤 Nome Completo', value: `**${nome}**`, inline: true },
        { name: '🆔 ID de Identificação', value: `**${id}**`, inline: true },
        { name: '👨‍💼 Usuário Discord', value: `<@${interaction.user.id}>`, inline: true },
        { name: '📅 Data do Pedido', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setColor(Colors.Orange)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'Use os botões abaixo para aprovar ou recusar', iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    await pedidosChannel.send({
      embeds: [embedPedido],
      components: [row]
    });

    // Embed de confirmação para o usuário
    const embedConfirmacao = new EmbedBuilder()
      .setTitle('✅ Pedido Enviado com Sucesso!')
      .setDescription('Seu pedido de verificação foi enviado para nossa equipe de moderação.')
      .addFields(
        { name: '📋 Informações Enviadas', value: `**Nome:** ${nome}\n**ID:** ${id}`, inline: false },
        { name: '⏱️ Tempo de Resposta', value: 'Nossa equipe irá analisar seu pedido em breve.', inline: false }
      )
      .setColor(Colors.Green)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'Você receberá uma notificação quando for aprovado', iconURL: interaction.guild.iconURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embedConfirmacao], ephemeral: true });
  }

  // Handler para botão de justificativa de reunião
  if (interaction.isButton() && interaction.customId.startsWith('justificativa_')) {
    const dataHoraEncoded = interaction.customId.replace('justificativa_', '');
    const dataHora = Buffer.from(dataHoraEncoded, 'base64').toString('utf-8');
    
    const modal = new ModalBuilder()
      .setCustomId(`justificativaModal_${dataHoraEncoded}`)
      .setTitle('📝 Justificativa de Ausência');

    const motivoInput = new TextInputBuilder()
      .setCustomId('motivoInput')
      .setLabel('Motivo da Ausência')
      .setPlaceholder('Explique o motivo pelo qual não poderá comparecer à reunião...')
      .setRequired(true)
      .setStyle(TextInputStyle.Paragraph)
      .setMinLength(10)
      .setMaxLength(1000);

    modal.addComponents(
      new ActionRowBuilder().addComponents(motivoInput)
    );

    await interaction.showModal(modal);
  }

  // Handler para modal de justificativa
  if (interaction.isModalSubmit() && interaction.customId.startsWith('justificativaModal_')) {
    const dataHoraEncoded = interaction.customId.replace('justificativaModal_', '');
    const dataHora = Buffer.from(dataHoraEncoded, 'base64').toString('utf-8');
    const motivo = interaction.fields.getTextInputValue('motivoInput');
    const membro = interaction.member;
    const nome = membro ? (membro.displayName || membro.user.username) : interaction.user.username;

    const justificativaChannel = await interaction.client.channels.fetch('1422580726183886929');
    
    if (!justificativaChannel) {
      return interaction.reply({ content: '❌ Canal de justificativas não encontrado!', ephemeral: true });
    }

    const user = interaction.user;
    const mensagemJustificativa = `**Nome:** <@${user.id}>\n**Tempo:** Reunião Dia - ${dataHora}\n**Motivo:** ${motivo}`;

    await justificativaChannel.send(mensagemJustificativa);

    const embedConfirmacao = new EmbedBuilder()
      .setTitle('✅ Justificativa Enviada')
      .setDescription('Sua justificativa foi registrada com sucesso!')
      .addFields(
        { name: '📅 Data da Reunião', value: dataHora, inline: false },
        { name: '📝 Sua Justificativa', value: motivo.substring(0, 1024), inline: false }
      )
      .setColor(Colors.Orange)
      .setTimestamp();

    await interaction.reply({ embeds: [embedConfirmacao], ephemeral: true });
  }

  // Handler para botão de presença
  if (interaction.isButton() && interaction.customId.startsWith('presenca_')) {
    const dataHoraEncoded = interaction.customId.replace('presenca_', '');
    const dataHora = Buffer.from(dataHoraEncoded, 'base64').toString('utf-8');
    const membro = interaction.member;
    const user = interaction.user;
    const nome = membro ? (membro.displayName || membro.user.username) : user.username;
    const tempo = new Date().toLocaleString('pt-BR', { 
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short'
    });

    const presencaChannel = await interaction.client.channels.fetch('1446606810323750953');
    
    if (!presencaChannel) {
      return interaction.reply({ content: '❌ Canal de presença não encontrado!', ephemeral: true });
    }

    const embedPresenca = new EmbedBuilder()
      .setTitle('✅ Presença Confirmada')
      .setDescription(`Membro confirmou presença na reunião.`)
      .addFields(
        { name: '👤 Nome', value: nome, inline: true },
        { name: '🆔 Usuário', value: `<@${user.id}>`, inline: true },
        { name: '📅 Data da Reunião', value: dataHora, inline: false },
        { name: '⏰ Confirmado em', value: tempo, inline: false }
      )
      .setColor(Colors.Green)
      .setThumbnail(user.displayAvatarURL())
      .setFooter({ text: 'Presença registrada', iconURL: interaction.guild?.iconURL() || undefined })
      .setTimestamp();

    await presencaChannel.send({ embeds: [embedPresenca] });

    const embedConfirmacao = new EmbedBuilder()
      .setTitle('✅ Presença Marcada')
      .setDescription('Sua presença foi registrada com sucesso!')
      .addFields(
        { name: '📅 Data da Reunião', value: dataHora, inline: false }
      )
      .setColor(Colors.Green)
      .setTimestamp();

    await interaction.reply({ embeds: [embedConfirmacao], ephemeral: true });
  }

  if (interaction.isButton()) {
    const [acao, userId, ...rest] = interaction.customId.split('_');
    const nome = rest.slice(0, -1).join('_');
    const id = rest[rest.length - 1];

    if (acao === 'aprovar') {
      const membro = await interaction.guild.members.fetch(userId);
      await membro.setNickname(`RAD | ${nome} - ${id}`);
      await membro.roles.add(['1418246429914300458', '1455231362218065970']);
      
      // Embed de aprovação para o canal de pedidos
      const embedAprovado = new EmbedBuilder()
        .setTitle('✅ Verificação Aprovada')
        .setDescription(`O usuário foi verificado com sucesso!`)
        .addFields(
          { name: '👤 Usuário', value: `<@${userId}>`, inline: true },
          { name: '👨‍💼 Aprovado por', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📅 Data da Aprovação', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setColor(Colors.Green)
        .setThumbnail(membro.user.displayAvatarURL())
        .setFooter({ text: 'Verificação concluída com sucesso', iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      await interaction.update({ embeds: [embedAprovado], components: [] });

      // Notificação para o usuário aprovado
      try {
        const embedNotificacao = new EmbedBuilder()
          .setTitle('🎉 Verificação Aprovada!')
          .setDescription('Parabéns! Sua verificação foi aprovada pela nossa equipe.')
          .addFields(
            { name: '✅ Status', value: 'Verificação aprovada com sucesso', inline: true },
            { name: '👨‍💼 Aprovado por', value: `<@${interaction.user.id}>`, inline: true },
            { name: '🎯 O que mudou', value: '• Cargo de membro verificado\n• Nickname personalizado\n• Acesso a todos os canais', inline: false }
          )
          .setColor(Colors.Green)
          .setThumbnail(interaction.guild.iconURL())
          .setFooter({ text: 'Bem-vindo ao servidor!', iconURL: interaction.guild.iconURL() })
          .setTimestamp();

        await membro.send({ embeds: [embedNotificacao] }).catch(() => {
          console.log('Não foi possível enviar DM para o usuário');
        });
      } catch (error) {
        console.log('Erro ao enviar DM:', error);
      }
    }

    if (acao === 'recusar') {
      // Embed de recusa para o canal de pedidos
      const embedRecusado = new EmbedBuilder()
        .setTitle('❌ Verificação Recusada')
        .setDescription(`O pedido de verificação foi recusado.`)
        .addFields(
          { name: '👤 Usuário', value: `<@${userId}>`, inline: true },
          { name: '👨‍💼 Recusado por', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📅 Data da Recusa', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setColor(Colors.Red)
        .setFooter({ text: 'Pedido recusado pela moderação', iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      await interaction.update({ embeds: [embedRecusado], components: [] });

      // Notificação para o usuário recusado
      try {
        const membro = await interaction.guild.members.fetch(userId);
        const embedNotificacaoRecusa = new EmbedBuilder()
          .setTitle('❌ Verificação Recusada')
          .setDescription('Infelizmente seu pedido de verificação foi recusado pela nossa equipe.')
          .addFields(
            { name: '❌ Status', value: 'Verificação recusada', inline: true },
            { name: '👨‍💼 Recusado por', value: `<@${interaction.user.id}>`, inline: true },
            { name: '💡 O que fazer', value: '• Verifique se as informações estão corretas\n• Entre em contato com a moderação\n• Tente novamente em alguns minutos', inline: false }
          )
          .setColor(Colors.Red)
          .setThumbnail(interaction.guild.iconURL())
          .setFooter({ text: 'Entre em contato com a moderação para mais informações', iconURL: interaction.guild.iconURL() })
          .setTimestamp();

        await membro.send({ embeds: [embedNotificacaoRecusa] }).catch(() => {
          console.log('Não foi possível enviar DM para o usuário');
        });
      } catch (error) {
        console.log('Erro ao enviar DM:', error);
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
