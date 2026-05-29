const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    Browsers 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const chalk = require('chalk');
const path = require('path');
const config = require('./config/config');
const { handleMessage } = require('./events/messageHandler');

const app = express();
app.get('/', (req, res) => res.send('ZENOS-MD-V1 ONLINE'));
app.listen(config.PORT, () => console.log(chalk.green(`[SERVER] Serveur web actif sur le port ${config.PORT}`)));

process.on('uncaughtException', (err) => console.error(chalk.red(`[CRASH] Uncaught Exception: ${err.message}`)));
process.on('unhandledRejection', (reason, promise) => console.error(chalk.red(`[CRASH] Unhandled Rejection`)));

async function startZenosBot() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session'));
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Désactivé pour éviter le bug de log
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false
    });

    // CODE DE JUMELAGE (PAIRING CODE) POUR MOBILE
    if (!sock.authState.creds.registered && config.OWNER_NUMBER) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(config.OWNER_NUMBER);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(chalk.bgGreen.black(`\n   VOTRE CODE DE JUMELAGE WHATSAPP : ${code}   \n`));
            } catch (error) {
                console.error(chalk.red("[ERREUR] Impossible de générer le code de jumelage :"), error);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startZenosBot();
        } else if (connection === 'open') {
            console.log(chalk.green(`\n[SUCCÈS] ${config.BOT_NAME} est connecté !`));
            if (config.OWNER_NUMBER) {
                try {
                    await sock.sendMessage(`${config.OWNER_NUMBER}@s.whatsapp.net`, { 
                        text: `✨ *${config.BOT_NAME}* est connecté avec succès via Pairing Code !` 
                    });
                } catch (e) {}
            }
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (chatUpdate.type !== 'notify') return;
            const msg = chatUpdate.messages;
            if (!msg.message) return;
            await handleMessage(sock, msg);
        } catch (err) {}
    });
}

startZenosBot();
