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

// Serveur Express Minimal
const app = express();
app.get('/', (req, res) => res.send('ZENOS-MD-V1 ONLINE'));
app.listen(config.PORT, () => console.log(chalk.green(`[SERVER] Serveur web actif sur le port ${config.PORT}`)));

// Système Anti-Crash Global
process.on('uncaughtException', (err) => console.error(chalk.red(`[CRASH] Uncaught Exception: ${err.message}`), err.stack));
process.on('unhandledRejection', (reason, promise) => console.error(chalk.red(`[CRASH] Unhandled Rejection: ${reason}`)));

async function startZenosBot() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session'));
    const { version } = await fetchLatestBaileysVersion();

    console.log(chalk.blue(`[BOT] Démarrage de ${config.BOT_NAME} via Baileys v${version.join('.')}`));

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(chalk.yellow('[QR] Scannez le QR code ci-dessous pour lier votre compte :'));
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(chalk.red(`[CONNEXION] Fermée. Raison : ${lastDisconnect?.error}. Reconnexion automatique : ${shouldReconnect}`));
            if (shouldReconnect) startZenosBot();
        } else if (connection === 'open') {
            const botNumber = sock.user.id.split(':')[0];
            console.log(chalk.green(`\n[SUCCÈS] ${config.BOT_NAME} est connecté !`));
            console.log(chalk.green(`[NUMÉRO] ${botNumber}\n`));

            // Notification de démarrage au propriétaire
            if (config.OWNER_NUMBER) {
                try {
                    await sock.sendMessage(`${config.OWNER_NUMBER}@s.whatsapp.net`, { 
                        text: `✨ *${config.BOT_NAME}* est connecté avec succès !\n\n• Version: v${config.VERSION}\n• Mode: Privé\n• Préfixe actuel: \`${config.PREFIX}\`` 
                    });
                } catch (e) {
                    console.error(chalk.yellow("[ATTENTION] Impossible d'envoyer le message de démarrage à l'owner. Vérifiez le format de OWNER_NUMBER."));
                }
            }
        }
    });

    // Gestion des messages entrants
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (chatUpdate.type !== 'notify') return;
            const msg = chatUpdate.messages[0];
            if (!msg.message) return;
            await handleMessage(sock, msg);
        } catch (err) {
            console.error(chalk.red('[ERROR UPSERT] '), err);
        }
    });
}

startZenosBot();                                    
