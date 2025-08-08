import { useEffect } from "react";
import { customers } from "@/mock/data";

export default function Customers() {
  useEffect(() => {
    document.title = "Customers | Nathkrupa ERP";
  }, []);

  return (
    <section>
      <h1 className="text-2xl font-semibold mb-4">Customers</h1>
      <ul className="divide-y border rounded-md bg-card">
        {customers.map((c) => (
          <li key={c.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-muted-foreground">{c.phone}</div>
            </div>
            <a className="text-primary hover:underline" href={`tel:${c.phone}`}>Call</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
