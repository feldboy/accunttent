# POC Prompt: Telegram Invoice Management Agent (Client-to-Manager)

## Overview

Build an automated Telegram-based system that receives invoices from clients, extracts data using AI/OCR, routes them to a manager for approval, and logs approved entries to Google Sheets.

---

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CLIENT BOT    │────▶│   AI ENGINE     │────▶│  MANAGER BOT    │────▶│  GOOGLE SHEETS  │
│  (Telegram)     │     │  (OCR + NLP)    │     │  (Approval)     │     │  (Data Log)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │                        │
        │◀──────────────────────────────────────────────┼────────────────────────┘
        │              Confirmation Message             │
```

---

## Module 1: Client Interface (Telegram Bot)

### 1.1 Client Identification

The bot must identify clients before processing any invoice:

**Identification Method:**
- Match Telegram user ID or phone number against a predefined client list
- Client list stored in Google Sheets with columns: `Client Name | Telegram ID | Phone | Status`

**If client not recognized:**
```
❌ Sorry, I don't recognize your account.

Please contact your accountant to register your Telegram account in the system.
```

**If client recognized:**
```
👋 Hello [Client Name]!

Send me a photo or PDF of your invoice/receipt and I'll process it for you.
```

### 1.2 Input Handling

**Accepted formats:**
- Images: JPG, PNG, HEIC
- Documents: PDF

**If user sends text only:**
```
📸 Please send a photo or PDF of the invoice.

I can only process images or PDF files.
```

### 1.3 Image Quality Validation

Before processing, validate image quality. Reject if:
- Image is blurry or out of focus
- Image is cropped/partial
- Critical fields are not visible (supplier, date, total amount)

**Rejection message:**
```
⚠️ Sorry, I couldn't read the invoice clearly.

Possible issues:
• Image is blurry
• Part of the invoice is cut off
• Poor lighting

📸 Please send a clear, complete photo of the entire invoice.
```

---

## Module 2: AI Processing Engine

### 2.1 Data Extraction (OCR + AI)

Extract the following fields from each invoice:

| Field | Description | Required |
|-------|-------------|----------|
| date | Invoice/receipt date | Yes |
| supplier_name | Business name that issued the invoice | Yes |
| invoice_number | Document reference number | No |
| amount_before_vat | Net amount | Yes |
| vat_amount | VAT amount (17%) | Yes |
| total_amount | Gross amount including VAT | Yes |
| category | Auto-classified category | Yes |

### 2.2 VAT Calculation Rules

```
IF vat_amount is detected:
    USE detected value
ELSE IF only total_amount is detected:
    amount_before_vat = total_amount / 1.17
    vat_amount = total_amount - amount_before_vat
ELSE IF only amount_before_vat is detected:
    vat_amount = amount_before_vat * 0.17
    total_amount = amount_before_vat + vat_amount
```

### 2.3 Automatic Category Classification

Classify each invoice into ONE of these categories based on content analysis:

| Category | Keywords/Identifiers |
|----------|---------------------|
| Raw Materials | materials, inventory, stock, merchandise, supplies |
| Rent | rent, lease, rental, property |
| Utilities | electricity, water, municipal tax, city council |
| Telecom | phone, internet, cellular, Cellcom, Partner, Bezeq, HOT |
| Fuel/Vehicle | gas station, fuel, Sonol, Paz, Delek, parking, car service |
| Office Supplies | office, stationery, printing, paper |
| Professional Services | lawyer, accountant, consultant, software services |
| Salaries | salary, wages, payroll |
| Insurance | insurance, policy, coverage |
| Marketing | advertising, Google Ads, Facebook, marketing, design |
| Other | Anything not matching above categories |

---

## Module 3: Manager Approval Interface

### 3.1 Approval Request Message

After successful extraction, send to manager's Telegram (separate chat or group):

```
📄 New Invoice Pending Approval

