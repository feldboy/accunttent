import { Telegraf } from 'telegraf';

export const setupManagerBot = (bot: Telegraf) => {
    bot.start((ctx) => {
        ctx.reply('Manager Bot started. Waiting for approval requests...');
    });
};
