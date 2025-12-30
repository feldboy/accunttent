import { Telegraf } from 'telegraf';
import { isClientRegistered, getClientDetails } from '../services/clientService';
import { processImage, processPdf, InvoiceData } from '../services/aiService';
import { sendApprovalRequest, setBotForNotifications } from '../services/managerService';
import { logInvoiceToSheet, uploadFileToDrive } from '../services/googleService';
import * as crypto from 'crypto';

// In-memory cache for pending approvals
// Map<InvoiceId, { clientName, invoiceData, fileUrl, fileBuffer }>
const pendingInvoices = new Map<string, { clientName: string, data: InvoiceData, fileUrl: string, fileBuffer?: Buffer }>();

const generateId = () => crypto.randomBytes(8).toString('hex');

export const setupClientBot = (bot: Telegraf) => {
    setBotForNotifications(bot);

    bot.use(async (ctx, next) => {
        if (!ctx.from) return;
        const registered = await isClientRegistered(ctx.from.id);
        if (!registered) {
            await ctx.reply('❌ Sorry, I don\'t recognize your account.\nPlease contact your accountant to register.');
            return;
        }
        return next();
    });

    bot.start(async (ctx) => {
        const client = await getClientDetails(ctx.from!.id);
        await ctx.reply(`👋 Hello ${client.name}!\n\nSend me a photo or PDF of your invoice/receipt and I'll process it for you.`);
    });

    bot.on('photo', async (ctx) => {
        await ctx.reply('⏳ Processing your image...');
        try {
            const photo = ctx.message.photo.pop()!;
            const fileLink = await ctx.telegram.getFileLink(photo.file_id);

            // Download for re-upload to Drive later
            const response = await fetch(fileLink.href);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const result = await processImage(fileLink.href);
            const client = await getClientDetails(ctx.from!.id);

            const invoiceId = generateId();
            pendingInvoices.set(invoiceId, {
                clientName: client.name,
                data: result,
                fileUrl: fileLink.href,
                fileBuffer: buffer
            });

            await sendApprovalRequest(client.name, result, fileLink.href, invoiceId);

            await ctx.reply(`✅ Received! Sent to manager for approval.\n\nSupplier: ${result.supplier_name}\nTotal: ${result.total_amount} ₪`);

        } catch (error) {
            console.error('Error processing photo:', error);
            await ctx.reply('❌ Error processing image. Please try again or ensure the image is clear.');
        }
    });

    bot.on('document', async (ctx) => {
        const doc = ctx.message.document;
        if (doc.mime_type === 'application/pdf') {
            await ctx.reply('⏳ Processing your PDF...');
            try {
                const fileLink = await ctx.telegram.getFileLink(doc.file_id);

                const response = await fetch(fileLink.href);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const result = await processPdf(buffer);
                const client = await getClientDetails(ctx.from!.id);

                const invoiceId = generateId();
                pendingInvoices.set(invoiceId, {
                    clientName: client.name,
                    data: result,
                    fileUrl: fileLink.href,
                    fileBuffer: buffer
                });

                await sendApprovalRequest(client.name, result, fileLink.href, invoiceId);

                await ctx.reply(`✅ Received! Sent to manager for approval.\n\nSupplier: ${result.supplier_name}\nTotal: ${result.total_amount} ₪`);

            } catch (error) {
                console.error('Error processing PDF:', error);
                await ctx.reply('❌ Error processing PDF.');
            }
        } else {
            await ctx.reply('⚠️ Please send a PDF document or an image (JPG/PNG).');
        }
    });

    bot.on('text', async (ctx) => {
        await ctx.reply('📸 Please send a photo or PDF of the invoice.');
    });

    // Callback Handling

    bot.action(/^approve_invoice:(.+)$/, async (ctx) => {
        const invoiceId = ctx.match[1];
        const record = pendingInvoices.get(invoiceId);

        if (!record) {
            await ctx.answerCbQuery('Invoice expired or not found.');
            // Optional: edit message to say expired
            return;
        }

        await ctx.answerCbQuery('Approving...');

        try {
            // 1. Upload to Drive
            let driveLink = record.fileUrl; // Fallback
            if (record.fileBuffer) {
                const filename = `${record.data.date.replace(/\//g, '-')}_${record.data.supplier_name}_${record.data.invoice_number || 'inv'}.pdf`;
                driveLink = await uploadFileToDrive(record.fileBuffer, filename, record.clientName, record.data.date);
            }

            // 2. Log to Sheets
            await logInvoiceToSheet(record.clientName, record.data, driveLink, 'Manager');

            // 3. Update Manager Message
            await ctx.editMessageCaption(`✅ Approved and logged by Manager.\n\nSupplier: ${record.data.supplier_name}\nTotal: ${record.data.total_amount}`, { reply_markup: undefined });

            // 4. Notify Client (Optional implementation needed if we want message to client)
            // Ideally we need channel ID or user ID from original message. 
            // Mock:
            console.log(`Notify client ${record.clientName}: Invoice Approved.`);

        } catch (e) {
            console.error(e);
            await ctx.reply('❌ Error saving data.');
        }

        pendingInvoices.delete(invoiceId);
    });

    bot.action(/^reject_invoice:(.+)$/, async (ctx) => {
        const invoiceId = ctx.match[1];
        await ctx.answerCbQuery('Rejected!');
        await ctx.editMessageCaption('❌ Rejected - requires manual handling.', { reply_markup: undefined });
        pendingInvoices.delete(invoiceId);
    });
};
