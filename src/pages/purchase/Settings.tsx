import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    Settings as SettingsIcon,
    Save,
    Bell,
    Shield,
    Database,
    Mail,
    Phone,
    MapPin,
    Building
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PurchaseSettings() {
    const { toast } = useToast();
    const [settings, setSettings] = useState({
        // General Settings
        companyName: "Nathkrupa Body Builders",
        companyAddress: "123 Industrial Area, Mumbai, Maharashtra 400001",
        companyPhone: "+91 98765 43210",
        companyEmail: "info@nathkrupa.com",
        gstNumber: "27ABCDE1234F1Z5",

        // Purchase Settings
        autoGenerateBillNumber: true,
        billNumberPrefix: "PB",
        defaultPaymentTerms: 30,
        requireVendorApproval: false,
        autoCalculateTax: true,
        defaultTaxRate: 18,

        // Notification Settings
        emailNotifications: true,
        smsNotifications: false,
        lowStockAlerts: true,
        paymentReminders: true,
        billDueAlerts: true,

        // Security Settings
        requireTwoFactorAuth: false,
        sessionTimeout: 30,
        auditLogging: true,
        dataRetention: 365
    });

    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            toast({
                title: "Settings saved successfully",
                description: "Your purchase settings have been updated.",
            });
        } catch (error) {
            toast({
                title: "Error saving settings",
                description: "Please try again later.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Purchase Settings</h1>
                    <p className="text-gray-600 mt-1">Configure your purchase management preferences</p>
                </div>
                <Button onClick={handleSave} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? "Saving..." : "Save Settings"}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Company Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Company Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                                id="companyName"
                                value={settings.companyName}
                                onChange={(e) => updateSetting('companyName', e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="companyAddress">Address</Label>
                            <Input
                                id="companyAddress"
                                value={settings.companyAddress}
                                onChange={(e) => updateSetting('companyAddress', e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="companyPhone">Phone</Label>
                                <Input
                                    id="companyPhone"
                                    value={settings.companyPhone}
                                    onChange={(e) => updateSetting('companyPhone', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="companyEmail">Email</Label>
                                <Input
                                    id="companyEmail"
                                    type="email"
                                    value={settings.companyEmail}
                                    onChange={(e) => updateSetting('companyEmail', e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="gstNumber">GST Number</Label>
                            <Input
                                id="gstNumber"
                                value={settings.gstNumber}
                                onChange={(e) => updateSetting('gstNumber', e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Purchase Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <SettingsIcon className="h-5 w-5" />
                            Purchase Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Auto-generate Bill Numbers</Label>
                                <p className="text-sm text-gray-600">Automatically generate sequential bill numbers</p>
                            </div>
                            <Switch
                                checked={settings.autoGenerateBillNumber}
                                onCheckedChange={(checked) => updateSetting('autoGenerateBillNumber', checked)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="billPrefix">Bill Number Prefix</Label>
                            <Input
                                id="billPrefix"
                                value={settings.billNumberPrefix}
                                onChange={(e) => updateSetting('billNumberPrefix', e.target.value)}
                                disabled={!settings.autoGenerateBillNumber}
                            />
                        </div>

                        <div>
                            <Label htmlFor="paymentTerms">Default Payment Terms (days)</Label>
                            <Input
                                id="paymentTerms"
                                type="number"
                                value={settings.defaultPaymentTerms}
                                onChange={(e) => updateSetting('defaultPaymentTerms', parseInt(e.target.value))}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Require Vendor Approval</Label>
                                <p className="text-sm text-gray-600">Require approval for new vendors</p>
                            </div>
                            <Switch
                                checked={settings.requireVendorApproval}
                                onCheckedChange={(checked) => updateSetting('requireVendorApproval', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Auto-calculate Tax</Label>
                                <p className="text-sm text-gray-600">Automatically calculate tax on bills</p>
                            </div>
                            <Switch
                                checked={settings.autoCalculateTax}
                                onCheckedChange={(checked) => updateSetting('autoCalculateTax', checked)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                            <Input
                                id="taxRate"
                                type="number"
                                value={settings.defaultTaxRate}
                                onChange={(e) => updateSetting('defaultTaxRate', parseFloat(e.target.value))}
                                disabled={!settings.autoCalculateTax}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Notification Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Email Notifications</Label>
                                <p className="text-sm text-gray-600">Receive notifications via email</p>
                            </div>
                            <Switch
                                checked={settings.emailNotifications}
                                onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>SMS Notifications</Label>
                                <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                            </div>
                            <Switch
                                checked={settings.smsNotifications}
                                onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Low Stock Alerts</Label>
                                <p className="text-sm text-gray-600">Alert when inventory is low</p>
                            </div>
                            <Switch
                                checked={settings.lowStockAlerts}
                                onCheckedChange={(checked) => updateSetting('lowStockAlerts', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Payment Reminders</Label>
                                <p className="text-sm text-gray-600">Remind about pending payments</p>
                            </div>
                            <Switch
                                checked={settings.paymentReminders}
                                onCheckedChange={(checked) => updateSetting('paymentReminders', checked)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Bill Due Alerts</Label>
                                <p className="text-sm text-gray-600">Alert when bills are due</p>
                            </div>
                            <Switch
                                checked={settings.billDueAlerts}
                                onCheckedChange={(checked) => updateSetting('billDueAlerts', checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Security Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Two-Factor Authentication</Label>
                                <p className="text-sm text-gray-600">Require 2FA for login</p>
                            </div>
                            <Switch
                                checked={settings.requireTwoFactorAuth}
                                onCheckedChange={(checked) => updateSetting('requireTwoFactorAuth', checked)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                            <Input
                                id="sessionTimeout"
                                type="number"
                                value={settings.sessionTimeout}
                                onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Audit Logging</Label>
                                <p className="text-sm text-gray-600">Log all user activities</p>
                            </div>
                            <Switch
                                checked={settings.auditLogging}
                                onCheckedChange={(checked) => updateSetting('auditLogging', checked)}
                            />
                        </div>

                        <div>
                            <Label htmlFor="dataRetention">Data Retention (days)</Label>
                            <Input
                                id="dataRetention"
                                type="number"
                                value={settings.dataRetention}
                                onChange={(e) => updateSetting('dataRetention', parseInt(e.target.value))}
                            />
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label>System Status</Label>
                            <div className="flex items-center gap-2">
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                    <Database className="h-3 w-3 mr-1" />
                                    Database Connected
                                </Badge>
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Security Active
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
