import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

async function testGemini() {
    console.log('🧪 Testing Gemini API...');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not found in .env');
        process.exit(1);
    }
    console.log('✅ API Key found');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Test 1: Simple text
    console.log('\n📝 Test 1: Simple text generation...');
    try {
        const result = await model.generateContent('Say "Hello from Gemini!" in Hebrew');
        console.log('Response:', result.response.text());
        console.log('✅ Text generation works!');
    } catch (error) {
        console.error('❌ Text generation failed:', error);
    }

    // Test 2: Invoice extraction prompt
    console.log('\n📄 Test 2: Invoice extraction simulation...');
    try {
        const invoiceText = `
        חשבונית מס קבלה
        פז חברת נפט בע"מ
        תאריך: 14/12/2024
        סה"כ לפני מע"מ: 292.31
        מע"מ: 49.69
        סה"כ לתשלום: 342.00
        `;

        const result = await model.generateContent(`
        חלץ מהחשבונית הבאה את הפרטים וחזור JSON:
        - date
        - supplier_name  
        - total_amount
        - vat_amount
        - category (fuel/electricity/water/other)
        
        ${invoiceText}
        
        החזר JSON בלבד.
        `);

        console.log('Response:', result.response.text());
        console.log('✅ Invoice extraction works!');
    } catch (error) {
        console.error('❌ Invoice extraction failed:', error);
    }

    console.log('\n✅ All tests completed!');
}

testGemini().catch(console.error);
