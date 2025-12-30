"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInvoiceToSheet = exports.uploadFileToDrive = void 0;
const googleapis_1 = require("googleapis");
const stream_1 = __importDefault(require("stream"));
const path = require('path');
// Auth setup
// Requires GOOGLE_APPLICATION_CREDENTIALS env var to be set to path of json key file
// OR explicit key usage. For POC we assume default auth or mock if fails.
const auth = new googleapis_1.google.auth.GoogleAuth({
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
});
const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
const drive = googleapis_1.google.drive({ version: 'v3', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const uploadFileToDrive = async (buffer, filename, clientName, date) => {
    // 4.3 File Storage: Invoices/[Client Name]/[YYYY-MM]/
    // Skipping folder creation logic for brevity/POC, saving to root or PARENT_FOLDER_ID
    try {
        const bufferStream = new stream_1.default.PassThrough();
        bufferStream.end(buffer);
        const response = await drive.files.create({
            media: {
                mimeType: 'application/pdf', // Default assumption or pass it
                body: bufferStream
            },
            requestBody: {
                name: filename,
                parents: PARENT_FOLDER_ID ? [PARENT_FOLDER_ID] : undefined
            },
            fields: 'id, webViewLink'
        });
        return response.data.webViewLink || '';
    }
    catch (error) {
        console.error('Drive Upload Error:', error);
        return 'Link not available (Upload Failed)';
    }
};
exports.uploadFileToDrive = uploadFileToDrive;
const logInvoiceToSheet = async (clientName, invoice, fileLink, approver) => {
    if (!SPREADSHEET_ID) {
        console.warn('Skipping Google Sheet log (No ID provided)');
        return;
    }
    try {
        // 4.1 Sheet Structure
        // A: Timestamp, B: Client, C: Date, D: Supplier, E: Invoice #, F: Before VAT, G: VAT, H: Total, I: Category, J: Approved By, K: File
        const row = [
            new Date().toISOString(),
            clientName,
            invoice.date,
            invoice.supplier_name,
            invoice.invoice_number || '',
            invoice.amount_before_vat,
            invoice.vat_amount,
            invoice.total_amount,
            invoice.category,
            approver,
            fileLink
        ];
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:K',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [row]
            }
        });
        console.log('Logged to Google Sheets');
    }
    catch (error) {
        console.error('Sheets Log Error:', error);
        throw error;
    }
};
exports.logInvoiceToSheet = logInvoiceToSheet;
