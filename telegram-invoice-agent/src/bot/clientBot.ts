import { Telegraf } from 'telegraf';
import { isClientRegistered, getClientDetails } from '../services/clientService';
import { processImage, processPdf, InvoiceData } from '../services/aiService';
import { sendApprovalRequest, setBotForNotifications } from '../services/managerService';
import { logInvoiceToSheet, uploadFileToDrive, logUserToSheet } from '../services/googleService';
import * as crypto from 'crypto';

// In-memory cache for pending approvals
const pendingInvoices = new Map<string, { userId: number | string, clientName: string, data: InvoiceData, fileUrl: string, fileBuffer?: Buffer }>();

const generateId = () => crypto.randomBytes(8).toString('hex');

export const setupClientBot = (bot: Telegraf) => {
    setBotForNotifications(bot);

    // For testing - skip client registration check
    const SKIP_AUTH = process.env.SKIP_AUTH === 'true';

    bot.use(async (ctx, next) => {
        if (!ctx.from) return;

        if (!SKIP_AUTH) {
            const registered = await isClientRegistered(ctx.from.id);
            if (!registered) {
                await ctx.reply('❌ מצטער, אני לא מזהה את החשבון שלך.\nאנא פנה לרואה החשבון שלך להרשמה.');
                return;
            }
        }

        // Log user to the users sheet (runs on any first interaction)
        const userName = ctx.from.first_name || 'משתמש';
        await logUserToSheet(ctx.from.id, userName);

        return next();
    });

    bot.start(async (ctx) => {
        const clientName = SKIP_AUTH ? ctx.from?.first_name || 'משתמש' : (await getClientDetails(ctx.from!.id)).name;
        await ctx.reply(`👋 שלום ${clientName}!\n\n📸 שלח לי תמונה או PDF של חשבונית/קבלה ואעבד אותה עבורך.`);
    });

    bot.command('help', async (ctx) => {
        await ctx.reply(`📋 איך להשתמש בבוט:

1️⃣ שלח תמונה של חשבונית או קבלה
2️⃣ אני אזהה את הפרטים אוטומטית
3️⃣ המידע יישלח לאישור המנהל
4️⃣ לאחר אישור, יירשם בטבלה

📎 פורמטים נתמכים: JPG, PNG, PDF`);
    });

    bot.on('photo', async (ctx) => {
        await ctx.reply('⏳ מעבד את התמונה...');
        try {
            const photo = ctx.message.photo.pop()!;
            const fileLink = await ctx.telegram.getFileLink(photo.file_id);

            // Download for re-upload to Drive later
            const response = await fetch(fileLink.href);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const result = await processImage(fileLink.href);
            const clientName = SKIP_AUTH ? ctx.from?.first_name || 'משתמש' : (await getClientDetails(ctx.from!.id)).name;

            const invoiceId = generateId();
            pendingInvoices.set(invoiceId, {
                userId: ctx.from!.id,
                clientName: clientName,
                data: result,
                fileUrl: fileLink.href,
                fileBuffer: buffer
            });

            // Format Hebrew response
            const responseMessage = `✅ זיהיתי חשבונית!

📄 פרטי החשבונית:
━━━━━━━━━━━━━━━━━
🏪 ספק: ${result.supplier_name}
📅 תאריך: ${result.date}
${result.invoice_number ? `🔢 מספר חשבונית: ${result.invoice_number}\n` : ''}💰 לפני מע"מ: ₪${result.amount_before_vat.toFixed(2)}
📊 מע"מ: ₪${result.vat_amount.toFixed(2)}
💵 סה"כ: ₪${result.total_amount.toFixed(2)}
📂 קטגוריה: ${result.category_he}
━━━━━━━━━━━━━━━━━`;

            await ctx.reply(responseMessage);

            // Send to manager if configured
            if (process.env.MANAGER_CHAT_ID) {
                await sendApprovalRequest(clientName, result, fileLink.href, invoiceId);
                await ctx.reply('📤 נשלח למנהל לאישור.');
            }

        } catch (error) {
            console.error('Error processing photo:', error);
            await ctx.reply(`❌ לא הצלחתי לזהות את המסמך

הסיבות האפשריות:
• התמונה לא ברורה
• המסמך לא חשבונית/קבלה
• טקסט לא קריא

💡 טיפים:
• צלם שוב באור טוב
• וודא שכל הטקסט נראה

🔄 נסה שוב`);
        }
    });

    bot.on('document', async (ctx) => {
        const doc = ctx.message.document;
        if (doc.mime_type === 'application/pdf') {
            await ctx.reply('⏳ מעבד את ה-PDF...');
            try {
                const fileLink = await ctx.telegram.getFileLink(doc.file_id);

                const response = await fetch(fileLink.href);
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const result = await processPdf(buffer);
                const clientName = SKIP_AUTH ? ctx.from?.first_name || 'משתמש' : (await getClientDetails(ctx.from!.id)).name;

                const invoiceId = generateId();
                pendingInvoices.set(invoiceId, {
                    userId: ctx.from!.id,
                    clientName: clientName,
                    data: result,
                    fileUrl: fileLink.href,
                    fileBuffer: buffer
                });

                const responseMessage = `✅ זיהיתי חשבונית!

📄 פרטי החשבונית:
━━━━━━━━━━━━━━━━━
🏪 ספק: ${result.supplier_name}
📅 תאריך: ${result.date}
${result.invoice_number ? `🔢 מספר חשבונית: ${result.invoice_number}\n` : ''}💰 לפני מע"מ: ₪${result.amount_before_vat.toFixed(2)}
📊 מע"מ: ₪${result.vat_amount.toFixed(2)}
💵 סה"כ: ₪${result.total_amount.toFixed(2)}
📂 קטגוריה: ${result.category_he}
━━━━━━━━━━━━━━━━━`;

                await ctx.reply(responseMessage);

                if (process.env.MANAGER_CHAT_ID) {
                    await sendApprovalRequest(clientName, result, fileLink.href, invoiceId);
                    await ctx.reply('📤 נשלח למנהל לאישור.');
                }

            } catch (error) {
                console.error('Error processing PDF:', error);
                await ctx.reply('❌ שגיאה בעיבוד ה-PDF. נסה לשלוח כתמונה.');
            }
        } else {
            await ctx.reply('⚠️ אנא שלח קובץ PDF או תמונה (JPG/PNG).');
        }
    });

    bot.on('text', async (ctx) => {
        await ctx.reply('📸 אנא שלח תמונה או PDF של החשבונית.\n\nאני יכול לעבד רק תמונות או קבצי PDF.');
    });

    // Callback Handling
    bot.action(/^approve_invoice:(.+)$/, async (ctx) => {
        const invoiceId = ctx.match[1];
        const record = pendingInvoices.get(invoiceId);

        if (!record) {
            await ctx.answerCbQuery('החשבונית פגה או לא נמצאה.');
            return;
        }

        await ctx.answerCbQuery('מאשר...');

        try {
            let driveLink = record.fileUrl;
            if (record.fileBuffer) {
                const filename = `${record.data.date.replace(/\//g, '-')}_${record.data.supplier_name}_${record.data.invoice_number || 'inv'}.pdf`;
                driveLink = await uploadFileToDrive(record.fileBuffer, filename, record.clientName, record.data.date);
            }

            await logInvoiceToSheet(record.userId, record.clientName, record.data, driveLink, 'Manager');

            // Send success message (don't try to edit - might fail if original wasn't a photo)
            try {
                await ctx.editMessageReplyMarkup(undefined); // Just remove the buttons
            } catch (e) {
                // Ignore edit errors
            }
            await ctx.reply(`✅ אושר ונרשם!\n\n🏪 ספק: ${record.data.supplier_name}\n💵 סה"כ: ₪${record.data.total_amount}\n📊 נשמר ב-Google Sheets`);

            console.log(`Notify client ${record.clientName}: Invoice Approved.`);

        } catch (e) {
            console.error(e);
            await ctx.reply('❌ שגיאה בשמירת הנתונים.');
        }

        pendingInvoices.delete(invoiceId);
    });

    bot.action(/^reject_invoice:(.+)$/, async (ctx) => {
        const invoiceId = ctx.match[1];
        await ctx.answerCbQuery('נדחה!');
        await ctx.editMessageCaption('❌ נדחה - דורש טיפול ידני.', { reply_markup: undefined });
        pendingInvoices.delete(invoiceId);
    });
};
