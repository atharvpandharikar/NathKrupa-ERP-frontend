// Quote-related types for create-quote functionality

export interface ProductVariant {
    variant_id: string;
    title: string;
    price: number;
    price_inclusive_tax: number;
    variant_label: string;
    variants: Array<{
        id: number;
        attribute: { attribute_ref_name: string };
        attribute_value: string;
        get_label: string;
    }>;
}

export interface Product {
    product_id: string;
    title: string;
    price: number;
    price_inclusive_tax: number;
    taxes: number;
    image: string;
    stock: number;
    product_variant: ProductVariant[];
}

export interface QuoteItem {
    id: number;
    productName: string;
    quantity: number;
    listPrice: number;
    amount: number;
    taxPercentage: number;
    taxAmount: number;
    total: number;
    product_id?: string;
    variant_id?: string;
    selectedVariant?: ProductVariant;
    hsnCode?: string; // HSN code for the product
    unit?: { id: number; name: string; code: string; is_decimal: boolean } | null; // Unit of measurement
}

export interface BillTo {
    gst_no: string;
    city: string;
    org_name: string;
    name: string;
    contact_no: string;
    email: string;
    billing_address_1: string;
    billing_address_2: string;
    pin_code: string;
    state: string;
    date: string;
    customer_id?: string; // Customer ID for pricing lookup
}

export interface Other {
    shipping_charges: string | number | readonly string[] | undefined;
    discount: string;
}

export interface BillingInfo {
    gst_no: string;
    city: string;
    org_name: string;
    name: string;
    contact_no: string;
    email: string;
    billing_address_1: string;
    billing_address_2: string;
    pin_code: string;
    state: string;
    date: string;
}

export interface ProductPayload {
    title: string;
    product_id: string;
    tax: string;
    quantity: string;
    price: string;
}

export interface OtherCharges {
    shipping_charges: string;
    discount: string;
}

export interface InvoiceData {
    bill_to: BillingInfo[];
    products: ProductPayload[];
    other: OtherCharges[];
}
