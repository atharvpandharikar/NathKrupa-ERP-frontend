// Quotation list types for the quotations page

export interface Quotation {
    id: number;
    quotation_no: string;
    quotation_json: string;
    quotation_pdf: string;
    created_at: string;
    summary?: {
        org_name?: string;
        name?: string;
        contact_no?: string;
        email?: string;
        total_after_discount?: number;
    };
}

export interface ApiResponse {
    error: boolean;
    count: number;
    data: Quotation[];
}

export interface QuotationStats {
    todayCount: number;
    recentCount: number;
    totalCount: number;
}
