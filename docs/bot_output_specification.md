# 🤖 מפרט פלט הבוט - Accuntent Invoice Bot

## 1. סכמת קטגוריות הוצאות

בהתבסס על קובץ האקסל של הלקוחה, הבוט צריך לזהות את הקטגוריות הבאות:

```json
{
  "expense_categories": [
    {
      "id": "maintenance",
      "name_he": "אחזקה",
      "name_en": "Maintenance",
      "keywords": ["אחזקה", "תיקון", "שיפוץ"]
    },
    {
      "id": "vehicle_maintenance",
      "name_he": "אחזקת רכב",
      "name_en": "Vehicle Maintenance",
      "keywords": ["אחזקת רכב", "טיפול רכב", "מוסך", "צמיגים"]
    },
    {
      "id": "fuel",
      "name_he": "דלק",
      "name_en": "Fuel",
      "keywords": ["דלק", "בנזין", "סולר", "תדלוק", "פז", "סונול", "דור אלון", "דלק"]
    },
    {
      "id": "parking",
      "name_he": "חניה",
      "name_en": "Parking",
      "keywords": ["חניה", "חניון", "אחוזות החוף"]
    },
    {
      "id": "vehicle_insurance",
      "name_he": "ביטוח רכב",
      "name_en": "Vehicle Insurance",
      "keywords": ["ביטוח רכב", "ביטוח חובה", "ביטוח מקיף"]
    },
    {
      "id": "vehicle_license",
      "name_he": "רישיון רכב",
      "name_en": "Vehicle License",
      "keywords": ["רישיון רכב", "רשיון", "טסט"]
    },
    {
      "id": "vehicle_rental",
      "name_he": "השכרת רכב",
      "name_en": "Vehicle Rental",
      "keywords": ["השכרת רכב", "ליסינג", "שכירות רכב"]
    },
    {
      "id": "internet",
      "name_he": "אינטרנט",
      "name_en": "Internet",
      "keywords": ["אינטרנט", "בזק", "הוט", "פרטנר", "סלקום"]
    },
    {
      "id": "home_insurance",
      "name_he": "ביטוח דירה",
      "name_en": "Home Insurance",
      "keywords": ["ביטוח דירה", "ביטוח מבנה", "ביטוח תכולה"]
    },
    {
      "id": "property_tax",
      "name_he": "ארנונה",
      "name_en": "Property Tax",
      "keywords": ["ארנונה", "עירייה", "מועצה"]
    },
    {
      "id": "water",
      "name_he": "מים",
      "name_en": "Water",
      "keywords": ["מים", "מי אביבים", "מקורות", "תאגיד מים"]
    },
    {
      "id": "electricity",
      "name_he": "חשמל",
      "name_en": "Electricity",
      "keywords": ["חשמל", "חברת החשמל", "חח\"י"]
    },
    {
      "id": "mobile_phone",
      "name_he": "טלפון נייד",
      "name_en": "Mobile Phone",
      "keywords": ["טלפון", "סלולר", "פלאפון", "סלקום", "פרטנר", "הוט מובייל", "גולן"]
    },
    {
      "id": "refreshments",
      "name_he": "כיבודים",
      "name_en": "Refreshments",
      "keywords": ["כיבוד", "אירוח", "קפה", "עוגות"]
    },
    {
      "id": "professional_insurance",
      "name_he": "ביטוח מקצועי",
      "name_en": "Professional Insurance",
      "keywords": ["ביטוח מקצועי", "ביטוח אחריות מקצועית"]
    },
    {
      "id": "education",
      "name_he": "ספרות והשתלמות",
      "name_en": "Education & Books",
      "keywords": ["השתלמות", "קורס", "ספר", "הרצאה", "כנס", "סדנה"]
    },
    {
      "id": "professional_services",
      "name_he": "שירותים מקצועיים",
      "name_en": "Professional Services",
      "keywords": ["רואה חשבון", "עורך דין", "יועץ", "שירות מקצועי"]
    },
    {
      "id": "rent",
      "name_he": "שכירות",
      "name_en": "Rent",
      "keywords": ["שכירות", "דמי שכירות", "שכ\"ד"]
    },
    {
      "id": "office_supplies",
      "name_he": "משרדיות",
      "name_en": "Office Supplies",
      "keywords": ["משרד", "נייר", "דיו", "טונר", "מדפסת", "עטים"]
    },
    {
      "id": "consumables",
      "name_he": "ציוד מתכלה",
      "name_en": "Consumables",
      "keywords": ["ציוד מתכלה", "חומרי ניקוי", "מתכלים"]
    },
    {
      "id": "hoa_fees",
      "name_he": "ועד בית",
      "name_en": "HOA Fees",
      "keywords": ["ועד בית", "ועד הבית"]
    },
    {
      "id": "fixed_assets",
      "name_he": "רכוש קבוע",
      "name_en": "Fixed Assets",
      "keywords": ["רכוש קבוע", "מחשב", "ריהוט", "ציוד משרדי", "שולחן", "כסא"]
    },
    {
      "id": "depreciation",
      "name_he": "פחת",
      "name_en": "Depreciation",
      "keywords": ["פחת"]
    },
    {
      "id": "vehicle",
      "name_he": "רכב",
      "name_en": "Vehicle",
      "keywords": ["רכב", "רכישת רכב"]
    }
  ]
}
```

