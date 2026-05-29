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

// Serveur Express pour Railway
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

    console.log(chalk.blue(`[BOT] Initialisation du protocole avec contournement du bug 405...`));

    // Force la dernière version réseau valide connue pour valider le protocole WhatsApp Web 2026
    const WHATSAPP_VERSION = [2, 3000, 1037641644]; 

    const sock = makeWASocket({
        version: WHATSAPP_VERSION, // <-- RÈGLE L'ERREUR 405 définitivement
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, 
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Génération asynchrone stable du QR Code dans les logs
        if (qr) {
            console.log(chalk.cyan('\n╔════════════════════════════════════════════╗'));
            console.log(chalk.cyan('║      🤖 FLASH SCAN - ZENOS-MD-V1 🤖        ║'));
            console.log(chalk.cyan('╚════════════════════════════════════════════╝\n'));
            
            try {
                const qrText = await QRCode.toString(qr, { type: 'terminal', small: true });
                console.log(qrText);
            } catch (err) {
                console.error(chalk.red("[ERREUR] Impossible de dessiner le QR :"), err);
            }
            
            console.log(chalk.cyan('\n──────────────────────────────────────────────'));
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(chalk.red(`[BOT] Connexion fermée (Code: ${statusCode || 'Inconnu'}).`));
            
            if (shouldReconnect) {
                console.log(chalk.yellow('[BOT] Pause protocolaire... Reconnexion dans 10 secondes.'));
                setTimeout(() => {
                    startZenosBot();
                }, 10000);
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`\n✨ [SUCCÈS] ${config.BOT_NAME} est connecté ! ✨`));
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
