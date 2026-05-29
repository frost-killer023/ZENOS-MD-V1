const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    Browsers 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const express = require('express');
const chalk = require('chalk');
const path = require('path');
const config = require('./config/config');
const { handleMessage } = require('./events/messageHandler');

// Serveur Express requis pour la validation du port Railway
const app = express();
app.get('/', (req, res) => res.send('ZENOS-MD-V1 ONLINE'));
app.listen(config.PORT, () => {
    console.log(chalk.green(`[SERVER] Port d'écoute Railway actif : ${config.PORT}`));
    startZenosBot();
});

// Système Anti-Crash Global
process.on('uncaughtException', (err) => console.error(chalk.red(`[CRASH] Exception: ${err.message}`)));
process.on('unhandledRejection', (reason) => console.error(chalk.red(`[CRASH] Rejection`)));

async function startZenosBot() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session'));

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'), // Plus stable sur l'infrastructure Railway
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(chalk.yellow('\n🤖 >>> SCANNEZ LE QR CODE CI-DESSOUS <<< 🤖\n'));
            try {
                // Génération des blocs parfaits pour le terminal mobile
                const qrTerminal = await QRCode.toString(qr, { type: 'terminal', small: true });
                console.log(qrTerminal);
            } catch (err) {
                console.error(chalk.red("[ERREUR] Échec du rendu QR :"), err);
            }
            console.log(chalk.yellow('\n-----------------------------------------\n'));
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log(chalk.yellow('[BOT] Reconnexion en cours...'));
                setTimeout(() => startZenosBot(), 3000);
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`\n[SUCCÈS] ${config.BOT_NAME} est connecté !`));
            if (config.OWNER_NUMBER) {
                try {
                    await sock.sendMessage(`${config.OWNER_NUMBER}@s.whatsapp.net`, { 
                        text: `✨ *${config.BOT_NAME}* est connecté avec succès sur Railway !` 
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
