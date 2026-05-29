module.exports = {
    dice: async (sock, msg, from) => {
        const result = Math.floor(Math.random() * 6) + 1;
        await sock.sendMessage(from, { text: `🎲 Vous avez lancé un dé et obtenu un : *${result}*` });
    },
    flip: async (sock, msg, from) => {
        const side = Math.random() < 0.5 ? 'Pile' : 'Face';
        await sock.sendMessage(from, { text: `🪙 Résultat du lancer : *${side}*` });
    },
    '8ball': async (sock, msg, from, args) => {
        if (!args.length) return await sock.sendMessage(from, { text: "Posez-moi une question !" });
        const answers = ["Oui absolument", "C'est certain", "Peut-être", "Pas sûr du tout", "Non, jamais"];
        const random = answers[Math.floor(Math.random() * answers.length)];
        await sock.sendMessage(from, { text: `🔮 *Question:* ${args.join(' ')}\n*Réponse:* ${random}` });
    },
    quote: async (sock, msg, from) => {
        const quotes = [
            "Le courage n'est pas l'absence de peur, mais la capacité de la vaincre.",
            "La vie est un mystère qu'il faut vivre, et non un problème à résoudre.",
            "Les faiblesses des hommes font la force des femmes."
        ];
        await sock.sendMessage(from, { text: `💬 "${quotes[Math.floor(Math.random() * quotes.length)]}"` });
    },
    fact: async (sock, msg, from) => {
        const facts = [
            "Le cœur des crevettes se trouve dans leur tête.",
            "Le miel est le seul aliment qui ne se périme jamais.",
            "Les flamants roses ne sont pas nés roses."
        ];
        await sock.sendMessage(from, { text: `💡 *Fait étonnant :* ${facts[Math.floor(Math.random() * facts.length)]}` });
    },
    reverse: async (sock, msg, from, args) => {
        if (!args.length) return await sock.sendMessage(from, { text: "Donnez-moi du texte à inverser !" });
        const rev = args.join(' ').split('').reverse().join('');
        await sock.sendMessage(from, { text: rev });
    }
};
