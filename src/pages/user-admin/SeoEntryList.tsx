import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

export default function SeoEntryList() {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <Card className="text-center py-12">
                    <CardContent>
                        <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <CardTitle className="text-2xl font-bold text-gray-900 mb-2">SEO Entry Management</CardTitle>
                        <p className="text-gray-600">SEO entry management functionality coming soon...</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


