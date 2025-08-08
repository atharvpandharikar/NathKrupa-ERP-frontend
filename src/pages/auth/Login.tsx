import { useEffect } from "react";

export default function Login() {
  useEffect(()=>{ document.title = "Login | Nathkrupa"; },[]);
  return (
    <main className="max-w-md mx-auto py-16">
      <h1 className="text-2xl font-semibold mb-4">Login</h1>
      <p className="text-sm text-muted-foreground">Mock login page.</p>
    </main>
  );
}
