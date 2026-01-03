const { Events } = require('discord.js');

const GUILD_ID = process.env.GUILD_ID || '1414045666946322538';

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    const commandsJSON = client.commands.map(command => command.data.toJSON());
    try {
      if (GUILD_ID) {
        const guild = await client.guilds.fetch(GUILD_ID);
        await guild.commands.set(commandsJSON);
        console.log(`✅ Comandos registrados na guild ${guild.name} (${guild.id}).`);
      } else {
        await client.application.commands.set(commandsJSON);
        console.log('✅ Comandos de slash registrados globalmente (sem GUILD_ID definido).');
      }
    } catch (error) {
      console.error('Erro ao registrar comandos automaticamente:', error);
    }
  },
};

