import { GoogleGenerativeAI } from '@google/generative-ai';
import { InvoiceData } from '../types/invoice';
import { CATEGORIES, SYSTEM_PROMPT } from '../config';

// Lazy initialization to ensure dotenv is loaded first
let genAI: GoogleGenerativeAI | null = null;

const getGenAI = () => {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set in environment');
        }
        console.log('Initializing Gemini with API key:', apiKey.substring(0, 10) + '...');
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
};

export const processImage = async (imageUrl: string): Promise<InvoiceData> => {
    console.log(`Processing image with Gemini: ${imageUrl}`);
    try {
        // Download image and convert to base64
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        // Telegram often returns octet-stream, detect proper MIME from URL or default to jpeg
        let mimeType = response.headers.get('content-type') || 'image/jpeg';
        if (mimeType === 'application/octet-stream') {
            // Try to detect from URL extension
            if (imageUrl.includes('.png')) {
                mimeType = 'image/png';
            } else if (imageUrl.includes('.webp')) {
                mimeType = 'image/webp';
            } else {
                mimeType = 'image/jpeg'; // Default for Telegram photos
            }
        }

        const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent([
            SYSTEM_PROMPT,
            {
                inlineData: {
                    mimeType,
                    data: base64
                }
            },
            'נתח את תמונת החשבונית הזו וחלץ את הנתונים. החזר JSON בלבד.'
        ]);

        const text = result.response.text();
        console.log('Gemini response:', text);

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in Gemini response');

        const data = JSON.parse(jsonMatch[0]);
        return validateAndCalculate(data);
    } catch (error) {
        console.error('Gemini Image Error:', error);
        throw error;
    }
};

export const processPdf = async (pdfBuffer: Buffer): Promise<InvoiceData> => {
    console.log('Processing PDF with Gemini...');
    try {
        // Send PDF directly to Gemini (it supports PDF)
        const base64 = pdfBuffer.toString('base64');

        const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent([
            SYSTEM_PROMPT,
            {
                inlineData: {
                    mimeType: 'application/pdf',
                    data: base64
                }
            },
            'נתח את קובץ ה-PDF הזה וחלץ את פרטי החשבונית. החזר JSON בלבד.'
        ]);

        const text = result.response.text();
        console.log('Gemini PDF response:', text);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in Gemini response');

        const data = JSON.parse(jsonMatch[0]);
        return validateAndCalculate(data);
    } catch (error) {
        console.error('PDF Processing Error:', error);
        throw error;
    }
};

const extractDataFromText = async (text: string): Promise<InvoiceData> => {
    try {
        const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent([
            SYSTEM_PROMPT,
            `נתח את טקסט החשבונית הבא:\n\n${text}\n\nהחזר JSON בלבד.`
        ]);

        const responseText = result.response.text();
        console.log('Gemini text response:', responseText);

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in Gemini response');

        const data = JSON.parse(jsonMatch[0]);
        return validateAndCalculate(data);
    } catch (error) {
        console.error('Gemini Text Error:', error);
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

    // Find Hebrew category name
    const categoryId = data.category || 'other';
    const categoryInfo = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES.find(c => c.id === 'other')!;

    return {
        date: data.date || '',
        supplier_name: data.supplier_name || 'Unknown',
        invoice_number: data.invoice_number,
        amount_before_vat,
        vat_amount,
        total_amount,
        category: categoryInfo.id,
        category_he: categoryInfo.he
    };
};
