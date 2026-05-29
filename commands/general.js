const config = require('../config/config');
const moment = require('moment-timezone');

const startTime = Date.now();

module.exports = {
    ping: async (sock, msg, from) => {
        const timestamp = Date.now();
        const latency = Date.now() - timestamp; // Ping simulé d'exécution
        await sock.sendMessage(from, { text: `🤖 *Pong!* ${latency < 0 ? 0 : latency}ms` });
    },
    uptime: async (sock, msg, from) => {
        const diff = Date.now() - startTime;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        await sock.sendMessage(from, { text: `⏱ *Uptime :* \`${hours}h ${minutes}m ${seconds}s\`` });
    },
    owner: async (sock, msg, from) => {
        await sock.sendMessage(from, { text: `👑 *Propriétaire :* ${config.OWNER_NAME}\n• Contact: wa.me/${config.OWNER_NUMBER}` });
    },
    botname: async (sock, msg, from) => {
        await sock.sendMessage(from, { text: `🤖 *Nom du Bot :* ${config.BOT_NAME}` });
    },
    date: async (sock, msg, from) => {
        const dateStr = moment().tz('Europe/Paris').format('DD/MM/YYYY');
        const timeStr = moment().tz('Europe/Paris').format('HH:mm:ss');
        await sock.sendMessage(from, { text: `📅 *Date :* ${dateStr}\n⏰ *Heure :* ${timeStr}` });
    },
    info: async (sock, msg, from) => {
        const infoText = `✨ *Informations - ${config.BOT_NAME}* ✨\n\n` +
                         `• *Version :* ${config.VERSION}\n` +
                         `• *Langue :* Français\n` +
                         `• *Node.js :* ${process.version}\n` +
                         `• *Plateforme :* Production Cloud\n` +
                         `• *Architecture :* Modulaire sélective`;
        await sock.sendMessage(from, { text: infoText });
    },
    menu: async (sock, msg, from) => {
        const diff = Date.now() - startTime;
        const uptimeStr = `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
        const dateStr = moment().tz('Europe/Paris').format('DD/MM/YYYY');
        const timeStr = moment().tz('Europe/Paris').format('HH:mm:ss');

        const menuText = `✨ *⚡ ${config.BOT_NAME.toUpperCase()} ⚡* ✨\n\n` +
            `╔══════════════════╗\n` +
            `  👑 *Owner:* ${config.OWNER_NAME}\n` +
            `  ⚙️ *Prefix:* \`${config.PREFIX}\`\n` +
            `  ⏱ *Uptime:* ${uptimeStr}\n` +
            `  📅 *Date:* ${dateStr} à ${timeStr}\n` +
            `╚══════════════════╝\n\n` +
            `📌 *GÉNÉRAL*\n` +
            `• ${config.PREFIX}menu\n• ${config.PREFIX}ping\n• ${config.PREFIX}uptime\n• ${config.PREFIX}owner\n• ${config.PREFIX}botname\n• ${config.PREFIX}date\n• ${config.PREFIX}info\n\n` +
            `🎮 *FUN*\n` +
            `• ${config.PREFIX}dice\n• ${config.PREFIX}flip\n• ${config.PREFIX}8ball\n• ${config.PREFIX}quote\n• ${config.PREFIX}fact\n• ${config.PREFIX}reverse\n\n` +
            `🛠 *UTILITAIRES*\n` +
            `• ${config.PREFIX}calc\n• ${config.PREFIX}qr\n• ${config.PREFIX}shorturl\n• ${config.PREFIX}password\n• ${config.PREFIX}translate\n\n` +
            `🖼 *MÉDIAS*\n` +
            `• ${config.PREFIX}sticker\n• ${config.PREFIX}toimg\n• ${config.PREFIX}theme\n\n` +
            `🌍 *INFORMATIONS*\n` +
            `• ${config.PREFIX}weather\n• ${config.PREFIX}wiki\n• ${config.PREFIX}news\n• ${config.PREFIX}crypto\n\n` +
            `👑 *OWNER*\n` +
            `• ${config.PREFIX}restart\n• ${config.PREFIX}setname\n• ${config.PREFIX}status\n• ${config.PREFIX}setprefixe`;

        await sock.sendMessage(from, { 
            image: { url: config.MENU_IMAGE }, 
            caption: menuText 
        });
    }
}
