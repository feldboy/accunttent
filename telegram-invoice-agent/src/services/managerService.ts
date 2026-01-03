import { Telegraf, Markup } from 'telegraf';
import { InvoiceData } from './aiService';

let botInstance: Telegraf | null = null;

export const setBotForNotifications = (bot: Telegraf) => {
    botInstance = bot;
};

export const sendApprovalRequest = async (clientName: string, invoice: InvoiceData, fileUrl: string, invoiceId?: string) => {
    const MANAGER_CHAT_ID = process.env.MANAGER_CHAT_ID;
    if (!botInstance) throw new Error('Bot instance not set for notifications');
    if (!MANAGER_CHAT_ID) throw new Error('MANAGER_CHAT_ID not set');

    // Fallback if no ID provided (shouldn't happen in new logic)
    const approveData = invoiceId ? `approve_invoice:${invoiceId}` : 'approve_invoice';
    const rejectData = invoiceId ? `reject_invoice:${invoiceId}` : 'reject_invoice';

    const message = `
📄 *New Invoice Pending Approval*

👤 Client: ${clientName}
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Date: ${invoice.date}
🏪 Supplier: ${invoice.supplier_name}
🔢 Invoice #: ${invoice.invoice_number || 'N/A'}
💰 Before VAT: ${invoice.amount_before_vat} ₪
📊 VAT: ${invoice.vat_amount} ₪
💵 Total: ${invoice.total_amount} ₪
🏷️ Category: ${invoice.category}
━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    try {
        await botInstance.telegram.sendPhoto(MANAGER_CHAT_ID, fileUrl, {
            caption: message,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Approve & Log', approveData),
                    Markup.button.callback('❌ Reject', rejectData)
                ]
            ])
        });
    } catch (e) {
        console.error('Failed to send photo to manager, trying message only:', e);
        await botInstance.telegram.sendMessage(MANAGER_CHAT_ID, message + `\n\n[File Link](${fileUrl})`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [
                    Markup.button.callback('✅ Approve & Log', approveData),
                    Markup.button.callback('❌ Reject', rejectData)
                ]
            ])
        });
    }
};
