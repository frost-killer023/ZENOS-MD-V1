const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
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

// Serveur Express avec interface Web dynamique
const app = express();
app.get('/', (req, res) => {
    if (isBotConnected) {
        res.send(`
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>body{background:#111;color:#fff;text-align:center;font-family:sans-serif;padding-top:50px;} .status{color:#00ffcc;font-size:24px;font-weight:bold;}</style>
            <h1>⚡ ZENOS-MD-V1 ⚡</h1>
            <p class="status">🟢 BOT EN LIGNE ET ACTIF</p>
            <p>Seul le propriétaire peut utiliser les commandes en mode privé.</p>
        `);
    } else if (latestQrCode) {
        QRCode.toDataURL(latestQrCode, (err, url) => {
            if (err) return res.send('Erreur de génération du QR Code.');
            res.send(`
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>body{background:#111;color:#fff;text-align:center;font-family:sans-serif;padding:20px;} img{background:#fff;padding:10px;border-radius:10px;box-shadow:0 0 15px rgba(255,255,255,0.2);margin-top:20px;} .refresh{color:#aaa;font-size:12px;}</style>
                <h1>⚡ ZENOS-MD-V1 ⚡</h1>
                <p>Scannez ce QR Code avec votre WhatsApp pour connecter le bot :</p>
                <img src="${url}" alt="QR Code WhatsApp"><br><br>
                <p class="refresh">La page s'actualise automatiquement toutes les 15 secondes.</p>
                <script>setTimeout(() => { location.reload(); }, 15000);</script>
            `);
        });
    } else {
        res.send(`
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>body{background:#111;color:#fff;text-align:center;font-family:sans-serif;padding-top:50px;}</style>
            <h1>⚡ ZENOS-MD-V1 ⚡</h1>
            <p>🔄 Initialisation de Baileys... Veuillez patienter et rafraîchir la page dans quelques instants.</p>
            <script>setTimeout(() => { location.reload(); }, 5000);</script>
        `);
    }
});

app.listen(config.PORT, () => console.log(chalk.green(`[SERVER] Serveur web actif sur le port ${config.PORT}`)));

// Anti-Crash
process.on('uncaughtException', (err) => console.error(chalk.red(`[CRASH] Uncaught Exception: ${err.message}`)));
process.on('unhandledRejection', (reason, promise) => console.error(chalk.red(`[CRASH] Unhandled Rejection`)));

async function startZenosBot() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session'));
    const { version } = await fetchLatestBaileysVersion();

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
            latestQrCode = qr; // Sauvegarde du QR pour l'affichage Web
        }

        if (connection === 'close') {
            isBotConnected = false;
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startZenosBot();
        } else if (connection === 'open') {
            latestQrCode = null;
            isBotConnected = true;
            console.log(chalk.green(`\n[SUCCÈS] connecté !`));
            if (config.OWNER_NUMBER) {
                try {
                    await sock.sendMessage(`${config.OWNER_NUMBER}@s.whatsapp.net`, { 
                        text: `✨ *${config.BOT_NAME}* est maintenant connecté via l'interface Web !` 
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
