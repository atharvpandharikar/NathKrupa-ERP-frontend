import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function AddCustomer() {
  const [form, setForm] = useState({ name: "", phone: "", whatsapp: "", email: "", address: "" });
  useEffect(() => { document.title = "Add Customer | Nathkrupa ERP"; }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return toast({ title: "Missing fields", description: "Name and Phone are required" });
    toast({ title: "Customer created", description: "Simulated success" });
    setForm({ name: "", phone: "", whatsapp: "", email: "", address: "" });
  };

  return (
    <section>
      <h1 className="text-2xl font-semibold mb-4">Add New Customer</h1>
      <form onSubmit={onSubmit} className="grid gap-4 max-w-xl">
        <Input placeholder="Name *" value={form.name} onChange={(e)=>setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Phone *" value={form.phone} onChange={(e)=>setForm({ ...form, phone: e.target.value })} />
        <Input placeholder="WhatsApp" value={form.whatsapp} onChange={(e)=>setForm({ ...form, whatsapp: e.target.value })} />
        <Input placeholder="Email" value={form.email} onChange={(e)=>setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Address" value={form.address} onChange={(e)=>setForm({ ...form, address: e.target.value })} />
        <Button type="submit">Save</Button>
      </form>
    </section>
  );
}
