const axios = require('axios');

module.exports = {
    weather: async (sock, msg, from, args) => {
        if (!args.length) return await sock.sendMessage(from, { text: "Donnez le nom d'une ville !" });
        try {
            const city = args.join(' ');
            // Utilisation d'une API ouverte et stable sans authentification complexe
            const res = await axios.get(`https://wttr.in{encodeURIComponent(city)}?format=j1`);
            const current = res.data.current_condition[0];
            await sock.sendMessage(from, { text: `🌍 *Météo - ${city}*\n\n• Température: ${current.temp_C}°C\n• État: ${current.lang_fr?.[0]?.value || current.weatherDesc[0].value}\n• Humidité: ${current.humidity}%` });
        } catch {
            await sock.sendMessage(from, { text: `Impossible de récupérer la météo pour : ${args.join(' ')}` });
        }
    },
    wiki: async (sock, msg, from, args) => {
        if (!args.length) return await sock.sendMessage(from, { text: "Que recherchez-vous sur Wikipédia ?" });
        try {
            const query = args.join(' ');
            const res = await axios.get(`https://wikipedia.org{encodeURIComponent(query)}`);
            await sock.sendMessage(from, { text: `📚 *Wikipédia : ${res.data.title}*\n\n${res.data.extract}` });
        } catch {
            await sock.sendMessage(from, { text: "Aucun article trouvé." });
        }
    },
    news: async (sock, msg, from) => {
        try {
            // RSS public converti au format JSON propre
            const res = await axios.get('https://rss2json.com');
            let text = `📰 *Dernières Actualités (Le Monde) :*\n\n`;
            for(let i=0; i<3; i++) {
                text += `📌 *${res.data.items[i].title}*\n🔗 ${res.data.items[i].link}\n\n`;
            }
            await sock.sendMessage(from, { text });
        } catch {
            await sock.sendMessage(from, { text: "Erreur lors de la récupération des flux d'actualités." });
        }
    },
    crypto: async (sock, msg, from, args) => {
        const cryptoId = args[0]?.toLowerCase() || 'bitcoin';
        try {
            const res = await axios.get(`https://coingecko.com{cryptoId}&vs_currencies=usd`);
            if (!res.data[cryptoId]) return await sock.sendMessage(from, { text: "Crypto introuvable (Ex: !crypto bitcoin)." });
            await sock.sendMessage(from, { text: `🪙 *Cours du ${cryptoId.toUpperCase()}*\n\n• Prix actuel : $${res.data[cryptoId].usd}` });
        } catch {
            await sock.sendMessage(from, { text: "API CoinGecko temporairement indisponible." });
        }
    }
};                                                                                                               
