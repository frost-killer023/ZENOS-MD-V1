const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    Browsers 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const express = require('express');
const chalk = require('chalk');
const path = require('path');
const config = require('./config/config');
const { handleMessage } = require('./events/messageHandler');

// Serveur Express Obligatoire pour Render
const app = express();
app.get('/', (req, res) => res.send('ZENOS-MD-V1 ONLINE'));
app.listen(config.PORT, () => console.log(chalk.green(`[SERVER] Serveur web actif sur le port ${config.PORT}`)));

// Anti-Crash
process.on('uncaughtException', (err) => console.error(chalk.red(`[CRASH] Uncaught Exception: ${err.message}`)));
process.on('unhandledRejection', (reason, promise) => console.error(chalk.red(`[CRASH] Unhandled Rejection`)));

async function startZenosBot() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session'));
    const { version } = await fetchLatestBaileysVersion();

    console.log(chalk.blue(`[BOT] Initialisation du système QR Code...`));

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // On gère l'affichage nous-mêmes manuellement ci-dessous pour éviter le bug
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Génération forcée et propre du QR Code dans les logs Render
        if (qr) {
            console.log(chalk.yellow('\n--- [ QR CODE DU BOT ZENOS ] ---'));
            qrcode.generate(qr, { small: true });
            console.log(chalk.yellow('--------------------------------\n'));
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(chalk.red(`[CONNEXION] Relance automatique de la tentative de connexion...`));
            if (shouldReconnect) startZenosBot();
        } else if (connection === 'open') {
            console.log(chalk.green(`\n[SUCCÈS] ${config.BOT_NAME} est connecté !`));
            if (config.OWNER_NUMBER) {
                try {
                    await sock.sendMessage(`${config.OWNER_NUMBER}@s.whatsapp.net`, { 
                        text: `✨ *${config.BOT_NAME}* est connecté avec succès par QR Code !` 
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
