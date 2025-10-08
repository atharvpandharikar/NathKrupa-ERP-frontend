import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getTokens } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deviceHash, setDeviceHash] = useState(""); // New state for device hash
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Login | Nathkrupa";
    if (getTokens()) {
      navigate((location.state as any)?.from?.pathname || "/app-selection", { replace: true });
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password, deviceHash); // Pass deviceHash to login function
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          {/* Company Logo and Name */}
          <div className="flex justify-center mb-4">
            <img
              src="https://nathkrupa-bilder-s3.s3.ap-south-1.amazonaws.com/favicon1.ico"
              alt="Nathkrupa Logo"
              className="h-12 w-18 rounded"
            />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Nathkrupa Body Builders
          </h1>
          <p className="text-base text-gray-600">
            & Auto Accessories
          </p>
          <h2 className="text-lg font-medium text-gray-700 mt-4 mb-2">
            Welcome! 👋
          </h2>
          <CardTitle className="text-lg text-gray-800">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {/* New input for Device ID Hash */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Smart Lock Device ID (Optional)</label>
              <Input type="text" value={deviceHash} onChange={e => setDeviceHash(e.target.value)} placeholder="Enter device ID if required" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
