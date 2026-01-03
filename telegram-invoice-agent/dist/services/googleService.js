"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileToDrive = exports.logUserToSheet = exports.logInvoiceToSheet = exports.getOrCreateUserSheet = void 0;
const googleapis_1 = require("googleapis");
const config_1 = require("../config");
// Auth setup - requires GOOGLE_APPLICATION_CREDENTIALS env var
const auth = new googleapis_1.google.auth.GoogleAuth({
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
});
const sheets = googleapis_1.google.sheets({ version: 'v4', auth });
// In-memory cache for user sheet names (avoids repeated lookups)
const userSheetCache = new Map();
// Cache to track users already logged to prevent duplicates
const loggedUsers = new Set();
/**
 * Get or create a sheet (tab) within the main spreadsheet for a user
 */
const getOrCreateUserSheet = async (userId, userName) => {
    const userIdStr = String(userId);
    const sheetName = `${userName}-${userIdStr}`;
    // Check cache first
    if (userSheetCache.has(userIdStr)) {
        return userSheetCache.get(userIdStr);
    }
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
    if (!SPREADSHEET_ID) {
        throw new Error('GOOGLE_SHEETS_ID is not set');
    }
    // Check if sheet already exists
    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID
    });
    const existingSheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
    if (existingSheet) {
        userSheetCache.set(userIdStr, sheetName);
        return sheetName;
    }
    // Create new sheet (tab) for this user
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [{
                    addSheet: {
                        properties: {
                            title: sheetName,
                            rightToLeft: true
                        }
                    }
                }]
        }
    });
    // Add headers row
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A1:X1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [config_1.SHEET_HEADERS]
        }
    });
    // Format header row (bold, background color, freeze)
    const newSpreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID
    });
    const newSheet = newSpreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
    if (newSheet?.properties?.sheetId !== undefined) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [
                    {
                        repeatCell: {
                            range: {
                                sheetId: newSheet.properties.sheetId,
                                startRowIndex: 0,
                                endRowIndex: 1
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.2, green: 0.4, blue: 0.6 },
                                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                                    horizontalAlignment: 'CENTER'
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
                        }
                    },
                    {
                        updateSheetProperties: {
                            properties: {
                                sheetId: newSheet.properties.sheetId,
                                gridProperties: { frozenRowCount: 1 }
                            },
                            fields: 'gridProperties.frozenRowCount'
                        }
                    }
                ]
            }
        });
    }
    console.log(`Created new sheet tab for user ${userName}: ${sheetName}`);
    userSheetCache.set(userIdStr, sheetName);
    return sheetName;
};
exports.getOrCreateUserSheet = getOrCreateUserSheet;
/**
 * Log an invoice to the user's personal sheet (tab) within the main spreadsheet
 */
const logInvoiceToSheet = async (userId, userName, invoice, fileLink, approver) => {
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
    if (!SPREADSHEET_ID) {
        console.warn('Skipping Google Sheet log (No GOOGLE_SHEETS_ID provided)');
        return;
    }
    try {
        const sheetName = await (0, exports.getOrCreateUserSheet)(userId, userName);
        // Build row with amount in the correct category column
        const row = new Array(24).fill('');
        // Fixed columns
        row[0] = invoice.date; // A: תאריך
        row[1] = invoice.supplier_name; // B: ספק
        row[2] = invoice.invoice_number || ''; // C: מספר חשבונית
        row[23] = fileLink; // X: קישור
        // Put the amount in the correct category column
        const categoryColumn = config_1.CATEGORY_TO_COLUMN[invoice.category_he];
        if (categoryColumn !== undefined) {
            row[categoryColumn] = invoice.total_amount;
            console.log(`Invoice categorized as: ${invoice.category_he} (column ${categoryColumn + 1})`);
        }
        else {
            // Fallback: put in אחזקה (column D) if category not found
            console.warn(`Unknown category: ${invoice.category_he}, defaulting to אחזקה`);
            row[3] = invoice.total_amount;
        }
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${sheetName}'!A:X`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [row]
            }
        });
        console.log(`Logged invoice to sheet ${sheetName} - Category: ${invoice.category_he}`);
    }
    catch (error) {
        console.error('Error logging to sheet:', error);
        throw error;
    }
};
exports.logInvoiceToSheet = logInvoiceToSheet;
/**
 * Upload file to Drive (placeholder - service accounts have limitations)
 */
