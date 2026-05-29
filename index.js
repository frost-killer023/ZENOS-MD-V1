const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    Browsers 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode'); // Utilisation du moteur stable
const express = require('express');
const chalk = require('chalk');
const path = require('path');
const config = require('./config/config');
const { handleMessage } = require('./events/messageHandler');

// Serveur Express Minimal obligatoire pour Render/UptimeRobot
const app = express();
app.get('/', (req, res) => res.send('ZENOS-MD-V1 ONLINE'));
app.listen(config.PORT, () => console.log(chalk.green(`[SERVER] Serveur web actif sur le port ${config.PORT}`)));

// Système Anti-Crash Global
process.on('uncaughtException', (err) => console.error(chalk.red(`[CRASH] Exception: ${err.message}`)));
process.on('unhandledRejection', (reason) => console.error(chalk.red(`[CRASH] Rejection`)));

async function startZenosBot() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session'));

    console.log(chalk.blue(`[BOT] Initialisation de la connexion WhatsApp...`));

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Désactivé car obsolète dans Baileys
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Génération du QR Code FORCÉE en mode texte blanc/noir pour le terminal
        if (qr) {
            console.log(chalk.yellow('\n🤖 >>> SCANNEZ LE QR CODE CI-DESSOUS <<< 🤖\n'));
            try {
                // Cette fonction génère les blocs parfaits adaptés au terminal noir
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
                console.log(chalk.yellow('[BOT] Connexion fermée. Reconnexion automatique...'));
                setTimeout(() => startZenosBot(), 5000);
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`\n[SUCCÈS] ${config.BOT_NAME} est connecté !`));
            if (config.OWNER_NUMBER) {
                try {
                    await sock.sendMessage(`${config.OWNER_NUMBER}@s.whatsapp.net`, { 
                        text: `✨ *${config.BOT_NAME}* est maintenant connecté et actif via vos logs !` 
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
