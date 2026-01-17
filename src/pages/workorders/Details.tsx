import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workOrdersApi, addedFeaturesApi, featureApi, getTokens, vehicleIntakeApi, vehicleIntakeImagesApi, API_ROOT, financeApi, billsApi, type AddedFeature, type FeatureCategory, type FeatureType, type FeaturePrice, type VehicleIntake, type VehicleIntakeImage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { WorkOrderDatePicker } from "@/components/ui/work-order-date-picker";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ArrowLeft, Printer, Play, CreditCard, Eye, Plus, Truck, Loader2, Upload, Images, FileText, X, MessageCircle } from "lucide-react";
import { runWithConcurrencyDetailed, maybeCompressImage } from "@/lib/utils";

// Bill PDF Generation Function
async function generateBillPDF(billData: any) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = margin;
  
  // Ensure we don't exceed page height
  const minBottomMargin = 60; // Space needed for footer, bank details, signature

  // Colors from the design
  const darkBlue = [0, 51, 102]; // #003366
  const orange = [255, 140, 0]; // #FF8C00
  const lightGray = [245, 245, 245];
  const borderGray = [200, 200, 200];

  // Helper function to convert number to words (Indian numbering system)
  function numberToWords(num: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    function convertHundreds(n: number): string {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) {
        const ten = Math.floor(n / 10);
        const one = n % 10;
        return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
      }
      const hundred = Math.floor(n / 100);
      const remainder = n % 100;
      return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
    }
    
    if (num === 0) return 'Zero';
    
    // Handle crores
    if (num >= 10000000) {
      const crore = Math.floor(num / 10000000);
      const remainder = num % 10000000;
      return convertHundreds(crore) + ' Crore' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
    }
    
    // Handle lakhs
    if (num >= 100000) {
      const lakh = Math.floor(num / 100000);
      const remainder = num % 100000;
      return convertHundreds(lakh) + ' Lakh' + (remainder > 0 ? ' ' + numberToWords(remainder) : '');
    }
    
    // Handle thousands
    if (num >= 1000) {
      const thousand = Math.floor(num / 1000);
      const remainder = num % 1000;
      return convertHundreds(thousand) + ' Thousand' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '');
    }
    
    return convertHundreds(num);
  }

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num || 0);
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // ===== HEADER SECTION =====
  // Company Logo Area (left side) - 25mm x 25mm
  doc.setFillColor(...darkBlue);
  doc.rect(margin, currentY, 25, 25, 'F');
  
  // Draw NB logo (simplified - just text for now)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('NB', margin + 12.5, currentY + 15, { align: 'center' });

  // Company Name and Details (right side of logo)
  doc.setTextColor(...darkBlue);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const companyNameX = margin + 28;
  doc.text('NATHKRUPA BODY BUILDER', companyNameX, currentY + 8);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('AND AUTO ACCESSORIES', companyNameX, currentY + 14);
  
  // Business description in oval shape (simulated with rounded rectangle)
  doc.setFontSize(7);
  doc.setDrawColor(...darkBlue);
  doc.setLineWidth(0.5);
  const ovalWidth = 75;
  const ovalHeight = 7;
  const ovalX = companyNameX;
  const ovalY = currentY + 17;
  doc.roundedRect(ovalX, ovalY, ovalWidth, ovalHeight, 3, 3, 'S');
  
  // Split text into two lines for better fit
  const businessDesc = 'All Kind of Accessories and Body Parts Original Body Dealers';
  const textLines = doc.splitTextToSize(businessDesc, ovalWidth - 4);
  const lineHeight = 3;
  const startTextY = ovalY + (ovalHeight / 2) - ((textLines.length - 1) * lineHeight / 2) + 2;
  
  doc.setTextColor(...darkBlue);
  doc.setFont('helvetica', 'normal');
  textLines.forEach((line: string, index: number) => {
    doc.text(line, ovalX + ovalWidth / 2, startTextY + (index * lineHeight), { align: 'center' });
  });

  currentY += 28;

  // Company Address and Contact Info
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const companyAddress = billData.company?.address || 'Gat No. 379, Gavhanewadi, Pune-Nagar Road, Tal. Shrigonda, Dist. Ahmednagar';
  doc.text(companyAddress, margin, currentY);
  currentY += 5;
  
  const mobile = billData.company?.mobile || '9850523224';
  const gstin = billData.company?.gstin || '27AHXPT3625N1ZB';
  const email = billData.company?.email || 'contact@nathkrupabody.com';
  
  doc.setFontSize(8);
  doc.text(`Mobile: ${mobile}`, margin, currentY);
  doc.text(`GSTIN: ${gstin}`, margin + 55, currentY);
  doc.text(`Email: ${email}`, margin + 110, currentY);
  currentY += 7;

  // ===== BILL INFO SECTION =====
  // Draw border around bill info
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.5);
  const billInfoHeight = 32;
  doc.rect(margin, currentY, contentWidth, billInfoHeight, 'S');
  
  const billInfoY = currentY + 4;
  const leftColX = margin + 4;
  const rightColX = margin + contentWidth / 2 + 4;
  const dividerX = margin + contentWidth / 2;

  // Left Column - Customer Details
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('M/s.:', leftColX, billInfoY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const customerName = billData.customer?.name || billData.customer_name || billData.quotation?.customer?.name || 'N/A';
  doc.text(customerName, leftColX + 12, billInfoY, { maxWidth: dividerX - leftColX - 15 });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Address:', leftColX, billInfoY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const customerAddress = billData.customer?.address || billData.customer_address || 'N/A';
  doc.text(customerAddress, leftColX + 12, billInfoY + 5.5, { maxWidth: dividerX - leftColX - 15 });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Place of Supply:', leftColX, billInfoY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(billData.place_of_supply || 'None', leftColX + 28, billInfoY + 11);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('GSTIN No.:', leftColX, billInfoY + 16.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const customerGstin = billData.customer?.gstin || billData.customer_gstin || 'None';
  doc.text(customerGstin, leftColX + 22, billInfoY + 16.5);

  // Right Column - Invoice Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Bill No.:', rightColX, billInfoY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const billNumber = billData.bill_number || billData.bill_no || 'N/A';
  doc.text(billNumber, rightColX + 18, billInfoY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Date:', rightColX, billInfoY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(formatDate(billData.bill_date || billData.date || new Date().toISOString()), rightColX + 18, billInfoY + 5.5);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Vehicle:', rightColX, billInfoY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const vehicleName = billData.vehicle?.name || billData.vehicle_name || billData.vehicle_model || billData.quotation?.vehicle_model?.name || 'N/A';
  doc.text(vehicleName, rightColX + 18, billInfoY + 11);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Vehicle No.:', rightColX, billInfoY + 16.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(billData.vehicle_number || billData.vehicle_no || billData.quotation?.vehicle_number || 'None', rightColX + 23, billInfoY + 16.5);

  // Vertical divider line
  doc.setLineWidth(0.3);
  doc.line(dividerX, currentY, dividerX, currentY + billInfoHeight);

  currentY += billInfoHeight + 5;

  // ===== ITEMS TABLE =====
  // Table headers
  const tableHeaders = [['Sr.No', 'Particulars', 'HSN Code', 'Qty.', 'Rate', 'Amount']];
  
  // Prepare table data
  const items = billData.items || billData.features || billData.quotation?.features || [];
  const tableData = items.map((item: any, index: number) => [
    (index + 1).toString(),
    item.name || item.particulars || item.feature_name || item.custom_name || 'N/A',
    item.hsn_code || item.hsn || '',
    (item.quantity || item.qty || '0').toString(),
    formatCurrency(item.unit_price || item.rate || 0),
    formatCurrency(item.total || item.amount || item.total_price || 0)
  ]);

  // Calculate column widths to fit content width (180mm total)
  const colWidths = {
    srNo: 12,
    particulars: 85,
    hsn: 20,
    qty: 18,
    rate: 22,
    amount: 23
  };
  // Total: 12 + 85 + 20 + 18 + 22 + 23 = 180mm (fits in contentWidth)

  // Generate table
  autoTable(doc, {
    head: tableHeaders,
    body: tableData.length > 0 ? tableData : [['1', 'No items', '', '', '', '']],
    startY: currentY,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      overflow: 'linebreak',
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
      textColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      lineColor: [200, 200, 200],
      lineWidth: 0.5
    },
    bodyStyles: {
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: colWidths.srNo, halign: 'center' }, // Sr.No
      1: { cellWidth: colWidths.particulars, halign: 'left' }, // Particulars
      2: { cellWidth: colWidths.hsn, halign: 'center' }, // HSN Code
      3: { cellWidth: colWidths.qty, halign: 'center' }, // Qty.
      4: { cellWidth: colWidths.rate, halign: 'right' }, // Rate
      5: { cellWidth: colWidths.amount, halign: 'right' } // Amount
    },
    theme: 'plain',
    showHead: 'everyPage',
    didDrawPage: (data: any) => {
      // Draw watermark on each page behind the table (very light)
      doc.setGState(doc.GState({ opacity: 0.05 }));
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(100);
      doc.setFont('helvetica', 'bold');
      const watermarkY = pageHeight / 2;
      doc.text('NB', pageWidth / 2, watermarkY, { align: 'center' });
      doc.setGState(doc.GState({ opacity: 1.0 }));
      doc.setTextColor(0, 0, 0);
    }
  });

  const finalTableY = (doc as any).lastAutoTable.finalY || currentY + 50;
  currentY = finalTableY + 8;
  
  // Check if we need a new page for summary
  if (currentY + 50 > pageHeight - minBottomMargin) {
    doc.addPage();
    currentY = margin;
  }

  // ===== FINANCIAL SUMMARY =====
  // Calculate total from items if not provided
  let totalAmount = parseFloat(billData.total_amount || billData.grand_total || billData.quoted_price || billData.final_total || billData.quotation?.final_total || billData.quotation?.suggested_total || 0);
  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum: number, item: any) => {
      return sum + parseFloat(item.total || item.amount || item.total_price || 0);
    }, 0);
  }
  
  const discount = parseFloat(billData.discount || billData.total_discount_amount || 0);
  const cgstPercent = parseFloat(billData.cgst_percent || billData.cgst || 9);
  const sgstPercent = parseFloat(billData.sgst_percent || billData.sgst || 9);
  
  // GST is typically calculated on the amount after discount
  const taxableAmount = totalAmount - discount;
  const cgstAmount = (taxableAmount * cgstPercent) / 100;
  const sgstAmount = (taxableAmount * sgstPercent) / 100;
  const grandTotal = taxableAmount + cgstAmount + sgstAmount;

  // Summary box - positioned on the right side
  const summaryWidth = 60;
  const summaryX = pageWidth - margin - summaryWidth;
  const summaryHeight = 38;

  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.5);
  doc.rect(summaryX, currentY, summaryWidth, summaryHeight, 'S');

  let summaryY = currentY + 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  doc.text('Total Amount:', summaryX + 2, summaryY);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${formatCurrency(totalAmount)}`, summaryX + summaryWidth - 2, summaryY, { align: 'right' });
  summaryY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.text('Discount:', summaryX + 2, summaryY);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${formatCurrency(discount)}`, summaryX + summaryWidth - 2, summaryY, { align: 'right' });
  summaryY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.text(`CGST (${cgstPercent}%):`, summaryX + 2, summaryY);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${formatCurrency(cgstAmount)}`, summaryX + summaryWidth - 2, summaryY, { align: 'right' });
  summaryY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.text(`SGST (${sgstPercent}%):`, summaryX + 2, summaryY);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${formatCurrency(sgstAmount)}`, summaryX + summaryWidth - 2, summaryY, { align: 'right' });
  summaryY += 4.5;

  doc.setDrawColor(...darkBlue);
  doc.setLineWidth(0.8);
  doc.line(summaryX + 2, summaryY, summaryX + summaryWidth - 2, summaryY);
  summaryY += 4.5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('G. TOTAL:', summaryX + 2, summaryY);
  doc.text(`Rs. ${formatCurrency(grandTotal)}`, summaryX + summaryWidth - 2, summaryY, { align: 'right' });
  summaryY += 5;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const amountInWords = numberToWords(Math.floor(grandTotal));
  doc.text(`Rs. in Words: ${amountInWords} Only`, summaryX + 2, summaryY, { maxWidth: summaryWidth - 4 });

  currentY = Math.max(currentY + summaryHeight, summaryY + 8);

  // ===== BANK DETAILS AND SIGNATURE SECTION =====
  // Ensure we have enough space at bottom
  const bottomSectionY = Math.min(currentY + 10, pageHeight - 55);
  
  // Bank Details (Left)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Bank Details', margin, bottomSectionY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const bankName = billData.bank?.name || billData.bank_name || 'Bank of Maharashtra, Shirur';
  doc.text(`Bank & Branch: ${bankName}`, margin, bottomSectionY + 5);
  const accountNumber = billData.bank?.account_number || billData.account_number || '60271451322';
  doc.text(`Account No.: ${accountNumber}`, margin, bottomSectionY + 10);
  const ifscCode = billData.bank?.ifsc || billData.ifsc_code || 'MAHB0000254';
  doc.text(`IFSC Code: ${ifscCode}`, margin, bottomSectionY + 15);

  // Signature Section (Right)
  const signatureX = pageWidth - margin - 55;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Received Sign.', signatureX, bottomSectionY);
  doc.line(signatureX, bottomSectionY + 2, signatureX + 50, bottomSectionY + 2);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('NATHKRUPA BODY BUILDER', signatureX, bottomSectionY + 8, { maxWidth: 55 });
  doc.setFontSize(7);
  doc.text('AND AUTO ACCESSORIES', signatureX, bottomSectionY + 12, { maxWidth: 55 });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Authorised Signatory', signatureX, bottomSectionY + 18);
  doc.line(signatureX, bottomSectionY + 20, signatureX + 50, bottomSectionY + 20);

  // ===== FOOTER =====
  const footerY = pageHeight - 12;
  doc.setFillColor(...orange);
  doc.rect(0, footerY, pageWidth, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  const website = billData.company?.website || 'www.nathkrupa.com';
  
  doc.text(`Email: ${email}`, margin, footerY + 4);
  doc.text(`Mobile: ${mobile}`, margin + 50, footerY + 4);
  doc.text(`Website: ${website}`, margin + 100, footerY + 4);
  
  // Page number
  doc.text('1/1', pageWidth - margin - 5, footerY + 4, { align: 'right' });

  // Save PDF
  const filename = `Bill_${billNumber}.pdf`;
  doc.save(filename);
}