/**
 * Ensure the users sheet exists and has headers
 */
let usersSheetInitialized = false;
const ensureUsersSheet = async () => {
    // Skip if already verified this session
    if (usersSheetInitialized) {
        return;
    }
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
    if (!SPREADSHEET_ID) {
        throw new Error('GOOGLE_SHEETS_ID is not set');
    }
    try {
        // Check if users sheet exists
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID
        });
        console.log('Available sheets:', spreadsheet.data.sheets?.map(s => s.properties?.title));
        const existingSheet = spreadsheet.data.sheets?.find(s => s.properties?.title === config_1.USERS_SHEET_NAME);
        if (existingSheet) {
            console.log(`Users sheet already exists`);
            usersSheetInitialized = true;
            return;
        }
        // Create the users sheet
        console.log('Creating users sheet...');
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{
                        addSheet: {
                            properties: {
                                title: config_1.USERS_SHEET_NAME,
                                index: 0, // Make it the first sheet
                                rightToLeft: true
                            }
                        }
                    }]
            }
        });
        // Add headers
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${config_1.USERS_SHEET_NAME}'!A1:C1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [config_1.USERS_HEADERS]
            }
        });
        // Format header row
        const newSpreadsheet = await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID
        });
        const newSheet = newSpreadsheet.data.sheets?.find(s => s.properties?.title === config_1.USERS_SHEET_NAME);
        if (newSheet?.properties?.sheetId !== undefined) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    requests: [
                        {
                            repeatCell: {
                                range: {
                                    sheetId: newSheet.properties.sheetId,
                                    startRowIndex: 0,
                                    endRowIndex: 1
                                },
                                cell: {
                                    userEnteredFormat: {
                                        backgroundColor: { red: 0.1, green: 0.5, blue: 0.3 },
                                        textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                                        horizontalAlignment: 'CENTER'
                                    }
                                },
                                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
                            }
                        },
                        {
                            updateSheetProperties: {
                                properties: {
                                    sheetId: newSheet.properties.sheetId,
                                    gridProperties: { frozenRowCount: 1 }
                                },
                                fields: 'gridProperties.frozenRowCount'
                            }
                        }
                    ]
                }
            });
        }
        console.log('Created users sheet');
        usersSheetInitialized = true;
    }
    catch (error) {
        // If sheet already exists error, just mark as initialized
        if (error?.message?.includes('already exists')) {
            console.log('Users sheet already exists (from error)');
            usersSheetInitialized = true;
            return;
        }
        throw error;
    }
};
/**
 * Log a user to the users sheet (first sheet)
 */
const logUserToSheet = async (userId, userName) => {
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
    if (!SPREADSHEET_ID) {
        console.warn('Skipping user log (No GOOGLE_SHEETS_ID provided)');
        return;
    }
    const userIdStr = String(userId);
    // Skip if already logged this session
    if (loggedUsers.has(userIdStr)) {
        return;
    }
    try {
        await ensureUsersSheet();
        // Check if user already exists in the sheet
        const existingData = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${config_1.USERS_SHEET_NAME}'!C:C`
        });
        const existingIds = existingData.data.values?.flat() || [];
        if (existingIds.includes(userIdStr)) {
            loggedUsers.add(userIdStr);
            return; // User already exists in sheet
        }
        // Format current timestamp
        const now = new Date();
        const timestamp = now.toLocaleString('he-IL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        // Append user row
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `'${config_1.USERS_SHEET_NAME}'!A:C`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[timestamp, userName, userIdStr]]
            }
        });
        loggedUsers.add(userIdStr);
        console.log(`Logged new user: ${userName} (${userIdStr})`);
    }
    catch (error) {
        console.error('Error logging user to sheet:', error);
    }
};
exports.logUserToSheet = logUserToSheet;
/**
 * Upload file to Drive (placeholder - service accounts have limitations)
 */
const uploadFileToDrive = async (buffer, filename, clientName, date) => {
    console.log(`Skipping Drive upload for ${filename} (Service Account limitation)`);
    return 'File not uploaded (Drive disabled)';
};
exports.uploadFileToDrive = uploadFileToDrive;
