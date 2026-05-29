const config = require('../config/config');
const chalk = require('chalk');

// Chargement dynamique des modules de commandes
const commands = {
    ...require('../commands/general'),
    ...require('../commands/fun'),
    ...require('../commands/utils'),
    ...require('../commands/media'),
    ...require('../commands/info'),
    ...require('../commands/owner')
};

async function handleMessage(sock, msg) {
    const from = msg.key.remoteJid;
    
    // Ignorer les groupes et les statuts
    if (from.endsWith('@g.us') || from === 'status@broadcast') return;
    
    // Ignorer ses propres messages
    if (msg.key.fromMe) return;

    const botNumber = sock.user.id.split(':')[0];
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderNumber = sender.split('@')[0];

    // Sécurité stricte Mode Privé (Seul le Owner a le droit)
    if (senderNumber !== config.OWNER_NUMBER) return;

    // Extraction du texte
    const messageContent = msg.message.extendedTextMessage?.text || msg.message.conversation || msg.message.imageMessage?.caption || "";
    if (!messageContent.startsWith(config.PREFIX)) return;

    const args = messageContent.slice(config.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (commands[commandName]) {
        console.log(chalk.cyan(`[COMMANDE] Executor: ${senderNumber} -> ${config.PREFIX}${commandName}`));
        try {
            await commands[commandName](sock, msg, from, args);
        } catch (error) {
            console.error(chalk.red(`[ERREUR COMMANDE] ${commandName}: `), error);
            await sock.sendMessage(from, { text: `❌ Une erreur est survenue lors de l'exécution de la commande.` });
        }
    }
}

module.exports = { handleMessage };
