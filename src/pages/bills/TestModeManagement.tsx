import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TestTube, Settings, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { testModeApi } from "@/lib/api";

interface TestModeStats {
    test_bills_count: number;
    production_bills_count: number;
    test_bill_range: string;
    next_available_test_number: string;
}

export default function TestModeManagement() {
    const { toast } = useToast();
    const [isCleaning, setIsCleaning] = useState(false);

    // Fetch test mode statistics
    const statsQuery = useQuery({
        queryKey: ["test-mode-stats"],
        queryFn: () => testModeApi.getStats()
    });

    // Fetch test bills
    const testBillsQuery = useQuery({
        queryKey: ["test-bills"],
        queryFn: () => testModeApi.list()
    });

    const handleCleanTestBills = async () => {
        if (!confirm("Are you sure you want to delete all test bills? This action cannot be undone.")) {
            return;
        }

        setIsCleaning(true);
        try {
            await testModeApi.clean();

            toast({
                title: "Success",
                description: "All test bills have been deleted successfully.",
            });

            // Refresh queries
            statsQuery.refetch();
            testBillsQuery.refetch();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "Failed to clean test bills",
                variant: "destructive"
            });
        } finally {
            setIsCleaning(false);
        }
    };

    const stats = statsQuery.data;
    const testBills = testBillsQuery.data?.results || [];

    if (statsQuery.isLoading) {
        return (
            <div className="container mx-auto p-4 space-y-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <TestTube className="h-6 w-6 text-orange-600" />
                    <h1 className="text-2xl font-semibold">Test Mode Management</h1>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        statsQuery.refetch();
                        testBillsQuery.refetch();
                    }}
                    className="gap-1"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TestTube className="h-5 w-5 text-orange-600" />
                            Test Bills
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-600">
                            {stats?.test_bills_count || 0}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Bills numbered B50001-B60000
                        </p>
                        <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                                Range: {stats?.test_bill_range || "B50001 - B60000"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Settings className="h-5 w-5 text-blue-600" />
                            Production Bills
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">
                            {stats?.production_bills_count || 0}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Bills numbered B1-B49999
                        </p>
                        <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                                Next: {stats?.next_available_test_number || "B50001"}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Test Bills List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <TestTube className="h-5 w-5 text-orange-600" />
                            Test Bills ({testBills.length})
                        </CardTitle>
                        {testBills.length > 0 && (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleCleanTestBills}
                                disabled={isCleaning}
                                className="gap-1"
                            >
                                <Trash2 className="h-4 w-4" />
                                {isCleaning ? "Cleaning..." : "Clean All Test Bills"}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {testBillsQuery.isLoading ? (
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : testBills.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No test bills found</p>
                            <p className="text-sm">Test bills will appear here when test mode is enabled</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {testBills.map((bill: any) => (
                                <div
                                    key={bill.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{bill.bill_number}</span>
                                            <Badge variant="outline" className="text-xs">
                                                Test
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {bill.work_order?.quotation?.customer?.name || bill.quotation?.customer?.name || 'N/A'}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {bill.status}
                                        </div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {new Date(bill.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Important Notice */}
            <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-orange-800 mb-2">Important Notice</h3>
                            <ul className="text-sm text-orange-700 space-y-1">
                                <li>• Test bills (B50001-B60000) are automatically excluded from CA/government submissions</li>
                                <li>• Test mode is controlled by the TEST_MODE environment variable</li>
                                <li>• When test mode is enabled, new bills will be numbered in the test range</li>
                                <li>• When test mode is disabled, new bills will be numbered normally (B1, B2, B3...)</li>
                                <li>• Deleting test bills will free up the bill numbers for reuse</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
