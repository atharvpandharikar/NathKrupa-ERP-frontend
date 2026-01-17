import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// --- Types ---
// Define types based on backend response structure
interface QuotationFeature {
  id: number;
  custom_name?: string | null;
  feature_type?: { name: string; hsn_code?: string } | null;
  feature_category?: { id: number; name: string } | null;
  quantity?: number;
  unit_price?: number | string;
  total_price?: number | string;
}

interface QuotationData {
  id: number;
  quotation_number: string;
  quotation_date?: string;
  created_at?: string;
  customer?: {
    name: string;
    address?: string;
    gstin?: string;
  } | null;
  customer_name?: string; // Fallback
  customer_phone?: string;
  place_of_supply?: string;
  vehicle_maker?: { name: string } | null;
  vehicle_model?: { name: string } | null;
  vehicle_number?: string;
  suggested_total?: number | string; // Base total
  final_total?: number | string;
  features?: QuotationFeature[];
  discounts?: any[]; // Simplified for now
}

// --- Helpers ---

// Number to Words for Indian Currency (Lakh/Crore)
function numberToWords(num: number): string {
    const a = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
    ];
    const b = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
    ];

    if (num === 0) return "Zero";

    const convertLessThanOneThousand = (n: number): string => {
        if (n === 0) return "";
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
        return (
            a[Math.floor(n / 100)] +
            " Hundred" +
            (n % 100 !== 0 ? " and " + convertLessThanOneThousand(n % 100) : "")
        );
    };

    let result = "";

    if (num >= 10000000) {
        result +=
            convertLessThanOneThousand(Math.floor(num / 10000000)) + " Crore ";
        num %= 10000000;
    }
    if (num >= 100000) {
        result +=
            convertLessThanOneThousand(Math.floor(num / 100000)) + " Lakh ";
        num %= 100000;
    }
    if (num >= 1000) {
        result +=
            convertLessThanOneThousand(Math.floor(num / 1000)) + " Thousand ";
        num %= 1000;
    }

    result += convertLessThanOneThousand(num);
    return result.trim() + " Only";
}

// --- Constants ---
// Colors from backend
const THEME_BLUE = "#0F3D66";
const THEME_ORANGE = "#F28C00";
const THEME_GREY = "#6B6F73";

// Logos (Public S3 URLs)
const COMPANY_LOGO_URL = "https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/favicon.ico";
const WATERMARK_URL = "https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/Nathkrupa+Body+Builder.png";

