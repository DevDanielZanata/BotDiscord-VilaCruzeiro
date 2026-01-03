const { REST, Routes } = require('discord.js');
const { config } = require('dotenv');
const fs = require('fs');

config();

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Substitua com o ID do seu app e do servidor
const clientId = '1386509742830260325';
const guildId = '1263156091378860042';

(async () => {
  try {
    console.log('🔄 Atualizando comandos...');
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );
    console.log('✅ Comandos registrados com sucesso!');
  } catch (error) {
    console.error(error);
  }
})();
