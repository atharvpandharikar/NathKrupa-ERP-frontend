import { useEffect } from "react";

export default function Register() {
  useEffect(()=>{ document.title = "Register | Nathkrupa"; },[]);
  return (
    <main className="max-w-md mx-auto py-16">
      <h1 className="text-2xl font-semibold mb-4">Create Account</h1>
      <p className="text-sm text-muted-foreground">Mock register page.</p>
    </main>
  );
}
