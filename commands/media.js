const config = require('../config/config');

module.exports = {
    theme: async (sock, msg, from, args) => {
        if (!args.length || !args[0].startsWith('http')) {
            return await sock.sendMessage(from, { text: `❌ Veuillez spécifier une URL d'image valide.\nExemple: !theme https://exemple.com` });
        }
        config.MENU_IMAGE = args[0];
        await sock.sendMessage(from, { text: `⚙️ *Configuration mise à jour !* L'image du menu a été modifiée avec succès.` });
    },
    sticker: async (sock, msg, from) => {
        await sock.sendMessage(from, { text: "💡 _Pour créer un sticker, veuillez coupler Baileys avec un convertisseur webp natif comme `wa-sticker-formatter` (nécessite ffmpeg sur le serveur)._" });
    },
    toimg: async (sock, msg, from) => {
        await sock.sendMessage(from, { text: "💡 _Fonctionnalité disponible uniquement pour les stickers animés ou statiques enregistrés localement._" });
    }
};
