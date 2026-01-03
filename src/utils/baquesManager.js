const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data.json');
const TARGET_CHANNEL_ID = '1419761291853037699';

const STATUS = {
  BAQUEADOS: { key: 'BAQUEADOS', emoji: '✅', label: 'BAQUEADOS' },
  DEVOLUCAO: { key: 'DEVOLUCAO', emoji: '⚠️', label: 'DEVOLUÇÃO' },
  PODE_BAQUEAR: { key: 'PODE_BAQUEAR', emoji: '❗', label: 'PODE BAQUEAR' },
  DEVOLVER: { key: 'DEVOLVER', emoji: '❌', label: 'DEVOLVER' },
  PROTECAO: { key: 'PROTECAO', emoji: '🛡️', label: 'PROTEÇÃO' },
};

const FAVELAS = [
  { id: 'vila_vintem', name: 'VilaVintém', defaultStatus: STATUS.BAQUEADOS.key },
  { id: 'Penha', name: 'Penha', defaultStatus: STATUS.DEVOLVER.key },
  { id: 'complexo_mali', name: 'Complexo De Mali', defaultStatus: STATUS.PODE_BAQUEAR.key },
  { id: 'chapadao', name: 'Chapadão', defaultStatus: STATUS.PODE_BAQUEAR.key },
  { id: 'cdd', name: 'CDD', defaultStatus: STATUS.DEVOLUCAO.key },
  { id: 'rodo', name: 'Rodo', defaultStatus: STATUS.BAQUEADOS.key },
  { id: 'antares', name: 'Antares', defaultStatus: STATUS.DEVOLVER.key },
  { id: 'complexo_alemao', name: 'ComplexoDoAlemão', defaultStatus: STATUS.PODE_BAQUEAR.key },
  { id: 'cpx_arte', name: 'Cpx Da ARTE', defaultStatus: STATUS.PODE_BAQUEAR.key },
  { id: 'Curral', name: 'Chatuba', defaultStatus: STATUS.BAQUEADOS.key },
  { id: 'jacarezinho', name: 'Jacarezinho', defaultStatus: STATUS.PODE_BAQUEAR.key },
  { id: 'vidigal', name: 'Vidigal', defaultStatus: STATUS.BAQUEADOS.key },
  { id: 'corte8', name: 'Corte8', defaultStatus: STATUS.BAQUEADOS.key },
  { id: 'salgueiro', name: 'Salgueiro', defaultStatus: STATUS.BAQUEADOS.key },
  { id: 'anaia', name: 'Anaia', defaultStatus: STATUS.DEVOLVER.key },
  { id: 'rocinha', name: 'Rocinha', defaultStatus: STATUS.PODE_BAQUEAR.key },
  { id: 'juramento', name: 'Juramento', defaultStatus: STATUS.PODE_BAQUEAR.key },
  { id: 'Mangueira', name: 'Mangueira', defaultStatus: STATUS.BAQUEADOS.key },
  { id: 'nova_holanda', name: 'Nova Holanda', defaultStatus: STATUS.PODE_BAQUEAR.key },
  { id: 'cpx_mare', name: 'Cpx Da Mare', defaultStatus: STATUS.BAQUEADOS.key },
  { id: 'borel', name: 'Borel', defaultStatus: STATUS.DEVOLUCAO.key },
  { id: 'mandela', name: 'Mandela', defaultStatus: STATUS.DEVOLUCAO.key },
  { id: 'cidade_alta', name: 'CidadeAlta', defaultStatus: STATUS.DEVOLUCAO.key },
];

function getDefaultData() {
  const defaultStatuses = {};
  for (const favela of FAVELAS) {
    defaultStatuses[favela.id] = favela.defaultStatus;
  }

  return {
    messageId: '',
    favelas: defaultStatuses,
    lastUpdatedBy: '',
    lastUpdatedAt: '',
  };
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(getDefaultData(), null, 2), 'utf8');
  }
}

function normalizeData(data) {
  const normalized = { ...getDefaultData(), ...data };
  normalized.favelas = { ...getDefaultData().favelas, ...data.favelas };
  return normalized;
}

function readDataFile() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  return normalizeData(parsed);
}

function writeDataFile(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function formatHeader() {
  return 'LISTA DE BAQUES';
}

function formatFooter(userName, dateTime, userId) {
  const parts = ['', dateTime];
  if (userId) {
    parts.push(`Atualizado por: <@${userId}>`);
  } else if (userName) {
    parts.push(`Atualizado por: ${userName}`);
  }
  return parts.join('\n');
}

function formatListMessage(statusMap, userName, dateTime, userId) {
  const lines = FAVELAS.map(favela => {
    const statusKey = statusMap[favela.id] || favela.defaultStatus || STATUS.BAQUEADOS.key;
    const resolvedStatus = STATUS[statusKey] || STATUS.BAQUEADOS;
    return `${favela.name}: ${resolvedStatus.emoji}`;
  }).join('\n\n');

  return [formatHeader(), lines, formatFooter(userName, dateTime, userId)].join('\n\n');
}

async function handleBaquesMessage(client, userId = null) {
  const channel = await client.channels.fetch(TARGET_CHANNEL_ID);

  if (!channel) {
    throw new Error('Canal destino da Lista de Baques não encontrado.');
  }

  const data = readDataFile();
  
  // Formatar data e hora
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = (now.getFullYear() % 100).toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const formattedDateTime = `${day}/${month}/${year} ${hours}:${minutes}`;

  // Buscar nome do usuário se userId foi fornecido
  let userName = null;
  if (userId) {
    try {
      const user = await client.users.fetch(userId);
      userName = user.username;
    } catch (error) {
      console.log('Erro ao buscar nome do usuário:', error);
    }
  }

  const listContent = formatListMessage(data.favelas, userName, formattedDateTime, userId);
  let message;

  if (data.messageId) {
    try {
      message = await channel.messages.fetch(data.messageId);
      await message.edit({ content: listContent });
      // Atualizar informações de última atualização
      writeDataFile({ 
        ...data, 
        lastUpdatedBy: userName || data.lastUpdatedBy || '',
        lastUpdatedAt: formattedDateTime 
      });
      return;
    } catch (error) {
      console.log('Mensagem da Lista de Baques não encontrada, criando uma nova.');
    }
  }

  message = await channel.send({ content: listContent });
  writeDataFile({ 
    ...data, 
    messageId: message.id,
    lastUpdatedBy: userName || '',
    lastUpdatedAt: formattedDateTime 
  });
}

function setFavelaStatus(favelaId, statusKey) {
  if (!Object.prototype.hasOwnProperty.call(STATUS, statusKey)) {
    throw new Error('Status inválido fornecido.');
  }

  const data = readDataFile();
  if (!Object.prototype.hasOwnProperty.call(data.favelas, favelaId)) {
    throw new Error('Favela inválida fornecida.');
  }

  data.favelas[favelaId] = statusKey;
  writeDataFile(data);
  return {
    data,
    status: STATUS[statusKey],
  };
}

function getFavelaName(favelaId) {
  const favela = FAVELAS.find(f => f.id === favelaId);
  return favela ? favela.name : favelaId;
}

function getFavelaChoices() {
  return FAVELAS.map(favela => ({
    name: favela.name,
    value: favela.id,
  }));
}

module.exports = {
  STATUS,
  FAVELAS,
  handleBaquesMessage,
  setFavelaStatus,
  getFavelaName,
  getFavelaChoices,
};

