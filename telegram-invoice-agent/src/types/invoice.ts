export interface InvoiceData {
    date: string;
    supplier_name: string;
    invoice_number?: string;
    amount_before_vat: number;
    vat_amount: number;
    total_amount: number;
    category: string;
    category_he: string;
}
