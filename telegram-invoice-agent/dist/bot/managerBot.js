"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupManagerBot = void 0;
const setupManagerBot = (bot) => {
    bot.start((ctx) => {
        ctx.reply('Manager Bot started. Waiting for approval requests...');
    });
};
exports.setupManagerBot = setupManagerBot;
