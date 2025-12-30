import OpenAI from 'openai';
const pdfParse = require('pdf-parse');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export interface InvoiceData {
    date: string;
    supplier_name: string;
    invoice_number?: string;
    amount_before_vat: number;
    vat_amount: number;
    total_amount: number;
    category: string;
}

const SYSTEM_PROMPT = `You are an expert accountant assistant. Extract the following fields from the invoice:
- date (DD/MM/YYYY)
- supplier_name
- invoice_number (optional)
- amount_before_vat (number)
- vat_amount (number)
- total_amount (number)
- category (One of: Raw Materials, Rent, Utilities, Telecom, Fuel/Vehicle, Office Supplies, Professional Services, Salaries, Insurance, Marketing, Other)

If a field is missing, return null. 
Return ONLY valid JSON.
`;

export const processImage = async (imageUrl: string): Promise<InvoiceData> => {
    console.log(`Processing image: ${imageUrl}`);
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Analyze this invoice image and extract data." },
                        { type: "image_url", image_url: { url: imageUrl } }
                    ]
                }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("No content from OpenAI");

        const data = JSON.parse(content);
        return validateAndCalculate(data);
    } catch (error) {
        console.error("OpenAI Image Error:", error);
        throw error;
    }
};

export const processPdf = async (pdfBuffer: Buffer): Promise<InvoiceData> => {
    console.log('Processing PDF...');
    try {
        const data = await pdfParse(pdfBuffer);
        const text = data.text;

        if (!text || text.length < 50) {
            throw new Error("PDF seems to be an image scan (no text layer). Please convert to image.");
        }

        return extractDataFromText(text);
    } catch (error) {
        console.error("PDF Processing Error:", error);
        throw error;
    }
};

const extractDataFromText = async (text: string): Promise<InvoiceData> => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Analyze this invoice text:\n\n${text}` }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("No content from OpenAI");

        const data = JSON.parse(content);
        return validateAndCalculate(data);
    } catch (error) {
        console.error("OpenAI Text Error:", error);
        throw error;
    }
};

const validateAndCalculate = (data: any): InvoiceData => {
    // 2.2 VAT Calculation Rules
    let { amount_before_vat, vat_amount, total_amount } = data;

    // Ensure numbers
    amount_before_vat = Number(amount_before_vat) || 0;
    vat_amount = Number(vat_amount) || 0;
    total_amount = Number(total_amount) || 0;

    if (vat_amount > 0) {
        // USE detected value
    } else if (total_amount > 0) {
        // Calculate backwards
        amount_before_vat = Number((total_amount / 1.17).toFixed(2));
        vat_amount = Number((total_amount - amount_before_vat).toFixed(2));
    } else if (amount_before_vat > 0) {
        // Calculate forwards
        vat_amount = Number((amount_before_vat * 0.17).toFixed(2));
        total_amount = Number((amount_before_vat + vat_amount).toFixed(2));
    }

    return {
        date: data.date || '',
        supplier_name: data.supplier_name || 'Unknown',
        invoice_number: data.invoice_number,
        amount_before_vat,
        vat_amount,
        total_amount,
        category: data.category || 'Other'
    };
};