// NOTE: backend status is 'workdone' (no underscore) – align constants
const STATUS_ORDER = ["scheduled", "in_progress", "completed", "cancelled"] as const;
const STATUS_LABELS: Record<string, string> = { scheduled: "Scheduled", in_progress: "In Process", completed: "Completed", cancelled: "Cancelled" };
// progress actions mapping: current status -> next mutation action
const STATUS_PROGRESS: Record<string, { action: string; label: string }> = {
  scheduled: { action: 'start_job', label: 'Start Job' },
  in_progress: { action: 'complete_job', label: 'Complete Job' },
  completed: { action: '', label: '' },
  cancelled: { action: '', label: '' },
};

export default function WorkOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const numericId = id && /^\d+$/.test(id) ? Number(id) : null;

  const { data: workOrder, isLoading, error } = useQuery({
    queryKey: ["work-order", numericId],
    queryFn: () => workOrdersApi.getById(numericId!),
    enabled: numericId !== null,
  });
  const { data: addedFeatures = [] } = useQuery({
    queryKey: ["added-features", workOrder?.id],
    queryFn: () => addedFeaturesApi.list({ work_order: workOrder?.id }),
    enabled: !!numericId && !!workOrder?.id,
  });
  // Fetch finance transactions linked to this work order by bill number or work order number
  const billNumber = workOrder?.bill_number || workOrder?.work_order_number;
  const { data: allFinanceTransactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["finance-transactions", "work-order", billNumber],
    queryFn: async () => {
      if (!billNumber) return [];
      try {
        // Fetch transactions with bill_no filter (case-insensitive matching)
        const response = await financeApi.get<any>(`/transactions/?bill_no=${encodeURIComponent(billNumber)}&page_size=100`);
        // Handle paginated response
        let transactions: any[] = [];
        if (Array.isArray(response)) {
          transactions = response;
        } else if (response.results) {
          transactions = response.results;
        }
        
        // Filter transactions that match the bill number (case-insensitive)
        const normalizedBillNumber = billNumber?.toUpperCase().trim();
        return transactions.filter((t: any) => {
          const transactionBillNo = (t.bill_no || '').toUpperCase().trim();
          return transactionBillNo === normalizedBillNumber;
        });
      } catch (error) {
        console.error('Error fetching finance transactions:', error);
        return [];
      }
    },
    enabled: !!billNumber && !!workOrder,
  });

  // Show all transactions (both Credit and Debit) that match the bill number
  const financeTransactions = allFinanceTransactions || [];

  // Debug logging
  // console.log('Work Order Debug:', {
  //   workOrderNumber: workOrder?.work_order_number,
  //   customerName,
  //   allFinanceTransactions: allFinanceTransactions.length,
  //   filteredTransactions: financeTransactions.length,
  //   isLoading
  // });
  

  // filteredPayments logic removed - all payments now handled through finance app
  const { data: intake } = useQuery<VehicleIntake | undefined>({
    queryKey: ["vehicle-intake", numericId],
    queryFn: async () => {
      if (!workOrder?.id) return undefined;
      try {
        return await vehicleIntakeApi.getByWorkOrder(workOrder.id);
      } catch (error) {
        // Return undefined if not found instead of throwing
        return undefined;
      }
    },
    enabled: !!numericId,
  });

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    account: "",
    transaction_type: "Credit",
    amount: "0",
    date_time: new Date().toISOString().slice(0, 16),
    purpose: "",
    from_party: "",
    bill_number: "",
    utr_reference: ""
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [addWorkDialogOpen, setAddWorkDialogOpen] = useState(false);
  const [addWorkForm, setAddWorkForm] = useState({ feature_name: "", quantity: "1", unit_price: "", cost: "", notes: "" });
  const [addWorkExisting, setAddWorkExisting] = useState(true);
  const [parentCategories, setParentCategories] = useState<FeatureCategory[]>([]);
  const [childCategories, setChildCategories] = useState<FeatureCategory[]>([]);
  const [featureTypes, setFeatureTypes] = useState<FeatureType[]>([]);
  const [featurePrices, setFeaturePrices] = useState<FeaturePrice[]>([]);
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<number | null>(null);
  const [selectedChildCategoryId, setSelectedChildCategoryId] = useState<number | null>(null);
  const [selectedFeatureType, setSelectedFeatureType] = useState<number | null>(null);
  const [autoUnitPrice, setAutoUnitPrice] = useState<number | null>(null);
  const [financeAccounts, setFinanceAccounts] = useState<any[]>([]);
  // Bill print options - removed GST mode as it's now handled by backend

  // Derive total cost when quantity or unit price changes (mimic quotation feature dialog experience)
  useEffect(() => {
    const q = parseFloat(addWorkForm.quantity || '0');
    const u = parseFloat(addWorkForm.unit_price || '0');
    if (q > 0 && u >= 0) {
      const total = q * u;
      setAddWorkForm(prev => ({ ...prev, cost: String(total) }));
    } else if (!addWorkForm.unit_price) {
      setAddWorkForm(prev => ({ ...prev, cost: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addWorkForm.quantity, addWorkForm.unit_price]);

  // Load data when Add Work dialog opens
  useEffect(() => {
    if (!addWorkDialogOpen) return;
    setSelectedParentCategoryId(null); setSelectedChildCategoryId(null); setSelectedFeatureType(null);
    setChildCategories([]); setFeatureTypes([]); setFeaturePrices([]);
    featureApi.parentCategories().then(setParentCategories).catch(() => { });
    const vmId = (workOrder as any)?.quotation?.vehicle_model_id || (workOrder as any)?.quotation?.vehicle_model?.id || (workOrder as any)?.work_order?.quotation?.vehicle_model_id || (workOrder as any)?.work_order?.quotation?.vehicle_model?.id;
    if (vmId) {
      featureApi.pricesByModel(vmId)
        .then((prices: any) => {
          // Ensure prices is always an array
          if (Array.isArray(prices)) {
            setFeaturePrices(prices);
          } else if (prices && Array.isArray(prices.results)) {
            setFeaturePrices(prices.results);
          } else {
            setFeaturePrices([]);
          }
        })
        .catch(() => { 
          setFeaturePrices([]);
        });
    } else {
      setFeaturePrices([]);
    }
  }, [addWorkDialogOpen, workOrder]);

  // Load finance accounts and pre-fill form when payment dialog opens
  useEffect(() => {
    if (!paymentDialogOpen) return;

    // Load finance accounts
    financeApi.get('/accounts/').then((response: any) => {
      if (Array.isArray(response)) {
        setFinanceAccounts(response);
      } else if (response && Array.isArray(response.results)) {
        setFinanceAccounts(response.results);
      }
    }).catch(() => { });

    // Pre-fill form with work order data
    if (workOrder) {
      setPaymentForm(prev => ({
        ...prev,
        from_party: (workOrder.quotation?.customer || workOrder.work_order?.quotation?.customer)?.name || "",
        bill_number: workOrder.bill_number || workOrder.work_order_number,
        purpose: `Payment received for ${workOrder.bill_number ? 'bill' : 'work order'} ${workOrder.bill_number || workOrder.work_order_number}`,
      }));
    }
  }, [paymentDialogOpen, workOrder]);

  useEffect(() => {
    if (!addWorkDialogOpen) return;
    if (selectedParentCategoryId == null) { 
      setChildCategories([]); 
      setSelectedChildCategoryId(null); 
      return; 
    }
    // Fetch all categories and filter for child categories of the selected parent
    featureApi.categories()
      .then((allCategories) => {
        // Filter for child categories (where parent matches selectedParentCategoryId)
        const childCats = allCategories.filter((c: any) => 
          (c.parent && c.parent.id === selectedParentCategoryId) || 
          c.parent_id === selectedParentCategoryId
        );
        console.log('Loaded child categories for parent', selectedParentCategoryId, ':', childCats);
        setChildCategories(childCats);
      })
      .catch((error) => { 
        console.error('Error loading child categories:', error);
        setChildCategories([]);
      });
  }, [selectedParentCategoryId, addWorkDialogOpen]);

  useEffect(() => {
    if (!addWorkDialogOpen) return;
    if (!selectedChildCategoryId) { setFeatureTypes([]); setSelectedFeatureType(null); return; }
    const vmId = (workOrder as any)?.quotation?.vehicle_model_id || (workOrder as any)?.quotation?.vehicle_model?.id || (workOrder as any)?.work_order?.quotation?.vehicle_model_id || (workOrder as any)?.work_order?.quotation?.vehicle_model?.id;
    if (vmId) {
      featureApi.byVehicleModel(vmId, selectedChildCategoryId).then(setFeatureTypes).catch(() => { });
    } else {
      setFeatureTypes([]);
    }
  }, [selectedChildCategoryId, addWorkDialogOpen, workOrder]);

  useEffect(() => {
    if (!addWorkDialogOpen || !addWorkExisting) { setAutoUnitPrice(null); return; }
    const vmId = (workOrder as any)?.quotation?.vehicle_model_id || (workOrder as any)?.quotation?.vehicle_model?.id || (workOrder as any)?.work_order?.quotation?.vehicle_model_id || (workOrder as any)?.work_order?.quotation?.vehicle_model?.id;
    if (!vmId) { setAutoUnitPrice(null); return; }
    
    // Ensure featurePrices is always an array before using .find()
    if (!Array.isArray(featurePrices)) {
      setAutoUnitPrice(null);
      return;
    }
    
    if (selectedFeatureType) {
      const fp = featurePrices.find((p: any) => 
        (p.feature_type && (typeof p.feature_type === 'object' ? p.feature_type.id : p.feature_type) === selectedFeatureType) ||
        p.feature_type_id === selectedFeatureType
      );
      if (fp) { 
        setAutoUnitPrice(Number(fp.price)); 
        if (!addWorkForm.unit_price) setAddWorkForm(p => ({ ...p, unit_price: String(fp.price) })); 
        return; 
      }
    }
    if (selectedChildCategoryId) {
      const fp = featurePrices.find((p: any) => 
        !p.feature_type && 
        !p.feature_type_id && 
        ((p.feature_category && (typeof p.feature_category === 'object' ? p.feature_category.id : p.feature_category) === selectedChildCategoryId) ||
         p.feature_category_id === selectedChildCategoryId)
      );
      if (fp) { 
        setAutoUnitPrice(Number(fp.price)); 
        if (!addWorkForm.unit_price) setAddWorkForm(p => ({ ...p, unit_price: String(fp.price) })); 
        return; 
      }
    }
    setAutoUnitPrice(null);
  }, [addWorkDialogOpen, addWorkExisting, selectedFeatureType, selectedChildCategoryId, featurePrices, addWorkForm.unit_price, workOrder]);
  const statusMutation = useMutation({
    mutationFn: async (vars: { action: string; data?: any }) => {
      const result = await workOrdersApi.updateStatus(workOrder!.id, vars.action, vars.data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-order", numericId] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ title: "Failed to update status", description: e?.message || '', variant: 'destructive' })
  });

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  const addAdditionalMutation = useMutation({
    mutationFn: () => {
      let name = addWorkForm.feature_name.trim();
      if (addWorkExisting) {
        if (selectedFeatureType) {
          const ft = featureTypes.find(f => f.id === selectedFeatureType); if (ft) name = ft.name;
        } else if (selectedChildCategoryId) {
          const cat = childCategories.find(c => c.id === selectedChildCategoryId); if (cat) name = cat.name;
        }
      }
      return addedFeaturesApi.create({ work_order: workOrder!.id, feature_name: name || 'Unnamed', cost: addWorkForm.cost, notes: addWorkForm.notes || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["added-features", workOrder?.id] });
      queryClient.invalidateQueries({ queryKey: ["work-order", numericId] });
      setAddWorkDialogOpen(false);
      setAddWorkForm({ feature_name: "", quantity: "1", unit_price: "", cost: "", notes: "" });
      setSelectedParentCategoryId(null); setSelectedChildCategoryId(null); setSelectedFeatureType(null);
      toast({ title: "Additional work added" });
    },
    onError: (e: any) => toast({ title: "Failed to add work", description: e?.message || '', variant: 'destructive' })
  });

  const nextProgress = workOrder ? STATUS_PROGRESS[workOrder.status] : undefined;
  const canProgress = nextProgress && nextProgress.action;
  const intakeRequired = workOrder?.status === 'scheduled' && !intake;

  const addPaymentMutation = useMutation({
    mutationFn: async ({ formData, imageFile }: { formData: typeof paymentForm; imageFile?: File | null }) => {
      // Create finance transaction with optional image
      const transactionData = {
        account: formData.account,
        transaction_type: formData.transaction_type,
        amount: formData.amount,
        from_party: formData.from_party,
        to_party: 'Nathkrupa Body Builder',
        purpose: formData.purpose,
        bill_no: formData.bill_number,
        utr_number: formData.utr_reference,
        time: formData.date_time,
        notes: formData.purpose,
      };

      return financeApi.createTransactionWithImage(transactionData, imageFile || undefined);
    },
    onSuccess: () => {
      // Invalidate all finance transactions queries
      const billNumber = workOrder?.bill_number || workOrder?.work_order_number;
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-transactions", "work-order", billNumber] });
      queryClient.invalidateQueries({ queryKey: ["work-order", numericId] });
      setPaymentDialogOpen(false);
      setPaymentForm({
        account: "",
        transaction_type: "Credit",
        amount: "0",
        date_time: new Date().toISOString().slice(0, 16),
        purpose: "",
        from_party: "",
        bill_number: "",
        utr_reference: ""
      });
      setSelectedImage(null);
      setImagePreview(null);
      toast({ title: "Transaction created successfully" });
    },
    onError: (e: any) => toast({ title: "Failed to create transaction", description: e?.message || "", variant: "destructive" })
  });

  // Convert to bill mutation
  const convertToBillMutation = useMutation({
    mutationFn: (forceConvert: boolean) => workOrdersApi.convertToBill(workOrder!.id, forceConvert, billDate),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["work-order", numericId] });
      queryClient.invalidateQueries({ queryKey: ["work-orders-for-conversion"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast({
        title: "Work order converted to bill",
        description: `Bill ${data.bill_number} created successfully`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Conversion failed",
        description: error?.response?.data?.error || "Failed to convert work order to bill",
        variant: "destructive"
      });
    }
  });

  // Send WhatsApp mutation
  const sendWhatsappMutation = useMutation({
    mutationFn: () => billsApi.sendWhatsapp(workOrder!.id),
    onSuccess: (data) => {
      toast({
        title: "WhatsApp sent successfully",
        description: data.message || "Bill PDF sent via WhatsApp"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send WhatsApp",
        description: error?.response?.data?.error || "Failed to send bill via WhatsApp",
        variant: "destructive"
      });
    }
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleAddPayment = () => {
    if (!paymentForm.account || !paymentForm.amount || !paymentForm.from_party) return;
    addPaymentMutation.mutate({ formData: paymentForm, imageFile: selectedImage });
  };

  if (isLoading) return <div className="p-6">Loading</div>;
  if (error) return <div className="p-6">Error loading work order.</div>;
  if (!workOrder) return <div className="p-6">Not found.</div>;

  // Calculate totals with discount consideration
  // Get the original quote amount (before discount) - use suggested_total as the base
  const originalQuoteAmount = Number((workOrder.quotation as any)?.suggested_total || workOrder.quoted_price);
  const discountAmount = Number((workOrder.quotation as any)?.total_discount_amount || 0);
  const quoteAfterDiscount = originalQuoteAmount - discountAmount;
  const additionalAmount = Number(workOrder.total_added_features_cost || 0);
  const totalAmount = quoteAfterDiscount + additionalAmount;

  // Calculate paid amount from finance transactions only (Credit = money received, Debit = money paid out)
  const paidAmount = (financeTransactions || [])
    .filter((t: any) => t.transaction_type === 'Credit')
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  // Always calculate remaining balance directly to ensure accuracy
  const balanceAmount = totalAmount - paidAmount;
  // Handle both cases: bill with work_order.quotation or bill with direct quotation
  const quotationItems = (workOrder.quotation as any)?.features || (workOrder.work_order as any)?.quotation?.features || [];

  // API_ROOT imported from central helper; HTTPS in production

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="text-sm text-muted-foreground flex items-center gap-1">
        <Link to="/work-orders" className="hover:underline">Work Orders</Link>
        <span>/</span>
        <span>{workOrder.work_order_number}</span>
        {(workOrder.quotation as any)?.quotation_number && (
          <>
            <span>/</span>
            <Link to={`/quotations/${workOrder.quotation.id}`} className="hover:underline text-blue-600">
              Quote {(workOrder.quotation as any).quotation_number}
            </Link>
          </>
        )}
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => navigate(-1)} className="gap-1"><ArrowLeft className="h-4 w-4" />Back</Button>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-semibold">Work Order #{workOrder.work_order_number}</h1>
            <div className="text-sm text-muted-foreground">
              Converted from Quote #{(workOrder.quotation as any)?.quotation_number || (workOrder.work_order as any)?.quotation?.quotation_number || 'N/A'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={async () => {
              try {
                const url = `${API_ROOT}/api/manufacturing/bills/${workOrder.id}/job_sheet/`;
                const tokens = getTokens();
                const res = await fetch(url, { headers: tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {} });
                if (!res.ok) {
                  const t = await res.text();
                  toast({ title: 'Print failed', description: t || `HTTP ${res.status}`, variant: 'destructive' });
                  return;
                }
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, '_blank', 'noopener');
              } catch (e: any) {
                console.error(e);
                toast({ title: 'Print error', description: e?.message || 'Unexpected error', variant: 'destructive' });
              }
            }}
          >
            <Printer className="h-4 w-4" />Job Sheet
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={async () => {
              try {
                const url = `${API_ROOT}/api/manufacturing/bills/${workOrder.id}/bill_print/`;
                const tokens = getTokens();
                const res = await fetch(url, { 
                  headers: { 
                    ...(tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {}),
                    'Accept': 'application/json'
                  } 
                });
                if (!res.ok) {
                  const t = await res.text();
                  toast({ title: 'Print failed', description: t || `HTTP ${res.status}`, variant: 'destructive' });
                  return;
                }
                
                // Get JSON data from API
                const billData = await res.json();
                
                // Generate PDF from JSON data
                await generateBillPDF(billData);
                
                toast({ title: 'Success', description: 'Bill PDF generated successfully' });
              } catch (e: any) {
                console.error(e);
                toast({ title: 'Print error', description: e?.message || 'Unexpected error', variant: 'destructive' });
              }
            }}
          >
            <Printer className="h-4 w-4" />Bill Print
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={async () => {
              try {
                const url = `${API_ROOT}/api/manufacturing/bills/${workOrder.id}/outstanding_bill/`;
                const tokens = getTokens();
                const res = await fetch(url, { headers: tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : {} });
                if (!res.ok) {
                  const t = await res.text();
                  toast({ title: 'Print failed', description: t || `HTTP ${res.status}`, variant: 'destructive' });
                  return;
                }
                const blob = await res.blob();
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, '_blank', 'noopener');
              } catch (e: any) {
                console.error(e);
                toast({ title: 'Print error', description: e?.message || 'Unexpected error', variant: 'destructive' });
              }
            }}
          >
            <Printer className="h-4 w-4" />Outstanding Bill
          </Button>
          {/* Send WhatsApp Button - only show if bill exists and customer has WhatsApp */}
          {workOrder.has_bill && workOrder.bill_number && (
            ((workOrder.quotation as any)?.customer?.whatsapp_number || 
             (workOrder.work_order as any)?.quotation?.customer?.whatsapp_number ||
             (workOrder.quotation as any)?.customer?.phone_number ||
             (workOrder.work_order as any)?.quotation?.customer?.phone_number) && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-green-600 border-green-600 hover:bg-green-50"
              onClick={() => sendWhatsappMutation.mutate()}
              disabled={sendWhatsappMutation.isPending}
            >
              <MessageCircle className="h-4 w-4" />
              {sendWhatsappMutation.isPending ? 'Sending...' : 'Send via WhatsApp'}
            </Button>
            )
          )}
          {canProgress && (
            <StartJobWithIntakeButton disabled={statusMutation.isPending} intakeRequired={intakeRequired} onStart={() => statusMutation.mutate({ action: nextProgress!.action })} billId={workOrder.id} />
          )}
          {!canProgress && intakeRequired && (
            <StartJobWithIntakeButton disabled={false} intakeRequired={true} onStart={() => { }} billId={workOrder.id} />
          )}
          {/* Convert to Bill Button */}
          {!workOrder.has_bill && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setConvertDialogOpen(true)}
              disabled={convertToBillMutation.isPending}
            >
              <FileText className="h-4 w-4" />
              {convertToBillMutation.isPending ? 'Converting...' : 'Convert to Bill'}
            </Button>
          )}
          {/* Cancel Work Order Button */}
          {!['completed', 'cancelled'].includes(workOrder.status) && !workOrder.has_bill && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-2"
              onClick={() => setCancelDialogOpen(true)}
            >
              <X className="h-4 w-4" />
              Cancel Work Order
            </Button>
          )}
          {workOrder.has_bill && workOrder.bill_number && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-green-600 border-green-600"
              asChild
            >
              <Link to={`/bills/${workOrder.id}`}>
                <FileText className="h-4 w-4" />
                View Bill {workOrder.bill_number}
              </Link>
            </Button>
          )}
        </div>
      </div>
      {/* existing status badges */}
      <div className="flex flex-wrap gap-2">
        {STATUS_ORDER.map(status => (
          <span key={status} className={cn("px-3 py-1 rounded-full text-xs font-medium border", status === workOrder.status ? "bg-black text-white dark:bg-white dark:text-black" : "bg-muted")}>{STATUS_LABELS[status]}</span>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Customer</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="font-medium">{(workOrder.quotation as any)?.customer?.name || (workOrder.work_order as any)?.quotation?.customer?.name || "-"}</div>
            <div className="text-muted-foreground text-xs">{(workOrder.quotation as any)?.customer?.phone_number || (workOrder.work_order as any)?.quotation?.customer?.phone_number || ""}</div>
            <div className="text-muted-foreground text-xs pt-1 border-t">
              <span className="font-medium">Quote:</span> {(workOrder.quotation as any)?.quotation_number || (workOrder.work_order as any)?.quotation?.quotation_number || "N/A"}
              {(workOrder.quotation as any)?.quotation_number && (
                <Link to={`/quotations/${workOrder.quotation.id}`} className="ml-2 text-blue-600 hover:underline">
                  View
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Vehicle</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div>{(workOrder.quotation as any)?.vehicle_maker?.name || (workOrder.work_order as any)?.quotation?.vehicle_maker?.name} {(workOrder.quotation as any)?.vehicle_model?.name || (workOrder.work_order as any)?.quotation?.vehicle_model?.name}</div>
            <div className="text-muted-foreground text-xs">{(workOrder.quotation as any)?.vehicle_number || (workOrder.work_order as any)?.quotation?.vehicle_number}</div>
            <div className="text-muted-foreground text-xs">Days: {workOrder.estimated_completion_days}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Dates</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Appointment:</span><span>{workOrder.appointment_date}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Expected Delivery:</span><span>{workOrder.expected_delivery_date}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Financial</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Quote</span><span>₹{originalQuoteAmount.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Additional</span><span>₹{Number(workOrder.total_added_features_cost || 0).toLocaleString('en-IN')}</span></div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-orange-600"><span className="text-muted-foreground">Discount</span><span>-₹{discountAmount.toLocaleString('en-IN')}</span></div>
            )}
            <div className="flex justify-between font-medium border-t pt-1"><span className="text-muted-foreground">Total</span><span>₹{totalAmount.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between text-green-600"><span className="text-muted-foreground">Paid</span><span>₹{paidAmount.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Remaining</span><span className="font-medium">₹{balanceAmount.toLocaleString('en-IN')}</span></div>
          </CardContent>
        </Card>
      </div>
      <Tabs defaultValue="items" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="additional">Additional Work</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="intake">Intake</TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Quotation Items</CardTitle></CardHeader>
            <CardContent>
              {quotationItems.length === 0 && <div className="text-sm text-muted-foreground py-4">No items.</div>}
              <ul className="text-sm divide-y">
                {quotationItems.map((f: any, idx: number) => (
                  <li key={idx} className="py-2 flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/60" />
                    <span>
                      {(() => {
                        // Use display_name from API if available
                        if ((f as any).display_name) return (f as any).display_name;

                        // Priority 1: Custom name
                        if (f.custom_name?.trim()) return f.custom_name.trim();

                        // Priority 2: Feature type with category (typed features like "Bumper T1")
                        const cat = f.feature_type?.category?.name || (f as any).feature_category?.name || (f as any).category?.name;
                        const typ = f.feature_type?.name;

                        if (cat && typ) return `${cat} - ${typ}`;
                        if (typ) return typ;

                        // Priority 3: Category name only (non-typed features like "Rear Bumper")
                        if (cat) return cat;

                        // Final fallback - should rarely be reached with improved backend serializer
                        return 'Feature';
                      })()}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="additional" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Additional Work</h3>
            <Dialog open={addWorkDialogOpen} onOpenChange={setAddWorkDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1"><Plus className="h-4 w-4" />Add Work</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Additional Work</DialogTitle>
                  <DialogDescription>Add additional work (existing catalog or custom) with quantity & unit price.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-1">
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" className="h-3 w-3" checked={addWorkExisting} onChange={() => setAddWorkExisting(true)} /> Existing</label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" className="h-3 w-3" checked={!addWorkExisting} onChange={() => setAddWorkExisting(false)} /> Custom</label>
                  </div>
                  {addWorkExisting ? (
                    <div className="grid gap-3">
                      <div className="grid gap-1">
                        <Label>Parent Category</Label>
                        <select aria-label="Parent Category" className="border rounded px-2 py-1 text-sm" value={selectedParentCategoryId ?? ''} onChange={e => { const v = e.target.value ? Number(e.target.value) : null; setSelectedParentCategoryId(v); }}>
                          <option value="">-- Select Parent --</option>
                          {parentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="grid gap-1">
                        <Label>Category</Label>
                        <select 
                          aria-label="Category" 
                          className="border rounded px-2 py-1 text-sm" 
                          disabled={!selectedParentCategoryId} 
                          value={selectedChildCategoryId ?? ''} 
                          onChange={e => { 
                            const v = e.target.value ? Number(e.target.value) : null; 
                            setSelectedChildCategoryId(v); 
                            setSelectedFeatureType(null); 
                          }}
                        >
                          <option value="">
                            {selectedParentCategoryId 
                              ? '-- Select Category --' 
                              : 'Select parent first'}
                          </option>
                          {selectedParentCategoryId && (() => {
                            // Get the selected parent category object
                            const selectedParent = parentCategories.find((p: any) => p.id === selectedParentCategoryId);
                            const allCategoryOptions = selectedParent 
                              ? [
                                  // First option: Parent category itself (in case features are directly assigned to it)
                                  { id: selectedParent.id, name: `${selectedParent.name} (Parent)` },
                                  // Then child categories
                                  ...childCategories
                                ]
                              : childCategories;
                            
                            return allCategoryOptions.length > 0 ? (
                              allCategoryOptions.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))
                            ) : (
                              <option value="" disabled>No categories available</option>
                            );
                          })()}
                        </select>
                        {selectedParentCategoryId && childCategories.length === 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            No subcategories found. You can select the parent category or a feature type if available.
                          </p>
                        )}
                      </div>
                      <div className="grid gap-1">
                        <Label>Feature Type (optional)</Label>
                        <select aria-label="Feature Type" className="border rounded px-2 py-1 text-sm" disabled={!selectedChildCategoryId || featureTypes.length === 0} value={selectedFeatureType ?? ''} onChange={e => { const v = e.target.value ? Number(e.target.value) : null; setSelectedFeatureType(v); }}>
                          <option value="">{selectedChildCategoryId ? (featureTypes.length ? '-- Select Feature Type --' : 'No types available') : 'Select category first'}</option>
                          {featureTypes.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
                        </select>
                        <p className="text-[10px] text-muted-foreground">Leave blank for category level line.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-1">
                      <Label>Name</Label>
                      <Input value={addWorkForm.feature_name} onChange={e => setAddWorkForm(p => ({ ...p, feature_name: e.target.value }))} placeholder="Custom work name" />
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="grid gap-1">
                      <Label>Qty</Label>
                      <Input type="number" min={1} value={addWorkForm.quantity} onChange={e => setAddWorkForm(p => ({ ...p, quantity: e.target.value }))} />
                    </div>
                    <div className="grid gap-1">
                      <Label>Unit Price (₹){autoUnitPrice != null && <span className="ml-1 text-[10px] text-muted-foreground">Suggested: ₹{autoUnitPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>}</Label>
                      <Input type="number" min={0} value={addWorkForm.unit_price} onChange={e => setAddWorkForm(p => ({ ...p, unit_price: e.target.value }))} placeholder={autoUnitPrice != null ? String(autoUnitPrice) : 'e.g. 2500'} />
                    </div>
                    <div className="grid gap-1">
                      <Label>Total (₹)</Label>
                      <Input value={addWorkForm.cost} disabled />
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <Label>Notes</Label>
                    <Textarea value={addWorkForm.notes} onChange={e => setAddWorkForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes / specs" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Total auto-calculated. Discounts update financial summary after save.</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddWorkDialogOpen(false)}>Cancel</Button>
                  <Button onClick={() => addAdditionalMutation.mutate()} disabled={addAdditionalMutation.isPending || !addWorkForm.cost || (!addWorkExisting && !addWorkForm.feature_name.trim())}>
                    {addAdditionalMutation.isPending ? 'Saving...' : 'Add'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="pt-4">
              {addedFeatures.length === 0 && <div className="text-sm text-muted-foreground py-4">No additional work added.</div>}
              <ul className="text-sm divide-y">
                {addedFeatures.map((af: AddedFeature) => (
                  <li key={af.id} className="py-2 flex justify-between gap-4">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/60" />
                      <div className="truncate">
                        <div className="font-medium truncate">{af.feature_name}</div>
                        {af.notes && <div className="text-xs text-muted-foreground truncate">{af.notes}</div>}
                      </div>
                    </div>
                    <div className="font-medium">₹{Number(af.cost).toLocaleString('en-IN')}</div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Payment History</h3>
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1"><CreditCard className="h-4 w-4" />Add Payment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Transaction</DialogTitle>
                  <DialogDescription>Create a new finance transaction for this work order payment.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="account">Account *</Label>
                      <Select value={paymentForm.account} onValueChange={v => setPaymentForm(p => ({ ...p, account: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                        <SelectContent>
                          {financeAccounts.map(account => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.nickname || account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transaction_type">Transaction Type *</Label>
                      <Select value={paymentForm.transaction_type} onValueChange={v => setPaymentForm(p => ({ ...p, transaction_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Credit">Credit</SelectItem>
                          <SelectItem value="Debit">Debit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <Input id="amount" type="number" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date_time">Date & Time *</Label>
                      <Input id="date_time" type="datetime-local" value={paymentForm.date_time} onChange={e => setPaymentForm(p => ({ ...p, date_time: e.target.value }))} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose *</Label>
                    <Textarea id="purpose" value={paymentForm.purpose} onChange={e => setPaymentForm(p => ({ ...p, purpose: e.target.value }))} placeholder="Describe the purpose of this transaction" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="from_party">From Party *</Label>
                    <Input id="from_party" value={paymentForm.from_party} onChange={e => setPaymentForm(p => ({ ...p, from_party: e.target.value }))} placeholder="Who is paying/sending money" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bill_number">Bill Number</Label>
                      <Input id="bill_number" value={paymentForm.bill_number} onChange={e => setPaymentForm(p => ({ ...p, bill_number: e.target.value }))} placeholder="Reference bill number" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="utr_reference">UTR/Reference Number</Label>
                      <Input id="utr_reference" value={paymentForm.utr_reference} onChange={e => setPaymentForm(p => ({ ...p, utr_reference: e.target.value }))} placeholder="Bank UTR, cheque no, etc." />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transaction_image">Transaction Image (Optional)</Label>
                    <div className="space-y-2">
                      <input
                        id="transaction_image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {imagePreview && (
                        <div className="relative inline-block">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-24 w-24 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddPayment} disabled={addPaymentMutation.isPending || !paymentForm.account || !paymentForm.amount || !paymentForm.from_party}>
                    {addPaymentMutation.isPending ? "Creating..." : "Create Transaction"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="pt-4">
              {isLoadingTransactions && (
                <div className="text-sm text-muted-foreground py-2">Loading payments...</div>
              )}
              {!isLoadingTransactions && financeTransactions.length === 0 && (
                <div className="text-sm text-muted-foreground py-2">No payments yet.</div>
              )}
              {!isLoadingTransactions && financeTransactions.length > 0 && (
                <ul className="text-sm divide-y">
                  {/* Finance transactions - all payments now handled through finance app */}
                  {financeTransactions.map((t: any) => (
                    <li key={`transaction-${t.id}`} className="py-3 flex justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">₹{Number(t.amount || 0).toLocaleString('en-IN')}</span>
                          <Badge 
                            variant={t.transaction_type === 'Credit' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {t.transaction_type}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t.purpose || 'No purpose specified'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(t.time).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        {t.from_party && (
                          <div className="text-xs text-muted-foreground">
                            From: {t.from_party}
                          </div>
                        )}
                        {t.to_party && (
                          <div className="text-xs text-muted-foreground">
                            To: {t.to_party}
                          </div>
                        )}
                        {t.account_nickname && (
                          <div className="text-xs text-muted-foreground">
                            Account: {t.account_nickname}
                          </div>
                        )}
                        {t.utr_number && (
                          <div className="text-xs text-muted-foreground">
                            UTR: {t.utr_number}
                          </div>
                        )}
                        {t.image && (
                          <div className="mt-2">
                            <a 
                              href={t.image.startsWith('http') ? t.image : `${API_ROOT}${t.image}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View Receipt
                            </a>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="intake" className="space-y-4">
          <VehicleIntakeSection billId={workOrder.id} intake={intake} status={workOrder.status} />
        </TabsContent>
      </Tabs>
      {/* Removed bottom three-card grid as per request; details now live within tabs */}

      {/* Cancel Work Order Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Work Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this work order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancel-reason">Reason for cancellation (optional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Enter reason for cancellation..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelDialogOpen(false);
                setCancelReason('');
              }}
            >
              Keep Work Order
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                statusMutation.mutate({
                  action: 'cancel',
                  data: { reason: cancelReason || 'No reason provided' }
                });
                setCancelDialogOpen(false);
                setCancelReason('');
              }}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? 'Cancelling...' : 'Cancel Work Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Bill Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Work Order to Bill</DialogTitle>
            <DialogDescription>
              Convert this work order to a bill. You can select the bill date below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Date Information */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-md">
              <div>
                <Label className="text-sm font-medium text-gray-600">Quote Date</Label>
                <p className="text-sm text-gray-900">
                  {workOrder?.quotation?.quotation_date
                    ? new Date(workOrder.quotation.quotation_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })
                    : 'N/A'
                  }
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Work Order Date</Label>
                <p className="text-sm text-gray-900">
                  {workOrder?.work_order_date
                    ? new Date(workOrder.work_order_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })
                    : 'N/A'
                  }
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="bill-date">Bill Date</Label>
              <WorkOrderDatePicker
                date={billDate ? new Date(billDate + 'T00:00:00') : undefined}
                onDateChange={(date) => {
                  if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    setBillDate(`${year}-${month}-${day}`);
                  } else {
                    setBillDate('');
                  }
                }}
                placeholder="Select bill date"
                className="mt-1"
                quotationDate={workOrder?.quotation?.quotation_date}
                workOrderDate={workOrder?.work_order_date}
                appointmentDate={workOrder?.appointment_date}
                deliveryDate={workOrder?.expected_delivery_date}
              />
            </div>
            {!['completed', 'delivered'].includes(workOrder?.status || '') && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This work order is not completed (status: {workOrder?.status}).
                  Converting will force the conversion and mark it as completed.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConvertDialogOpen(false);
                setBillDate(new Date().toISOString().split('T')[0]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const forceConvert = !['completed', 'delivered'].includes(workOrder?.status || '');
                convertToBillMutation.mutate(forceConvert);
                setConvertDialogOpen(false);
              }}
              disabled={convertToBillMutation.isPending}
            >
              {convertToBillMutation.isPending ? 'Converting...' : 'Convert to Bill'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Vehicle Intake Section Component
function VehicleIntakeSection({ billId, intake, status }: { billId: number; intake?: VehicleIntake; status: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    stepney_present: false,
    jack_present: false,
    jack_handle_present: false,
    tool_kit_present: false,
    rope_present: false,
    tarpaulin_present: false,
    battery_present: true,
    music_system_present: true,
    documents_all_present: false,
    fuel_level: '',
    odometer_reading: '',
    exterior_notes: '',
    interior_notes: '',
    other_notes: ''
  });
  const editingAllowed = status === 'scheduled';

  useEffect(() => {
    if (intake) {
      setForm({
        stepney_present: intake.stepney_present,
        jack_present: intake.jack_present,
        jack_handle_present: intake.jack_handle_present,
        tool_kit_present: intake.tool_kit_present,
        rope_present: intake.rope_present,
        tarpaulin_present: intake.tarpaulin_present,
        battery_present: intake.battery_present,
        music_system_present: intake.music_system_present,
        documents_all_present: intake.documents_all_present,
        fuel_level: intake.fuel_level || '',
        odometer_reading: intake.odometer_reading ? String(intake.odometer_reading) : '',
        exterior_notes: intake.exterior_notes || '',
        interior_notes: intake.interior_notes || '',
        other_notes: intake.other_notes || ''
      });
    }
  }, [intake]);

  const createMut = useMutation({
    mutationFn: () => vehicleIntakeApi.create({ work_order_id: billId, ...form, odometer_reading: form.odometer_reading ? Number(form.odometer_reading) : undefined }),
    onSuccess: () => { toast({ title: 'Intake saved' }); queryClient.invalidateQueries({ queryKey: ['vehicle-intake', billId] }); setIsEditing(false); },
    onError: (e: any) => toast({ title: 'Save failed', description: e?.message || '', variant: 'destructive' })
  });
  const updateMut = useMutation({
    mutationFn: () => vehicleIntakeApi.update(intake!.id, { ...form, odometer_reading: form.odometer_reading ? Number(form.odometer_reading) : undefined }),
    onSuccess: () => { toast({ title: 'Intake updated' }); queryClient.invalidateQueries({ queryKey: ['vehicle-intake', billId] }); setIsEditing(false); },
    onError: (e: any) => toast({ title: 'Update failed', description: e?.message || '', variant: 'destructive' })
  });

  const handleChangeBool = (k: keyof typeof form) => setForm(p => ({ ...p, [k]: !p[k] as any }));
  const disabled = !!intake && !editingAllowed;
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<VehicleIntakeImage[]>([]);
  useEffect(() => { if (intake) { vehicleIntakeImagesApi.list(intake.id).then(setImages).catch(() => { }); } }, [intake]);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!intake) return; const files = e.target.files; if (!files || !files.length) return; setUploading(true);
    try {
      const { succeeded, errors } = await runWithConcurrencyDetailed(Array.from(files), 4, async (f) => {
        const uploadFile = await maybeCompressImage(f);
        return vehicleIntakeImagesApi.upload(intake.id, uploadFile);
      });
      const list = await vehicleIntakeImagesApi.list(intake.id); setImages(list);
      const ok = succeeded.length; const failed = errors.length;
      toast({ title: `Uploaded ${ok} image${ok === 1 ? '' : 's'}`, ...(failed ? { description: `${failed} failed` } : {}) });
    } catch (err: any) { toast({ title: 'Upload failed', description: err?.message || '', variant: 'destructive' }); } finally { setUploading(false); e.target.value = ''; }
  };

  const formatFuelLevel = (level: string) => {
    const levels: Record<string, string> = {
      'empty': 'Empty',
      'quarter': '1/4',
      'half': '1/2',
      'three_quarter': '3/4',
      'full': 'Full'
    };
    return levels[level] || level;
  };

  const getItemsPresent = () => {
    const items = [
      { key: 'stepney_present', label: 'Stepney' },
      { key: 'jack_present', label: 'Jack' },
      { key: 'jack_handle_present', label: 'Jack Handle' },
      { key: 'tool_kit_present', label: 'Tool Kit' },
      { key: 'rope_present', label: 'Rope' },
      { key: 'tarpaulin_present', label: 'Tarpaulin' },
      { key: 'battery_present', label: 'Battery' },
      { key: 'music_system_present', label: 'Music System' },
      { key: 'documents_all_present', label: 'Documents (RC+Insurance+PUC)' }
    ];
    return items.filter(item => (form as any)[item.key]).map(item => item.label);
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Vehicle Intake Checklist</CardTitle>
        <div className="flex gap-2">
          {intake && (
            <Button variant="outline" size="sm" onClick={() => vehicleIntakeApi.print(intake.id)}>
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          )}
          {intake && !isEditing && editingAllowed && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => intake ? updateMut.mutate() : createMut.mutate()} disabled={updateMut.isPending || createMut.isPending}>
                {(updateMut.isPending || createMut.isPending) ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!intake && status !== 'scheduled' && <div className="text-muted-foreground text-xs">Intake not completed before start.</div>}

        {!intake && status === 'scheduled' && !isEditing && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Vehicle intake not completed yet</p>
            <Button onClick={() => setIsEditing(true)}>Complete Intake</Button>
          </div>
        )}

        {/* Display Mode - Show intake data as text */}
        {intake && !isEditing && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-green-700 mb-2">✓ Items Present</h4>
              <div className="text-xs space-y-1">
                {getItemsPresent().map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    {item}
                  </div>
                ))}
                {getItemsPresent().length === 0 && <p className="text-muted-foreground">No items marked as present</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
              <div>
                <h4 className="font-medium mb-2">Vehicle Condition</h4>
                <div className="space-y-2 text-xs">
                  <div><span className="font-medium">Fuel Level:</span> {form.fuel_level ? formatFuelLevel(form.fuel_level) : 'Not specified'}</div>
                  <div><span className="font-medium">Odometer:</span> {form.odometer_reading ? `${form.odometer_reading} km` : 'Not recorded'}</div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Intake Details</h4>
                <div className="space-y-1 text-xs">
                  <div><span className="font-medium">Recorded by:</span> {intake.recorded_by?.username || 'N/A'}</div>
                  <div><span className="font-medium">Date:</span> {intake.recorded_at ? new Date(intake.recorded_at).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            </div>

            {(form.exterior_notes || form.interior_notes || form.other_notes) && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Notes</h4>
                <div className="grid md:grid-cols-3 gap-4 text-xs">
                  {form.exterior_notes && (
                    <div>
                      <span className="font-medium text-muted-foreground">Exterior:</span>
                      <p className="mt-1">{form.exterior_notes}</p>
                    </div>
                  )}
                  {form.interior_notes && (
                    <div>
                      <span className="font-medium text-muted-foreground">Interior:</span>
                      <p className="mt-1">{form.interior_notes}</p>
                    </div>
                  )}
                  {form.other_notes && (
                    <div>
                      <span className="font-medium text-muted-foreground">Other:</span>
                      <p className="mt-1">{form.other_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {images.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Photos ({images.length})</h4>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {images.map(img => (
                    <div key={img.id} className="relative group border rounded overflow-hidden">
                      <img src={img.image} alt={img.description || ''} className="object-cover h-24 w-full" />
                      {img.description && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                          {img.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit Mode - Show the form */}
        {isEditing && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {['stepney_present', 'jack_present', 'jack_handle_present', 'tool_kit_present', 'rope_present', 'tarpaulin_present', 'battery_present', 'music_system_present', 'documents_all_present'].map(key => (
                <label key={key} className="flex items-center gap-2 text-xs font-medium">
                  <input type="checkbox" disabled={disabled || (!intake && status !== 'scheduled')} className="h-3 w-3" checked={(form as any)[key]} onChange={() => handleChangeBool(key as any)} />
                  {key.replace(/_/g, ' ').replace('present', '').replace('documents all', 'Documents (RC+Insurance+PUC)')}</label>
              ))}
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="grid gap-1">
                <Label>Fuel Level</Label>
                <select aria-label="Fuel Level" className="border rounded px-2 py-1 text-xs" disabled={disabled} value={form.fuel_level} onChange={e => setForm(p => ({ ...p, fuel_level: e.target.value }))}>
                  <option value="">-- Select --</option>
                  <option value="empty">Empty</option>
                  <option value="quarter">1/4</option>
                  <option value="half">1/2</option>
                  <option value="three_quarter">3/4</option>
                  <option value="full">Full</option>
                </select>
              </div>
              <div className="grid gap-1">
                <Label>Odometer (km)</Label>
                <Input type="number" disabled={disabled} value={form.odometer_reading} onChange={e => setForm(p => ({ ...p, odometer_reading: e.target.value }))} />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="grid gap-1"><Label>Exterior Notes</Label><Textarea disabled={disabled} value={form.exterior_notes} onChange={e => setForm(p => ({ ...p, exterior_notes: e.target.value }))} /></div>
              <div className="grid gap-1"><Label>Interior Notes</Label><Textarea disabled={disabled} value={form.interior_notes} onChange={e => setForm(p => ({ ...p, interior_notes: e.target.value }))} /></div>
              <div className="grid gap-1 md:col-span-1"><Label>Other Notes</Label><Textarea disabled={disabled} value={form.other_notes} onChange={e => setForm(p => ({ ...p, other_notes: e.target.value }))} /></div>
            </div>

            {intake && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium flex items-center gap-2 cursor-pointer"><Upload className="h-4 w-4" /> <span>{uploading ? 'Uploading...' : 'Upload Photos'}</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading || !editingAllowed} />
                  </label>
                  <span className="text-[10px] text-muted-foreground">Photos help record pre-existing condition.</span>
                </div>
                {images.length > 0 && (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {images.map(img => (
                      <div key={img.id} className="relative group border rounded overflow-hidden">
                        <img src={img.image} alt={img.description || ''} className="object-cover h-24 w-full" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StartJobWithIntakeButton({ disabled, intakeRequired, onStart, billId }: { disabled: boolean; intakeRequired: boolean; onStart: () => void; billId: number }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Dialog open={open} onOpenChange={v => { setOpen(v); }}>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-2" variant={intakeRequired ? 'default' : 'default'} disabled={disabled} onClick={() => { if (intakeRequired) { setOpen(true); } else { onStart(); } }}>
            <Play className="h-4 w-4" />
            {intakeRequired ? 'Start Job' : 'Start Job'}
          </Button>
        </DialogTrigger>
        {intakeRequired && (
          <DialogContent className="max-w-3xl h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vehicle Intake Required</DialogTitle>
              <DialogDescription>Fill the checklist below before starting the job.</DialogDescription>
            </DialogHeader>
            <VehicleIntakeModalForm billId={billId} onCompleted={() => { setOpen(false); toast({ title: 'Intake saved' }); }} />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

function VehicleIntakeModalForm({ billId, onCompleted }: { billId: number; onCompleted: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    stepney_present: false, jack_present: false, jack_handle_present: false, tool_kit_present: false, rope_present: false, tarpaulin_present: false, battery_present: true, music_system_present: true, documents_all_present: false, fuel_level: '', odometer_reading: '', exterior_notes: '', interior_notes: '', other_notes: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const createMut = useMutation({
    mutationFn: async () => {
      // First create the intake
      const intake = await vehicleIntakeApi.create({ work_order_id: billId, ...form, odometer_reading: form.odometer_reading ? Number(form.odometer_reading) : undefined });

      // Then upload any selected images
      if (selectedFiles.length > 0) {
        setUploading(true);
        try {
          for (const file of selectedFiles) {
            await vehicleIntakeImagesApi.upload(intake.id, file);
          }
        } catch (err) {
          console.warn('Image upload failed:', err);
          toast({ title: 'Images upload failed', description: 'Intake saved but some images failed to upload', variant: 'destructive' });
        } finally {
          setUploading(false);
        }
      }

      return intake;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['vehicle-intake', billId] }); onCompleted(); },
    onError: (e: any) => toast({ title: 'Save failed', description: e?.message || '', variant: 'destructive' })
  });

  const handleBool = (k: keyof typeof form) => setForm(p => ({ ...p, [k]: !p[k] }));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedFiles(Array.from(files));
    }
  };
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        {Object.keys(form).filter(k => k.endsWith('_present') || k === 'documents_all_present').map(k => (
          <label key={k} className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" className="h-3 w-3" checked={(form as any)[k]} onChange={() => handleBool(k as any)} /> {k.replace(/_/g, ' ').replace('present', '').replace('documents all', 'Documents (RC+Insurance+PUC)')}</label>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="grid gap-1"><Label>Fuel Level</Label><select aria-label="Fuel Level" className="border rounded px-2 py-1 text-xs" value={form.fuel_level} onChange={e => setForm(p => ({ ...p, fuel_level: e.target.value }))}><option value="">-- Select --</option><option value="empty">Empty</option><option value="quarter">1/4</option><option value="half">1/2</option><option value="three_quarter">3/4</option><option value="full">Full</option></select></div>
        <div className="grid gap-1"><Label>Odometer (km)</Label><Input type="number" value={form.odometer_reading} onChange={e => setForm(p => ({ ...p, odometer_reading: e.target.value }))} /></div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="grid gap-1"><Label>Exterior Notes</Label><Textarea value={form.exterior_notes} onChange={e => setForm(p => ({ ...p, exterior_notes: e.target.value }))} /></div>
        <div className="grid gap-1"><Label>Interior Notes</Label><Textarea value={form.interior_notes} onChange={e => setForm(p => ({ ...p, interior_notes: e.target.value }))} /></div>
        <div className="grid gap-1 md:col-span-1"><Label>Other Notes</Label><Textarea value={form.other_notes} onChange={e => setForm(p => ({ ...p, other_notes: e.target.value }))} /></div>
      </div>

      {/* Image Upload Section */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Images className="h-4 w-4" />
          Upload Vehicle Photos (Optional)
        </Label>
        <div className="flex items-center gap-3">
          <label className="text-xs flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded p-3 hover:bg-gray-50">
            <Upload className="h-4 w-4" />
            <span>Choose Photos</span>
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
          {selectedFiles.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {selectedFiles.length} file(s) selected
            </span>
          )}
        </div>
        {selectedFiles.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="text-xs p-2 bg-gray-50 rounded border">
                {file.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Button
          size="sm"
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending || uploading}
        >
          {createMut.isPending ? 'Saving...' : uploading ? 'Uploading Images...' : 'Save & Start Job'}
        </Button>
      </div>
    </div>
  );
}
