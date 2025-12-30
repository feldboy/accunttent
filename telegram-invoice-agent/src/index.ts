import dotenv from 'dotenv';
import { Telegraf } from 'telegraf';
import { setupClientBot } from './bot/clientBot';
import { setupManagerBot } from './bot/managerBot';

dotenv.config();

async function main() {
    console.log('Starting Telegram Invoice Agent...');

    const clientBotToken = process.env.TELEGRAM_CLIENT_BOT_TOKEN;
    const managerBotToken = process.env.TELEGRAM_MANAGER_BOT_TOKEN;

    if (!clientBotToken) {
        console.error('❌ TELEGRAM_CLIENT_BOT_TOKEN is missing in .env');
        process.exit(1);
    }

    // Initialize Client Bot
    const clientBot = new Telegraf(clientBotToken);
    setupClientBot(clientBot);

    // Launch Client Bot
    clientBot.launch().then(() => {
        console.log('✅ Client Bot started');
    }).catch((err) => {
        console.error('❌ Failed to start Client Bot:', err);
    });

    // Initialize Manager Bot (Optional for now if token missing)
    if (managerBotToken) {
        const managerBot = new Telegraf(managerBotToken);
        setupManagerBot(managerBot);
        managerBot.launch().then(() => {
            console.log('✅ Manager Bot started');
        }).catch((err) => {
            console.error('❌ Failed to start Manager Bot:', err);
        });
    } else {
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