---

## 2. פורמט JSON לפלט הבוט

כאשר הבוט מקבל חשבונית/קבלה, הוא יחזיר את ה-JSON הבא:

```json
{
  "invoice_data": {
    "id": "INV-2024-001",
    "processed_at": "2024-12-15T10:30:00Z",
    "source": "telegram_image",
    
    "vendor": {
      "name": "פז חברת נפט בע\"מ",
      "business_id": "520039240",
      "address": "רחוב הרכבת 45, תל אביב"
    },
    
    "transaction": {
      "date": "2024-12-14",
      "time": "14:32",
      "invoice_number": "12345678",
      "payment_method": "credit_card"
    },
    
    "amounts": {
      "subtotal": 292.31,
      "vat_rate": 17,
      "vat_amount": 49.69,
      "total": 342.00,
      "currency": "ILS"
    },
    
    "classification": {
      "category_id": "fuel",
      "category_name_he": "דלק",
      "confidence": 0.95,
      "is_business_expense": true,
      "deductible_percentage": 100,
      "notes": null
    },
    
    "items": [
      {
        "description": "בנזין 95",
        "quantity": 34.5,
        "unit": "ליטר",
        "unit_price": 8.47,
        "total": 292.31
      }
    ]
  },
  
  "excel_mapping": {
    "column": "דלק",
    "row_month": "12/2024",
    "amount_to_add": 342.00
  },
  
  "status": "success",
  "requires_review": false,
  "review_reason": null
}
```

### דוגמאות נוספות:

#### חשבונית חשמל:
```json
{
  "invoice_data": {
    "id": "INV-2024-002",
    "vendor": {
      "name": "חברת החשמל לישראל בע\"מ"
    },
    "amounts": {
      "total": 856.69
    },
    "classification": {
      "category_id": "electricity",
      "category_name_he": "חשמל",
      "confidence": 0.98,
      "deductible_percentage": 25,
      "notes": "לפי אחוז משרד בבית"
    }
  },
  "excel_mapping": {
    "column": "חשמל",
    "amount_to_add": 214.17
  }
}
```

#### רכוש קבוע (לא מוכר):
```json
{
  "invoice_data": {
    "classification": {
      "category_id": "fixed_assets",
      "category_name_he": "רכוש קבוע",
      "is_business_expense": false,
      "notes": "שולחן וכסאות - לא מוכר כהוצאה"
    }
  },
  "excel_mapping": {
    "column": "רכוש קבוע",
    "special_handling": "depreciation"
  },
  "requires_review": true,
  "review_reason": "פריט רכוש קבוע - יש לחשב פחת"
}
```