👤 Client: [Client Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Date: [date]
🏪 Supplier: [supplier_name]
🔢 Invoice #: [invoice_number]
💰 Before VAT: [amount_before_vat] ₪
📊 VAT: [vat_amount] ₪
💵 Total: [total_amount] ₪
🏷️ Category: [category]
━━━━━━━━━━━━━━━━━━━━━━━━━━

📎 [Attached: Original invoice image/PDF]
```

### 3.2 Action Buttons

Display two inline buttons below the message:

```
[✅ Approve & Log]    [❌ Reject / Manual Fix]
```

### 3.3 Approval Flow

**If manager clicks "Approve & Log":**
1. Write data to Google Sheets (see Module 4)
2. Update manager message: "✅ Approved and logged by [Manager Name]"
3. Send confirmation to client (see 3.4)

**If manager clicks "Reject / Manual Fix":**
1. Prompt manager for rejection reason (optional)
2. Update manager message: "❌ Rejected - requires manual handling"
3. Do NOT log to Google Sheets
4. Optionally notify client: "Your invoice requires additional review. We'll be in touch."

### 3.4 Client Confirmation Message

After manager approval, send to client:

```
✅ Invoice Received & Approved

Your invoice from [supplier_name] for [total_amount] ₪ has been processed and logged.

Thank you!
```

---

## Module 4: Data Logging (Google Sheets)

### 4.1 Sheet Structure

Create/use a Google Sheet with the following columns:

| Column | Content |
|--------|---------|
| A | Timestamp (auto) |
| B | Client Name |
| C | Date |
| D | Supplier |
| E | Invoice Number |
| F | Amount Before VAT |
| G | VAT |
| H | Total |
| I | Category |
| J | Approved By |
| K | File Link |

### 4.2 Data Format

- **Dates:** DD/MM/YYYY
- **Amounts:** Numeric, 2 decimal places, no currency symbol
- **File Link:** Google Drive link to stored original invoice

### 4.3 File Storage

Store original invoice image/PDF in Google Drive:
- Folder structure: `Invoices/[Client Name]/[YYYY-MM]/`
- File naming: `[Date]_[Supplier]_[InvoiceNumber].[ext]`

---

## Bot Commands

### Client Bot Commands

| Command | Response |
|---------|----------|
| /start | Welcome message + instructions |
| /help | How to use the bot |
| /status | "You are registered as [Client Name]" |

### Manager Bot Commands

| Command | Response |
|---------|----------|
| /start | Welcome message |
| /pending | List of invoices awaiting approval |
| /stats | Today's processed invoices count |

---

## Error Handling

### Extraction Failure

If AI cannot extract minimum required fields (supplier, date, total):

**To Manager:**
```
⚠️ Extraction Issue - Manual Review Required

👤 Client: [Client Name]
📎 [Attached file]

Could not extract: [list of missing fields]

Please review manually.
```

**To Client:**
```
⚠️ I had trouble reading some details from your invoice.

I've forwarded it to your accountant for manual review.

You'll receive confirmation once it's processed.
```

### System Errors

Log all errors with:
- Timestamp
- Client ID
- Error type
- Original file reference

---

## Sample Interaction Flow

### Happy Path

```
CLIENT: [Sends photo of Sonol fuel receipt]

BOT → CLIENT: ⏳ Processing your invoice...

BOT → MANAGER: 
📄 New Invoice Pending Approval
👤 Client: ABC Ltd
📅 Date: 28/01/2025
🏪 Supplier: Sonol Israel Ltd
💵 Total: 350.00 ₪
🏷️ Category: Fuel/Vehicle
[✅ Approve & Log] [❌ Reject]

MANAGER: [Clicks ✅ Approve & Log]

BOT → CLIENT: 
✅ Invoice Received & Approved
Your invoice from Sonol Israel Ltd for 350.00 ₪ 
has been processed. Thank you!

GOOGLE SHEETS: [New row added with all data]
```

---

## Technical Requirements

### Integrations Required
- Telegram Bot API (two bots or one bot with routing logic)
- AI/OCR service (GPT-4 Vision, Google Vision API, or similar)
- Google Sheets API
- Google Drive API

### Environment Variables
```
TELEGRAM_CLIENT_BOT_TOKEN=xxx
TELEGRAM_MANAGER_BOT_TOKEN=xxx
MANAGER_CHAT_ID=xxx
GOOGLE_SHEETS_ID=xxx
GOOGLE_DRIVE_FOLDER_ID=xxx
OPENAI_API_KEY=xxx (if using GPT-4 Vision)
```

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Date extraction accuracy | >90% |
| Supplier extraction accuracy | >85% |
| Amount extraction accuracy | >95% |
| Category classification accuracy | >80% |
| End-to-end processing time | <30 seconds |
| Client identification | 100% |
| Approval flow completion | 100% |

---

## Out of Scope (Future Phases)

- WhatsApp integration
- Gmail auto-import
- Multi-manager approval
- Edit/correction interface for manager
- Analytics dashboard
- Automatic duplicate detection
- Client self-registration
