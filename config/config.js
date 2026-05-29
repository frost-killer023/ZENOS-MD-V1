const dotenv = require('dotenv');
const fs = require('fs-extra');
const path = require('path');

dotenv.config();

// S'assurer que l'image par défaut (Sasuke) est là si l'URL .env crash
let currentMenuImage = process.env.MENU_IMAGE || "https://pinimg.com";
let currentPrefix = process.env.PREFIX || "!";
let currentBotName = process.env.BOT_NAME || "zenos-md-v1";

module.exports = {
    PORT: process.env.PORT || 3000,
    OWNER_NUMBER: process.env.OWNER_NUMBER ? process.env.OWNER_NUMBER.replace(/[^0-9]/g, '') : '',
    OWNER_NAME: process.env.OWNER_NAME || "Zenos",
    get BOT_NAME() { return currentBotName; },
    set BOT_NAME(val) { currentBotName = val; },
    get PREFIX() { return currentPrefix; },
    set PREFIX(val) { currentPrefix = val; },
    get MENU_IMAGE() { return currentMenuImage; },
    set MENU_IMAGE(val) { currentMenuImage = val; },
    VERSION: "1.0.0"
};
