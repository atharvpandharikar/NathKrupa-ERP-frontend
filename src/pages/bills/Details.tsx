import { useEffect } from "react";

export default function BillDetails() {
  useEffect(()=>{ document.title = "Bill | Nathkrupa"; },[]);
  return (
    <section>
      <h1 className="text-2xl font-semibold mb-2">Bill Details</h1>
      <p className="text-muted-foreground">Mock bill page. Integrate with real data later.</p>
    </section>
  );
}
