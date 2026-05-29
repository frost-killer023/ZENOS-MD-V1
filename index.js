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

// Serveur Express Minimal obligatoire pour Railway
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
    // Initialisation du dossier de session
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session'));

    console.log(chalk.blue(`[BOT] Initialisation du protocole de sécurité WhatsApp...`));

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Forcé à false pour éviter le bug natif de Baileys
        browser: Browsers.ubuntu('Chrome'),
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Interception asynchrone et affichage forcé du QR Code
        if (qr) {
            console.log(chalk.cyan('\n╔════════════════════════════════════════════╗'));
            console.log(chalk.cyan('║      🤖 FLASH SCAN - ZENOS-MD-V1 🤖        ║'));
            console.log(chalk.cyan('╚════════════════════════════════════════════╝\n'));
            
            try {
                // Rendu en mode terminal pur avec blocs contrastés (small: true)
                const qrText = await QRCode.toString(qr, { type: 'terminal', small: true });
                console.log(qrText);
            } catch (err) {
                console.error(chalk.red("[ERREUR] Impossible de dessiner le QR Code :"), err);
            }
            
            console.log(chalk.cyan('\n──────────────────────────────────────────────'));
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(chalk.red(`[BOT] Connexion fermée (Code: ${statusCode}).`));
            
            if (shouldReconnect) {
                // Temporisation de 6 secondes pour casser la boucle de crash que vous subissiez
                console.log(chalk.yellow('[BOT] Pause de sécurité... Reconnexion dans 6 secondes.'));
                setTimeout(() => {
                    startZenosBot();
                }, 6000);
            } else {
                console.log(chalk.bgRed.white(' [ERREUR FATALE] Déconnecté de WhatsApp. Veuillez vider le dossier session et relancer. '));
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
