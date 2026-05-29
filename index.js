const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    Browsers 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const express = require('express');
const chalk = require('chalk');
const path = require('path');
const config = require('./config/config');
const { handleMessage } = require('./events/messageHandler');

// Serveur Express Minimal local
const app = express();
app.get('/', (req, res) => res.send('ZENOS-MD-V1 ONLINE'));
app.listen(config.PORT, () => console.log(chalk.green(`[SERVER] Serveur web actif sur le port ${config.PORT}`)));

// Système Anti-Crash Global Professionnel
process.on('uncaughtException', (err) => console.error(chalk.red(`[CRASH] Uncaught Exception: ${err.message}`)));
process.on('unhandledRejection', (reason) => console.error(chalk.red(`[CRASH] Unhandled Rejection`)));

async function startZenosBot() {
    // Utilisation de la session personnalisée demandée
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session_zenos'));

    console.log(chalk.blue(`[BOT] Initialisation de la connexion WhatsApp...`));

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Désactivé pour laisser la main à qrcode-terminal
        browser: ["ZENOS-MD-V1", "Chrome", "1.0.0"],
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Génération propre avec l'affichage compact { small: true } dans Termux
        if (qr) {
            console.log(chalk.yellow("\n--- SCANNEZ LE QR CODE ---"));
            qrcode.generate(qr, { small: true });
            console.log(chalk.yellow("--------------------------\n"));
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(chalk.red(`[CONNEXION] Fermée. Reconnexion automatique : ${shouldReconnect}`));
            if (shouldReconnect) {
                setTimeout(() => startZenosBot(), 5000);
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`\n[SUCCÈS] ZENOS-MD-V1 connecté avec succès !`));
            
            // Notification stylisée et automatique au propriétaire
            if (config.OWNER_NUMBER) {
                try {
                    const myJid = `${config.OWNER_NUMBER}@s.whatsapp.net`;
                    const welcomeMessage = `╭───〔 🤖 zenos 𝘽𝙊𝙏 〕───⬣\n` +
                                           `│ ߷ *Etat* ➜ Connecté ✅\n` +
                                           `│ ߷ *Préfixe* ➜ ${config.PREFIX}\n` +
                                           `│ ߷ *Version* ➜ ${config.VERSION}\n` +
                                           `│ ߷ *Mode* ➜ Privé Strict 🔒\n` +
                                           `╰──────────────⬣`;
                    await sock.sendMessage(myJid, { text: welcomeMessage });
                } catch (e) {
                    console.error(chalk.yellow("[ATTENTION] Impossible d'envoyer le message de démarrage."));
                }
            }
        }
    });

    // Gestion centralisée des événements via le Handler modulaire
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (chatUpdate.type !== 'notify') return;
            const msg = chatUpdate.messages;
            if (!msg.message) return;
            await handleMessage(sock, msg);
        } catch (err) {
            console.error(chalk.red('[ERROR UPSERT] '), err);
        }
    });
}

startZenosBot();