// --- Main Generator Function ---
export const generateQuotationPDF = async (data: QuotationData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  // 1. Watermark (Background)
  // Note: jsPDF doesn't natively support opacity for images easily in all versions, 
  // but we can try adding it as a background. For simplicity, we might skip complex alpha blending 
  // or use the 'GState' for newer jsPDF versions if needed. 
  // For now, we'll try to add it.
  try {
      // Load watermark image
      /* 
         Note: Loading images from URL requires them to be CORS accessible or Base64.
         The S3 bucket seems public. If CORS issues arise, we might need a proxy or cached base64.
         For this implementation, we will assume standard `addImage` works or fails gracefully.
      */
     // To make watermark work properly with opacity, we use the GState API if available
     // doc.setGState(new (doc as any).GState({ opacity: 0.1 })); 
     // doc.addImage(WATERMARK_URL, 'PNG', ...);
     // doc.restoreGState();
  } catch (e) {
      console.warn("Could not load watermark");
  }

  // --- Helper to draw border and watermark on every page ---
  const drawBorder = () => {
      const gState = (doc as any).GState ? new (doc as any).GState({ opacity: 0.1 }) : null;
      
      // Watermark
      if (gState) (doc as any).setGState(gState);
      
      const wmWidth = 140; 
      const wmHeight = 60; // Assuming ~2.3:1 ratio for "Nathkrupa Body Builder" logo
      const wmX = (pageWidth - wmWidth) / 2;
      const wmY = (pageHeight - wmHeight) / 2;
      
      try {
          // If WATERMARK_URL is available
          doc.addImage(WATERMARK_URL, "PNG", wmX, wmY, wmWidth, wmHeight);
      } catch(e) {}

      // Reset Opacity
      if (gState) (doc as any).setGState(new (doc as any).GState({ opacity: 1.0 }));
      
      // Border
      doc.setDrawColor(0, 0, 0); // Black
      doc.setLineWidth(1); // Thicker border like backend
      doc.rect(margin, margin, contentWidth, pageHeight - margin * 2);
  };
  
  // --- Header ---
  let yPos = margin + 5;

  // Logo (User: "little not much small" and "simple as normal")
  // Reverting to landscape aspect ratio 35x22 as 25x25 looked compressed
  try {
      doc.addImage(COMPANY_LOGO_URL, "ICO", margin + 2, yPos, 35, 22); 
  } catch (e) {
    // console.warn("Logo load fail", e);
  }

  // Title: NATHKRUPA BODY BUILDER
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  const centerX = pageWidth / 2;
  
  // Dynamic centering for multi-color text
  const text1 = "NATHKRUPA";
  const text2 = "BODY";
  const text3 = "BUILDER";
  const spaceW = doc.getTextWidth(" ");
  const w1 = doc.getTextWidth(text1);
  const w2 = doc.getTextWidth(text2);
  const w3 = doc.getTextWidth(text3);
  
  const totalTitleW = w1 + spaceW + w2 + spaceW + w3;
  let currentX = (pageWidth - totalTitleW) / 2;
  const titleY = yPos + 8;
  
  doc.setTextColor(THEME_BLUE);
  doc.text(text1, currentX, titleY);
  currentX += w1 + spaceW;
  
  doc.setTextColor(THEME_ORANGE);
  doc.text(text2, currentX, titleY);
  currentX += w2 + spaceW;
  
  doc.setTextColor(THEME_BLUE);
  doc.text(text3, currentX, titleY);

  // Subtitle
  yPos += 16;
  doc.setFontSize(14);
  doc.setTextColor(THEME_GREY);
  doc.text("AND AUTO ACCESSORIES", centerX, yPos, { align: "center" });

  // Pill (Tagline)
  yPos += 10;
  const pillText = "All Kind of Accessories and Body Parts Original Body Dealers";
  doc.setFontSize(9);
  doc.setTextColor(THEME_BLUE);
  // Draw rounded rect
  const pillW = 110;
  const pillH = 7;
  const pillX = (pageWidth - pillW) / 2;
  doc.setDrawColor(THEME_BLUE);
  doc.roundedRect(pillX, yPos - 5, pillW, pillH, 3, 3, "S");
  doc.text(pillText, centerX, yPos - 0.5, { align: "center" });

  // Contact Info
  yPos += 8;
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0); // Black
  doc.setFont("helvetica", "normal");
  doc.text("Gat No. 379, Gavhanewadi, Pune-Nagar Road, Tal. Shrigonda, Dist. Ahmednagar", centerX, yPos, { align: "center" });
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Mob: 9850523224 | GSTIN: 27AHXPT3625N1ZB | Email: contact@nathkrupabody.com", centerX, yPos, { align: "center" });

  yPos += 8;

  // --- Quotation Info Header Box ---
  // Blue Header "QUOTATION INFO"
  doc.setFillColor(THEME_BLUE);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  // Blue box border line to ensure clean look
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos); // Top line
  doc.line(margin, yPos + 8, pageWidth - margin, yPos + 8); // Bottom line
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  // User: "proper same space in top and bottom"
  // Box height 8. Middle is +4. Baseline 'middle' works best.
  // If baseline 'middle' not fully reliable, tweak Y. +4 is geometric center.
  // text usually draws on baseline. So +5.5 was approx (Center + ~1.5mm descender).
  // Let's try explicit baseline 'middle' at yPos + 4.
  doc.text("QUOTATION INFO", centerX, yPos + 4.5, { align: "center", baseline: "middle" });

  yPos += 8;

  // Two columns: Customer (Left) vs Quote Details (Right)
  const col1X = margin + 2;
  // Shift divider to the right to give more space for Address (Left Col)
  // Page width ~210mm. Margin ~14mm. Content ~182mm.
  // Let's give Left Col ~65% and Right Col ~35%.
  const dividerX = margin + (contentWidth * 0.65);
  
  // Right column starts just after divider
  const col2X = dividerX + 5;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  
  const startY = yPos + 5;
  let leftY = startY;
  let rightY = startY;
  const lineHeight = 5;

  // Left Column Data
  const customerName = data.customer?.name || data.customer_name || "";
  const customerAddress = data.customer?.address || "";
  const customerGstin = data.customer?.gstin || "";
  const placeOfSupply = data.place_of_supply || "";

  // Helper for labeled row with wrapping
  const drawLabelVal = (label: string, val: string, x: number, y: number, maxW: number): number => {
      doc.setFont("helvetica", "bold");
      doc.text(label, x, y);
      
      doc.setFont("helvetica", "normal");
      // Wrap value text
      const valLines = doc.splitTextToSize(val || "", maxW);
      doc.text(valLines, x + 35, y);
      
      // Calculate height used (lines * lineHeight)
      return Math.max(lineHeight, valLines.length * 5); 
  };

  // Max width for value column
  // Left col width = dividerX - col1X. Label takes ~35.
  const leftMaxW = (dividerX - col1X) - 38; 

  leftY += drawLabelVal("M/s. :", customerName, col1X, leftY, leftMaxW);
  leftY += drawLabelVal("Address :", customerAddress, col1X, leftY, leftMaxW);
  leftY += drawLabelVal("Place of Supply :", placeOfSupply, col1X, leftY, leftMaxW);
  leftY += drawLabelVal("GSTIN No. :", customerGstin, col1X, leftY, leftMaxW);

  // Right Column Data
  const qNo = data.quotation_number || "";
  const qDate = data.quotation_date ? new Date(data.quotation_date).toLocaleDateString("en-GB") : (data.created_at ? new Date(data.created_at).toLocaleDateString("en-GB") : "");
  const vehModel = data.vehicle_model?.name || "";
  const vehNo = data.vehicle_number || "";

  // Right col width
  const rightMaxW = (pageWidth - margin) - col2X - 35 - 2;

  rightY += drawLabelVal("Quotation No. :", qNo, col2X, rightY, rightMaxW);
  rightY += drawLabelVal("Date :", qDate, col2X, rightY, rightMaxW);
  rightY += drawLabelVal("Vehicle :", vehModel, col2X, rightY, rightMaxW);
  rightY += drawLabelVal("Vehicle No. :", vehNo, col2X, rightY, rightMaxW);

  // Max Y for section
  yPos = Math.max(leftY, rightY) + 2;
  
  // Separation line
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(dividerX, startY - 5, dividerX, yPos); // Vertical line at new divider position
  
  doc.line(margin, yPos, pageWidth - margin, yPos); // Bottom horizontal line

  // --- Items Table ---
  yPos += 2;

  // Process features for table
  const tableBody = (data.features || []).map((f, index) => {
      // Determine name
      let name = f.custom_name;
      if (!name && f.feature_type) name = f.feature_type.name;
      if (!name && f.feature_category) name = f.feature_category.name;
      if (!name) name = "Feature";

      const hsn = f.feature_type?.hsn_code || "";
      const qty = f.quantity ? String(f.quantity) : "";
      const rate = f.unit_price ? parseFloat(String(f.unit_price)).toFixed(2) : "";
      const amount = f.total_price ? parseFloat(String(f.total_price)).toFixed(2) : "";

      return [
          String(index + 1),
          name,
          hsn,
          qty,
          rate,
          amount
      ];
  });

  // Ensure at least 10 rows (USER REQUEST: "At least 10 lines")
  while (tableBody.length < 10) {
      tableBody.push(["", "", "", "", "", ""]);
  }

  // Calculate totals
  // Priority: Final Total > calculate from features
  let totalNum = typeof data.final_total === 'number' ? data.final_total : parseFloat(String(data.final_total || 0));
  if (!totalNum && data.features) {
       totalNum = data.features.reduce((acc, curr) => acc + (parseFloat(String(curr.total_price || 0)) || 0), 0);
  }
  // If there's a discount, we might want to show it, but for now lets stick to final total logic
  // "Totals section aligned with items table, showing Total Amount, Discount and G. TOTAL."
  
  const discountTotal = 0; // If you have this data, use it
  const baseTotal = totalNum; // Simplified for now since we might not have raw base in list view
  const grandTotal = totalNum;

  // Add empty rows if needed to fill page or look good? (Optional)

  autoTable(doc, {
    startY: yPos,
    head: [['Sr.No', 'Particulars', 'HSN Code', 'Qty.', 'Rate', 'Amount']],
    body: tableBody,
    theme: 'grid',
    styles: {
        fontSize: 9,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        textColor: [0, 0, 0],
        overflow: 'linebreak' // USER REQUEST: Wrap text
    },
    headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
    },
    columnStyles: {
        0: { halign: 'center', cellWidth: 15 }, // SrNo
        1: { halign: 'left', cellWidth: 'auto' }, // Particulars (Auto width with wrap)
        2: { halign: 'center', cellWidth: 20 }, // HSN
        3: { halign: 'center', cellWidth: 15 }, // Qty
        4: { halign: 'right', cellWidth: 25 }, // Rate
        5: { halign: 'right', cellWidth: 25 }, // Amount
    },
    margin: { left: margin, right: margin },
    didDrawPage: (_data) => {
        // Draw border on each page
        drawBorder();
    }
  });

  // --- Totals Section ---
  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY; // Removing +2 gap to attach to table

  // Create a totals table manually using autoTable or simple text
  // We need "Total Words" on left, and numeric totals on right
  const totalInWords = numberToWords(Math.round(grandTotal));

  // We can use another autoTable for the footer/totals to keep alignment
  autoTable(doc, {
      startY: finalY,
      body: [
          [
             { content: `Rs. in Words : ${totalInWords}`, rowSpan: 3, styles: { halign: 'left', valign: 'middle', fontStyle: 'bold' } },
             { content: "Total Amount:", styles: { halign: 'left' } }, 
             { content: `Rs. ${baseTotal.toFixed(2)}`, styles: { halign: 'right' } }
          ],
          [
            { content: "Discount", styles: { halign: 'left' } },
            { content: `Rs. ${discountTotal.toFixed(2)}`, styles: { halign: 'right' } }
          ],
          [
            { content: "G. TOTAL", styles: { halign: 'left', fontStyle: 'bold' } },
            { content: `Rs. ${grandTotal.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold' } }
          ]
      ],
      theme: 'grid',
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        textColor: [0, 0, 0],
        fontSize: 10
      },
      columnStyles: {
          0: { cellWidth: 'auto' }, // Words
          1: { cellWidth: 40 }, // Label
          2: { cellWidth: 30 }  // Value
      },
      margin: { left: margin, right: margin },
      showHead: 'never'
  });

  // @ts-ignore
  finalY = doc.lastAutoTable.finalY + 5;
  const footerStartY = finalY;
  
  // Footer Content
  // Bank Details | Received Sign | Authorised Signatory
  // User wants partitions (vertical dividers) but no horizontal lines inside
  
  const footerData = [
      [
          { content: "Bank Details :", styles: { fontStyle: 'bold' } },
          { content: "Received Sign.", styles: { fontStyle: 'bold', halign: 'center' } },
          { content: "NATHKRUPA BODY BUILDER\nAND AUTO ACCESSORIES", styles: { fontStyle: 'bold', halign: 'center' } }
      ],
      [
        "Bank & Branch : Bank of Maharashtra, Shirur",
        "",
        ""
      ],
      [
        "Account No.: 60271451322",
        "",
        { content: "Authorised Signatory", styles: { valign: 'bottom', halign: 'center' }, rowSpan: 2 } 
      ],
      [
        "IFSC Code : MAHB0000254",
        "",
        ""
      ]
  ];

  autoTable(doc, {
      startY: finalY,
      body: footerData as any,
      theme: 'plain', // No default borders
      styles: {
          fontSize: 8,
          cellPadding: 1,
          overflow: 'linebreak'
      },
      columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 50 },
          2: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin },
  });

  // Manually draw the Box and Vertical Partitions
  // @ts-ignore
  const footerEndY = doc.lastAutoTable.finalY;
  
  doc.setDrawColor(0, 0, 0); // Black
  doc.setLineWidth(0.1);

  // Top Line
  doc.line(margin, footerStartY, pageWidth - margin, footerStartY);
  // Bottom Line
  doc.line(margin, footerEndY, pageWidth - margin, footerEndY);
  
  // We don't draw Left/Right vertical lines because the Page Border (drawBorder) handles the outer edge?
  // Actually, drawBorder draws a box around the WHOLE page. The footer is inside.
  // The footer table likely spans the full width (contentWidth).
  // Yes, so the Left/Right borders of the TABLE align with the Page Border.
  // We generally don't need to double-draw them if they overlap exactly.
  // But if the table is slightly inset or we want to be robust, we can draw them.
  // However, `margin` is used for both. So it overlaps. 
  // Let's just draw the dividers.

  // Vertical Divider 1 (between col 0 and 1)
  const x1 = margin + 80;
  doc.line(x1, footerStartY, x1, footerEndY);

  // Vertical Divider 2 (between col 1 and 2)
  const x2 = margin + 80 + 50;
  doc.line(x2, footerStartY, x2, footerEndY);

  // --- Page Numbering & Bottom Bar ---
  // Add page numbers
  // @ts-ignore
  const pageCount = doc.internal.getNumberOfPages ? doc.internal.getNumberOfPages() : (doc as any).getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
     doc.setPage(i);
     // Footer bar logic (Orange/Blue bar)
     const footerBarH = 8;
     // Position bar 1mm above the bottom margin border
     // Border bottom is at (pageHeight - margin)
     // So bar bottom should be at (pageHeight - margin - 1)
     // Top of bar is (pageHeight - margin - 1 - footerBarH)
     const footerBarY = pageHeight - margin - 1 - footerBarH;
     
     // Orange bar
     doc.setFillColor(THEME_ORANGE);
     doc.rect(margin, footerBarY, contentWidth - 30, footerBarH, "F");
     
     // Blue block for page num
     doc.setFillColor(THEME_BLUE);
     doc.rect(pageWidth - margin - 30, footerBarY, 30, footerBarH, "F");
     
     // Page Num
     doc.setTextColor(255, 255, 255);
     doc.setFontSize(9);
     doc.text(`${i}/${pageCount}`, pageWidth - margin - 15, footerBarY + 5.5, { align: "center" });

     // Icons/Text in Orange Bar
     // Icons: Mail, WA, Web
     const iconSize = 4;
     const iconY = footerBarY + 2;
     let nextX = margin + 5;
     
     // Helper to add icon+text
     const addContactItem = (iconUrl: string, text: string) => {
         try {
             doc.addImage(iconUrl, 'PNG', nextX, iconY, iconSize, iconSize);
         } catch(e) {}
         
         doc.setTextColor(255, 255, 255);
         doc.setFontSize(9);
         doc.text(text, nextX + iconSize + 2, footerBarY + 5.5);
         
         nextX += iconSize + 2 + doc.getTextWidth(text) + 8; // spacing
         doc.text("|", nextX - 4, footerBarY + 5.5); // Separator
     };
     
     // Mail
     addContactItem('https://cdn-icons-png.flaticon.com/128/732/732200.png', 'contact@nathkrupabody.com');
     // WA
     addContactItem('https://cdn-icons-png.flaticon.com/128/15713/15713434.png', '+91 9850523224');
     // Web (No separator after last)
     // Manual add for last item to avoid separator
     const webIcon = 'https://cdn-icons-png.flaticon.com/128/10453/10453141.png';
     const webText = 'www.nathkrupa.com';
     try {
         doc.addImage(webIcon, 'PNG', nextX, iconY, iconSize, iconSize);
     } catch(e) {}
     doc.text(webText, nextX + iconSize + 2, footerBarY + 5.5);
     
     // Redraw border on top of everything to be sure
     drawBorder();
  }

  // Save
  doc.save(`Quotation_${data.quotation_number}.pdf`);
};