---

## 3. דוגמאות הודעות טקסטואליות לבוט

### ✅ זיהוי מוצלח - דלק:
```
✅ זיהיתי חשבונית!

📄 פרטי החשבונית:
━━━━━━━━━━━━━━━━━
🏪 ספק: פז חברת נפט
📅 תאריך: 14/12/2024
💰 סכום: ₪342.00 (כולל מע״מ)

📂 קטגוריה: דלק
📊 יתווסף לטבלת ההוצאות שלך

━━━━━━━━━━━━━━━━━
📈 סה״כ הוצאות דלק החודש: ₪1,234.56
```

### ✅ זיהוי מוצלח - חשמל (עם יחס משרד):
```
✅ זיהיתי חשבונית!

📄 פרטי החשבונית:
━━━━━━━━━━━━━━━━━
🏪 ספק: חברת החשמל
📅 תאריך: 10/12/2024
💰 סכום מלא: ₪856.69

📂 קטגוריה: חשמל
🏠 אחוז משרד: 25%
💼 סכום מוכר: ₪214.17

━━━━━━━━━━━━━━━━━
📊 יתווסף לטבלת ההוצאות שלך
```

### ⚠️ זיהוי חלקי - דרוש אישור:
```
⚠️ זיהיתי חשבונית - נדרש אישור

📄 פרטי החשבונית:
━━━━━━━━━━━━━━━━━
🏪 ספק: אפסילון ציוד משרדי
📅 תאריך: 05/12/2024
💰 סכום: ₪3,247.00

❓ לא הצלחתי לקבוע קטגוריה בוודאות
אפשרויות אפשריות:
1️⃣ רכוש קבוע
2️⃣ משרדיות
3️⃣ ציוד מתכלה

👆 נא לבחור קטגוריה (1/2/3)
```

### 🔴 רכוש קבוע - לא מוכר:
```
📦 זיהיתי רכישת רכוש קבוע

📄 פרטים:
━━━━━━━━━━━━━━━━━
📝 פריט: שולחן וכסאות למשרד
📅 תאריך: 24/05/2024
💰 סכום: ₪30,000.00

⚠️ הערה חשובה:
רכוש קבוע לא מוכר כהוצאה שוטפת.
יש לחשב פחת שנתי.

📊 נרשם בטבלת רכוש קבוע
```

### ❌ לא הצלחתי לזהות:
```
❌ לא הצלחתי לזהות את המסמך

הסיבות האפשריות:
• התמונה לא ברורה
• המסמך לא חשבונית/קבלה
• טקסט לא קריא

💡 טיפים:
• צלם שוב באור טוב
• וודא שכל הטקסט נראה
• שלח PDF אם יש

🔄 נסה שוב או שלח ידנית
```

---

## 4. סיכום חודשי

הבוט יכול גם לייצר סיכום חודשי:

```
📊 סיכום הוצאות - דצמבר 2024
━━━━━━━━━━━━━━━━━━━━━━━━

💰 הכנסות: ₪81,855.00
📉 הוצאות: ₪18,550.57
━━━━━━━━━━━━━━━━━
📈 רווח: ₪57,298.50

פירוט הוצאות:
├── 🚗 רכב: ₪7,516.00
├── ⛽ דלק: ₪3,276.63
├── ⚡ חשמל: ₪1,620.00
├── 🏠 ארנונה: ₪1,915.88
├── 💧 מים: ₪383.18
├── 📱 טלפון: ₪1,101.92
├── 📚 השתלמות: ₪578.68
├── 🏢 משרדיות: ₪646.00
└── ... ועוד

📁 לצפייה בדו״ח מלא לחץ /report
```
