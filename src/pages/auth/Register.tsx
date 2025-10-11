import { useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Register() {
  useEffect(() => { document.title = "Register | Nathkrupa"; }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        {/* Company Branding Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="https://nathkrupa-unified-storage.s3.ap-south-1.amazonaws.com/favicon.ico"
              alt="Nathkrupa Logo"
              className="h-16 w-16 rounded-lg shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Nathkrupa Body Builders
          </h1>
          <p className="text-lg text-gray-600 mb-1">
            & Auto Accessories
          </p>
          <p className="text-sm text-gray-500">
            Manufacturing ERP System
          </p>
        </div>

        {/* Welcome Message */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Join Our Team! 🚀
          </h2>
          <p className="text-gray-600">
            Create your account to access the manufacturing dashboard
          </p>
        </div>

        {/* Registration Form */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-gray-800">Create Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Input
                  type="password"
                  placeholder="Create a password"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <Button
                type="button"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                Create Account
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Sign in here
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Join Nathkrupa's manufacturing management system
          </p>
        </div>
      </div>
    </main>
  );
}
