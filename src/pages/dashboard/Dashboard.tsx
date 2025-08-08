import { useEffect } from "react";

export default function Dashboard() {
  useEffect(() => {
    document.title = "Dashboard | Nathkrupa ERP";
  }, []);

  return (
    <section>
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-card">Total Quotations: <strong>{(JSON.parse(localStorage.getItem('nk:quotes')||'[]')).length}</strong></div>
        <div className="p-4 rounded-lg border bg-card">Total Bills: <strong>3</strong></div>
        <div className="p-4 rounded-lg border bg-card">Monthly Revenue: <strong>₹1.2L (mock)</strong></div>
      </div>
    </section>
  );
}
