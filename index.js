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

// Serveur Express local minimal
const app = express();
app.get('/', (req, res) => res.send('ZENOS-MD-V1 ONLINE (TERMUX)'));
app.listen(config.PORT, () => {
    console.log(chalk.green(`[SERVER] Serveur web local actif sur le port ${config.PORT}`));
    startZenosBot();
});

// Système Anti-Crash Global
process.on('uncaughtException', (err) => console.error(chalk.red(`[CRASH] Exception: ${err.message}`)));
process.on('unhandledRejection', (reason) => console.error(chalk.red(`[CRASH] Rejection`)));

async function startZenosBot() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session'));

    console.log(chalk.blue(`[BOT] Initialisation du protocole WhatsApp sur Termux...`));

    // Force la version réseau valide pour valider la poignée de main initiale
    const WHATSAPP_VERSION = [2, 3000, 1015901307]; 

    const sock = makeWASocket({
        version: WHATSAPP_VERSION, 
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // On utilise notre propre convertisseur stable
        browser: Browsers.ubuntu('Chrome'), // Évite le flag d'activité suspecte de WhatsApp
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Rendu immédiat et natif du QR Code sur Termux
        if (qr) {
            console.log(chalk.yellow('\n🤖 >>> SCANNEZ LE QR CODE CI-DESSOUS <<< 🤖\n'));
            try {
                const qrText = await QRCode.toString(qr, { type: 'terminal', small: true });
                console.log(qrText);
            } catch (err) {
                console.error(chalk.red("[ERREUR] Impossible de dessiner le QR :"), err);
            }
            console.log(chalk.yellow('\n-----------------------------------------\n'));
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            console.log(chalk.red(`[BOT] Connexion fermée (Code: ${statusCode}).`));
            if (shouldReconnect) {
                console.log(chalk.yellow('[BOT] Relance de la liaison réseau dans 5 secondes...'));
                setTimeout(() => startZenosBot(), 5000);
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`\n✨ [SUCCÈS] ${config.BOT_NAME} est en ligne sur votre appareil mobile ! ✨`));
            if (config.OWNER_NUMBER) {
                try {
                    await sock.sendMessage(`${config.OWNER_NUMBER}@s.whatsapp.net`, { 
                        text: `✨ *${config.BOT_NAME}* est maintenant connecté via Termux !` 
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
