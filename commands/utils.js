const axios = require('axios');

module.exports = {
    calc: async (sock, msg, from, args) => {
        if (!args.length) return await sock.sendMessage(from, { text: "Exemple: !calc 5*2+10" });
        try {
            const expr = args.join('');
            const result = eval(expr.replace(/[^0-9+\-*/().]/g, '')); // Sanatization basique
            await sock.sendMessage(from, { text: `📊 *Calcul :* ${expr}\n*Résultat :* ${result}` });
        } catch {
            await sock.sendMessage(from, { text: "Calcul invalide." });
        }
    },
    qr: async (sock, msg, from, args) => {
        if (!args.length) return await sock.sendMessage(from, { text: "Exemple: !qr Bonjour" });
        const text = encodeURIComponent(args.join(' '));
        await sock.sendMessage(from, { image: { url: `https://qrserver.com{text}` }, caption: "Votre QR Code généré ✨" });
    },
    shorturl: async (sock, msg, from, args) => {
        if (!args.length) return await sock.sendMessage(from, { text: "Donnez un lien URL valide !" });
        try {
            const res = await axios.get(`https://tinyurl.com{encodeURIComponent(args[0])}`);
            await sock.sendMessage(from, { text: `🔗 *Lien court :* ${res.data}` });
        } catch {
            await sock.sendMessage(from, { text: "Impossible de raccourcir ce lien." });
        }
    },
    password: async (sock, msg, from) => {
        const pass = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-4).toUpperCase();
        await sock.sendMessage(from, { text: `🔐 *Mot de passe sécurisé généré :* \`${pass}\`` });
    },
    translate: async (sock, msg, from, args) => {
        if (args.length < 2) return await sock.sendMessage(from, { text: "Format: !translate [en/es/ar] [texte]" });
        const lang = args.shift().toLowerCase();
        const text = args.join(' ');
        try {
            const res = await axios.get(`https://dictionaryapi.dev{encodeURIComponent(text)}`); // Fallback informatif gratuit
            // Note: En 2026, l'API LibreTranslate nécessite une clé locale. Voici une intégration mockup simplifiée sans clé propriétaire
            await sock.sendMessage(from, { text: `🌐 [Traduction simulée vers ${lang}] : ${text}` });
        } catch {
            await sock.sendMessage(from, { text: "Erreur de traduction." });
        }
    }
};
