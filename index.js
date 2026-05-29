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

let latestQrCode = null;
let isBotConnected = false;

const app = express();

// Interface Web optimisée pour Mobile (Écran Noir / QR Code Blanc Opaque / Rafraîchissement 30s)
app.get('/', (req, res) => {
    if (isBotConnected) {
        res.send(`
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { background-color: #111111; color: #ffffff; text-align: center; font-family: 'Segoe UI', sans-serif; padding-top: 50px; }
                .status { color: #00ffcc; font-size: 24px; font-weight: bold; margin-top: 20px; }
            </style>
            <h1>⚡ ZENOS-MD-V1 ⚡</h1>
            <p class="status">🟢 BOT EN LIGNE ET ACTIF</p>
            <p>Seul le propriétaire peut utiliser les commandes en mode privé.</p>
        `);
    } else if (latestQrCode) {
        // Options de génération forcée : Fond blanc opaque (#ffffff) et carrés noirs (#000000)
        QRCode.toDataURL(latestQrCode, {
            margin: 4,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, (err, url) => {
            if (err) return res.send('Erreur de traitement du QR Code.');
            res.send(`
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { background-color: #111111; color: #ffffff; text-align: center; font-family: 'Segoe UI', sans-serif; padding: 20px; }
                    .qr-container { background-color: #ffffff; padding: 20px; display: inline-block; border-radius: 15px; margin-top: 25px; box-shadow: 0 0 25px rgba(255,255,255,0.1); }
                    img { width: 280px; height: 280px; display: block; }
                    .refresh-text { color: #aaaaaa; font-size: 13px; margin-top: 20px; }
                </style>
                <h1>⚡ ZENOS-MD-V1 ⚡</h1>
                <p>Scannez ce QR Code avec votre application WhatsApp :</p>
                
                <div class="qr-container">
                    <img src="${url}" alt="QR Code WhatsApp">
                </div>
                
                <p class="refresh-text">🔄 Mise à jour automatique de la page toutes les 30 secondes...</p>
                <script>setTimeout(() => { location.reload(); }, 30000);</script>
            `);
        });
    } else {
        res.send(`
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { background-color: #111111; color: #ffffff; text-align: center; font-family: 'Segoe UI', sans-serif; padding-top: 60px; }
            </style>
            <h1>⚡ ZENOS-MD-V1 ⚡</h1>
            <p>🔄 Génération du QR Code en cours... Veuillez patienter.</p>
            <script>setTimeout(() => { location.reload(); }, 5000);</script>
        `);
    }
});

// Lancement du serveur Web
app.listen(config.PORT, () => {
    console.log(chalk.green(`[SERVER] Serveur web actif sur le port ${config.PORT}`));
    // Temporisation pour laisser le serveur s'aligner avant de lancer la connexion Baileys
    setTimeout(() => {
        startZenosBot();
    }, 2500);
});

// Système Anti-Crash Global
process.on('uncaughtException', (err) => console.error(chalk.red(`[CRASH] Uncaught Exception: ${err.message}`)));
process.on('unhandledRejection', (reason, promise) => console.error(chalk.red(`[CRASH] Unhandled Rejection`)));

async function startZenosBot() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session'));

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            latestQrCode = qr; // Interception stable du flux
        }

        if (connection === 'close') {
            isBotConnected = false;
            latestQrCode = null;
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log(chalk.yellow('[BOT] Reconnexion automatique programmée...'));
                setTimeout(() => startZenosBot(), 4000);
            }
        } else if (connection === 'open') {
            latestQrCode = null;
            isBotConnected = true;
            console.log(chalk.green(`[SUCCÈS] Client connecté au protocole WhatsApp.`));
            if (config.OWNER_NUMBER) {
                try {
                    await sock.sendMessage(`${config.OWNER_NUMBER}@s.whatsapp.net`, { 
                        text: `✨ *${config.BOT_NAME}* est connecté ! Vos requêtes privées sont désormais gérées.` 
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
