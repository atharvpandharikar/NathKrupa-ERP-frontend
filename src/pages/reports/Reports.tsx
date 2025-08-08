import { useEffect } from "react";
import { listQuotations } from "@/mock/data";

export default function Reports() {
  const quotes = listQuotations();
  useEffect(()=>{ document.title = "Reports | Nathkrupa"; },[]);

  return (
    <section>
      <h1 className="text-2xl font-semibold mb-4">Reports</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 border rounded-lg bg-card">Total Quotations: <strong>{quotes.length}</strong></div>
        <div className="p-4 border rounded-lg bg-card">Monthly Revenue (mock): <strong>₹{quotes.reduce((s,q)=>s+q.total,0)}</strong></div>
        <div className="p-4 border rounded-lg bg-card">Best Feature: <strong>Carrier</strong></div>
      </div>
    </section>
  );
}
