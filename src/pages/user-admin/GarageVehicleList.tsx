import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car } from "lucide-react";

export default function GarageVehicleList() {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <Card className="text-center py-12">
                    <CardContent>
                        <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Garage Vehicle Management</CardTitle>
                        <p className="text-gray-600">Garage vehicle management functionality coming soon...</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


