import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useTheme } from "@/hooks/useTheme";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { testModeApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { TestTube, Settings, AlertTriangle, RefreshCw } from "lucide-react";

export default function Preferences() {
  const [open, setOpen] = useLocalStorage<boolean>("nk:sidebar-open", true);
  const { toggle } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => { document.title = "Settings | Nathkrupa"; }, []);

  // Fetch test mode status
  // COST OPTIMIZATION: Removed aggressive polling (was 5 seconds)
  // Test mode status changes infrequently, so polling is unnecessary
  // User can manually refresh using the refresh button
  const { data: testModeStatus, isLoading, error } = useQuery({
    queryKey: ["test-mode-status"],
    queryFn: () => testModeApi.getTestModeStatus(),
    refetchInterval: false, // No automatic polling - reduces API calls by ~17,000/day
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  // Enable test mode mutation
  const enableTestModeMutation = useMutation({
    mutationFn: () => testModeApi.enableTestMode(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["test-mode-status"] });
      toast({
        title: "Test Mode Enabled",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Enabling Test Mode",
        description: error?.message || "Failed to enable test mode. Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  // Disable test mode mutation
  const disableTestModeMutation = useMutation({
    mutationFn: () => testModeApi.disableTestMode(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["test-mode-status"] });
      toast({
        title: "Test Mode Disabled",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Disabling Test Mode",
        description: error?.message || "Failed to disable test mode. Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });

  const handleTestModeToggle = async (checked: boolean) => {
    if (isToggling) return;

    setIsToggling(true);
    try {
      if (checked) {
        await enableTestModeMutation.mutateAsync();
      } else {
        await disableTestModeMutation.mutateAsync();
      }
    } catch (error) {
      console.error("Toggle error:", error);
    } finally {
      setIsToggling(false);
    }
  };

  const refreshStatus = () => {
    queryClient.invalidateQueries({ queryKey: ["test-mode-status"] });
  };

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* User Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            User Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={toggle}>Toggle Theme</Button>
            <Button onClick={() => setOpen(!open)}>{open ? 'Collapse' : 'Expand'} Sidebar</Button>
          </div>
          <p className="text-sm text-muted-foreground">Preferences are saved in your browser.</p>
        </CardContent>
      </Card>

      {/* Test Mode Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Mode Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading test mode status...</span>
            </div>
          ) : error ? (
            <div className="text-red-600 text-sm">
              Failed to load test mode status. Please check your connection.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Test Mode</span>
                    <Badge variant={testModeStatus?.test_mode ? "default" : "secondary"}>
                      {testModeStatus?.test_mode ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {testModeStatus?.test_mode
                      ? "Test mode is currently enabled. New bills will be numbered B50001-B60000 and marked as test bills."
                      : "Test mode is currently disabled. New bills will be numbered B1, B2, B3... and marked as production bills."
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={testModeStatus?.test_mode || false}
                      onCheckedChange={handleTestModeToggle}
                      disabled={isToggling || isLoading}
                    />
                    {isToggling && (
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshStatus}
                    disabled={isToggling}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {testModeStatus?.test_bills_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Test Bills</div>
                  <div className="text-xs text-muted-foreground">
                    Next: {testModeStatus?.next_test_bill_number || "B50001"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {testModeStatus?.production_bills_count || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Production Bills</div>
                  <div className="text-xs text-muted-foreground">
                    Next: {testModeStatus?.next_production_bill_number || "B1"}
                  </div>
                </div>
              </div>

              {/* Important Notice */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-orange-800 mb-2">Important Notice: Dynamic Test Mode</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Test Mode can now be toggled **without restarting the server**. Changes take effect immediately for new bills.</li>
                      <li>• The toggle directly updates the `TEST_MODE` status in the application database.</li>
                      <li>• Test bills (B50001-B60000) are automatically excluded from CA/government submissions.</li>
                      <li>• Test mode affects only *new* bills created after toggling. Existing bills are not affected.</li>
                      <li>• Use test mode during deployment and testing phases to prevent contamination of production data.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
