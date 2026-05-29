const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session_zenos');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ["ZENOS-MD-V1", "Chrome", "1.0.0"]
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log("\n--- SCANNEZ LE QR CODE ---");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log("ZENOS-MD-V1 est en ligne !");
            
            // Confirmation automatique en DM
            const myNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const message = `╭───〔 🤖 zenos 𝘽𝙊𝙏 〕───⬣\n` +
                            `│ ߷ *Etat* ➜ Connecté ✅\n` +
                            `│ ߷ *Mode* ➜ Public\n` +
                            `│ ߷ *Statut* ➜ Opérationnel\n` +
                            `│ ߷ *Développeur*➜ ANOS\n` +
                            `╰──────────────⬣`;
            await sock.sendMessage(myNumber, { text: message });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log("Reconnexion en cours...");
                setTimeout(startBot, 5000);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Système de gestion de tes commandes
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const body = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
        const from = msg.key.remoteJid;
        const command = body.split(' ')[0].toLowerCase();

        // Ajoute tes commandes ici
        switch (command) {
            case '.ping':
                await sock.sendMessage(from, { text: 'Pong! 🏓 Bot actif.' });
                break;
            
            case '.menu':
                await sock.sendMessage(from, { text: 'Voici tes commandes disponibles...' });
                break;

            // Ajoute tes nouvelles commandes ci-dessous
            // case '.test':
            //     await sock.sendMessage(from, { text: 'Commande ajoutée !' });
            //     break;
        }
    });
}

startBot();
