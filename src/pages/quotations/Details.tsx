import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { getQuotation } from "@/mock/data";

export default function QuotationDetails() {
  const { id } = useParams();
  const quote = id ? getQuotation(id) : undefined;
  useEffect(()=>{ document.title = `Quotation ${id} | Nathkrupa`; },[id]);

  if (!quote) return <div>Quotation not found.</div>;

  return (
    <section>
      <h1 className="text-2xl font-semibold mb-2">Quotation Details</h1>
      <div className="text-sm text-muted-foreground mb-4">ID: {quote.id} • {new Date(quote.created_at).toLocaleString()}</div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <div className="font-medium mb-2">Vehicle</div>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">{JSON.stringify(quote.vehicle, null, 2)}</pre>
        </div>
        <div className="border rounded-lg p-4">
          <div className="font-medium mb-2">Selected Features</div>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">{JSON.stringify(quote.selectedFeatures, null, 2)}</pre>
        </div>
      </div>
      <div className="mt-4 text-right text-xl font-bold">Grand Total: ₹{quote.total}</div>
    </section>
  );
}
