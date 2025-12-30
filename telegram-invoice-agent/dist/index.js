"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const telegraf_1 = require("telegraf");
const clientBot_1 = require("./bot/clientBot");
const managerBot_1 = require("./bot/managerBot");
dotenv_1.default.config();
async function main() {
    console.log('Starting Telegram Invoice Agent...');
    const clientBotToken = process.env.TELEGRAM_CLIENT_BOT_TOKEN;
    const managerBotToken = process.env.TELEGRAM_MANAGER_BOT_TOKEN;
    if (!clientBotToken) {
        console.error('❌ TELEGRAM_CLIENT_BOT_TOKEN is missing in .env');
        process.exit(1);
    }
    // Initialize Client Bot
    const clientBot = new telegraf_1.Telegraf(clientBotToken);
    (0, clientBot_1.setupClientBot)(clientBot);
    // Launch Client Bot
    clientBot.launch().then(() => {
        console.log('✅ Client Bot started');
    }).catch((err) => {
        console.error('❌ Failed to start Client Bot:', err);
    });
    // Initialize Manager Bot (Optional for now if token missing)
    if (managerBotToken) {
        const managerBot = new telegraf_1.Telegraf(managerBotToken);
        (0, managerBot_1.setupManagerBot)(managerBot);
        managerBot.launch().then(() => {
            console.log('✅ Manager Bot started');
        }).catch((err) => {
            console.error('❌ Failed to start Manager Bot:', err);
        });
    }
    else {
        console.warn('⚠️ TELEGRAM_MANAGER_BOT_TOKEN is missing. Manager features will be disabled.');
    }
    // Enable graceful stop
    process.once('SIGINT', () => {
        clientBot.stop('SIGINT');
        // if (managerBotToken) managerBot.stop('SIGINT');
    });
    process.once('SIGTERM', () => {
        clientBot.stop('SIGTERM');
        // if (managerBotToken) managerBot.stop('SIGTERM');
    });
}
main().catch(console.error);
