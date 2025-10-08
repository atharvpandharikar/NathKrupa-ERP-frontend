import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Plus,
    Search,
    Eye,
    Edit,
    Trash2,
    Banknote,
    CreditCard,
    Save
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { financeApi } from "@/lib/api";

interface Account {
    id: number;
    nickname: string;
    account_name: string;
    account_number: string;
    account_type: string;
    opening_balance: number;
    current_balance: number;
    credited_amount: number;
    debited_amount: number;
    is_active: boolean;
    created_at: string;
}

export default function Accounts() {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [formData, setFormData] = useState({
        nickname: "",
        account_name: "",
        account_number: "",
        account_type: "Bank",
        opening_balance: 0,
        is_active: true,
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        filterAccounts();
    }, [accounts, searchTerm]);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const data = await financeApi.get<Account[]>('/accounts/');
            setAccounts(data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterAccounts = () => {
        if (!searchTerm) {
            setFilteredAccounts(accounts);
        } else {
            const filtered = accounts.filter(account =>
                account.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                account.account_number?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredAccounts(filtered);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleDelete = async (accountId: number) => {
        if (window.confirm('Are you sure you want to delete this account?')) {
            try {
                await financeApi.del(`/accounts/${accountId}/`);
                setAccounts(accounts.filter(account => account.id !== accountId));
            } catch (error) {
                console.error('Error deleting account:', error);
                alert('Error deleting account');
            }
        }
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);

        try {
            const newAccount = await financeApi.post<Account>('/accounts/', formData);
            setAccounts([...accounts, newAccount]);
            setIsCreateDialogOpen(false);
            setFormData({
                nickname: "",
                account_name: "",
                account_number: "",
                account_type: "Bank",
                opening_balance: 0,
                is_active: true,
            });
        } catch (error) {
            console.error('Error creating account:', error);
            alert('Error creating account');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Loading...</div>
                    <div className="text-sm text-muted-foreground mt-2">Please wait while we load the accounts</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
                    <p className="text-gray-600 mt-1">Manage your bank and cash accounts</p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Account
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create New Account</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateAccount} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nickname">Nickname *</Label>
                                    <Input
                                        id="nickname"
                                        value={formData.nickname}
                                        onChange={(e) => handleInputChange('nickname', e.target.value)}
                                        placeholder="e.g., SBI-Manufacturing"
                                        required
                                    />
                                    <p className="text-sm text-muted-foreground">Short name for easy identification</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="account_type">Account Type *</Label>
                                    <Select value={formData.account_type} onValueChange={(value) => handleInputChange('account_type', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select account type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Bank">Bank</SelectItem>
                                            <SelectItem value="Cash">Cash</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="account_name">Account Name *</Label>
                                <Input
                                    id="account_name"
                                    value={formData.account_name}
                                    onChange={(e) => handleInputChange('account_name', e.target.value)}
                                    placeholder="Full account holder name"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="account_number">Account Number</Label>
                                <Input
                                    id="account_number"
                                    value={formData.account_number}
                                    onChange={(e) => handleInputChange('account_number', e.target.value)}
                                    placeholder="Account number (optional for cash accounts)"
                                />
                                <p className="text-sm text-muted-foreground">Leave empty for cash accounts</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="opening_balance">Opening Balance</Label>
                                <Input
                                    id="opening_balance"
                                    type="number"
                                    step="0.01"
                                    value={formData.opening_balance}
                                    onChange={(e) => handleInputChange('opening_balance', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                />
                                <p className="text-sm text-muted-foreground">Initial balance for this account</p>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="is_active"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                                />
                                <Label htmlFor="is_active">Active Account</Label>
                            </div>

                            <div className="flex justify-end space-x-4 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createLoading}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {createLoading ? "Creating..." : "Create Account"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search accounts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {/* Accounts Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Account</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Account Number</TableHead>
                                <TableHead>Opening Balance</TableHead>
                                <TableHead>Current Balance</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAccounts.map((account) => (
                                <TableRow
                                    key={account.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => navigate(`/finance/accounts/${account.id}`)}
                                >
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{account.nickname}</div>
                                            <div className="text-sm text-muted-foreground">{account.account_name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            {account.account_type === 'Bank' ? (
                                                <CreditCard className="h-4 w-4 text-blue-600" />
                                            ) : (
                                                <Banknote className="h-4 w-4 text-green-600" />
                                            )}
                                            <span>{account.account_type}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {account.account_number || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrency(account.opening_balance)}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`font-medium ${account.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(account.current_balance)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={account.is_active ? 'default' : 'secondary'}>
                                            {account.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(account.created_at)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate(`/finance/accounts/${account.id}`)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => navigate(`/finance/accounts/${account.id}/edit`)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(account.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {filteredAccounts.length === 0 && (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No accounts found</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
