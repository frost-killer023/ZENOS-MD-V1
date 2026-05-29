const config = require('../config/config');

module.exports = {
    restart: async (sock, msg, from) => {
        await sock.sendMessage(from, { text: "🔄 *Redémarrage du bot en cours...*" });
        setTimeout(() => {
            process.exit(0); // Forcer PM2 / Render / Railway à recréer l'instance automatiquement
        }, 1000);
    },
    setname: async (sock, msg, from, args) => {
        if (!args.length) return await sock.sendMessage(from, { text: "Entrez le nouveau nom !" });
        config.BOT_NAME = args.join(' ');
        await sock.sendMessage(from, { text: `✅ Le nom du bot a été changé en : *${config.BOT_NAME}*` });
    },
    status: async (sock, msg, from) => {
        const mem = process.memoryUsage();
        const ramUsed = (mem.heapUsed / 1024 / 1024).toFixed(2);
        await sock.sendMessage(from, { text: `📈 *Statut Système :*\n\n• Mémoire RAM allouée : ${ramUsed} Mo\n• Version de Node : ${process.version}\n• Plateforme : ${process.platform}` });
    },
    setprefixe: async (sock, msg, from, args) => {
        if (!args.length) return await sock.sendMessage(from, { text: "Entrez le nouveau préfixe !" });
        config.PREFIX = args[0].trim();
        await sock.sendMessage(from, { text: `⚙️ Préfixe global modifié ! Nouveau préfixe : \`${config.PREFIX}\`` });
    }
};
