import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
    Edit,
    Eye,
    Phone,
    Mail,
    MapPin,
    Star,
    Filter,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    X,
    Trash2,
    Building2,
    User,
    CreditCard,
    Save
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { purchaseApi, financeApi, type Vendor } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Combobox } from "@/components/ui/combobox";

interface VendorWithStats extends Vendor {
    total_bill_amount: number;
    total_paid_amount: number;
    total_outstanding: number;
    total_bills: number;
}

interface NewVendor {
    name: string;
    email: string;
    gst_number: string;
    priority: 'High' | 'Medium' | 'Low';
    rating: number;
    contacts: Array<{
        name: string;
        mobile_number: string;
    }>;
    addresses: Array<{
        address: string;
    }>;
    bank_details: Array<{
        bank_name: string;
        ifsc_code: string;
        branch: string;
        account_number: string;
    }>;
}

type SortField = 'name' | 'gst_number' | 'email' | 'rating' | 'priority';
type SortDirection = 'asc' | 'desc';

export default function Vendors() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [vendors, setVendors] = useState<VendorWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newVendor, setNewVendor] = useState<NewVendor>({
        name: '',
        email: '',
        gst_number: '',
        priority: 'Medium',
        rating: 3,
        contacts: [{ name: '', mobile_number: '' }],
        addresses: [{ address: '' }],
        bank_details: [{ bank_name: '', ifsc_code: '', branch: '', account_number: '' }]
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedVendorForPayment, setSelectedVendorForPayment] = useState<VendorWithStats | null>(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [vendorsList, setVendorsList] = useState<Vendor[]>([]);
    const [useCustomVendor, setUseCustomVendor] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [paymentForm, setPaymentForm] = useState({
        account: '',
        transaction_type: 'Debit',
        amount: 0,
        from_party: '',
        to_party: '',
        vendor: '',
        custom_vendor: '',
        purpose: '',
        bill_no: '',
        utr_number: '',
        time: new Date().toISOString().slice(0, 16),
        create_finance_transaction: true,
    });

    useEffect(() => {
        const fetchVendors = async () => {
            try {
                setLoading(true);
                const response = await purchaseApi.vendors.list();

                // Fetch payment summary for each vendor
                const vendorsWithStats = await Promise.all(
                    response.map(async (vendor) => {
                        try {
                            const summary = await purchaseApi.vendors.paymentSummary(vendor.id);
                            return {
                                ...vendor,
                                total_bill_amount: summary.total_bill_amount || 0,
                                total_paid_amount: summary.total_paid_amount || 0,
                                total_outstanding: summary.total_outstanding || 0,
                                total_bills: summary.total_bills || 0,
                            };
                        } catch (error) {
                            console.error(`Failed to fetch summary for vendor ${vendor.id}:`, error);
                            return {
                                ...vendor,
                                total_bill_amount: 0,
                                total_paid_amount: 0,
                                total_outstanding: 0,
                                total_bills: 0,
                            };
                        }
                    })
                );

                setVendors(vendorsWithStats);
            } catch (error) {
                console.error('Failed to fetch vendors:', error);
                setVendors([]);
                toast({
                    title: "Error",
                    description: "Failed to fetch vendors. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        const fetchAccounts = async () => {
            try {
                const data = await financeApi.get<any[]>('/accounts/');
                setAccounts(data);
            } catch (error) {
                console.error('Error fetching accounts:', error);
            }
        };

        const fetchVendorsList = async () => {
            try {
                const data = await purchaseApi.vendors.list();
                setVendorsList(data);
            } catch (error) {
                console.error('Error fetching vendors:', error);
                setVendorsList([]);
            }
        };

        fetchVendors();
        fetchAccounts();
        fetchVendorsList();
    }, [toast]);

    const filteredAndSortedVendors = vendors
        .filter(vendor => {
            const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                vendor.gst_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                vendor.email.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesPriority = priorityFilter === 'all' || vendor.priority === priorityFilter;

            return matchesSearch && matchesPriority;
        })
        .sort((a, b) => {
            let aValue: any = a[sortField];
            let bValue: any = b[sortField];

            if (sortField === 'rating') {
                aValue = a.rating;
                bValue = b.rating;
            }

            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'bg-red-100 text-red-800';
            case 'Medium': return 'bg-yellow-100 text-yellow-800';
            case 'Low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
            />
        ));
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
        return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
    };

    const addContact = () => {
        setNewVendor(prev => ({
            ...prev,
            contacts: [...prev.contacts, { name: '', mobile_number: '' }]
        }));
    };

    const removeContact = (index: number) => {
        setNewVendor(prev => ({
            ...prev,
            contacts: prev.contacts.filter((_, i) => i !== index)
        }));
    };

    const updateContact = (index: number, field: string, value: string) => {
        setNewVendor(prev => ({
            ...prev,
            contacts: prev.contacts.map((contact, i) =>
                i === index ? { ...contact, [field]: value } : contact
            )
        }));
    };

    const addAddress = () => {
        setNewVendor(prev => ({
            ...prev,
            addresses: [...prev.addresses, { address: '' }]
        }));
    };

    const removeAddress = (index: number) => {
        setNewVendor(prev => ({
            ...prev,
            addresses: prev.addresses.filter((_, i) => i !== index)
        }));
    };

    const updateAddress = (index: number, value: string) => {
        setNewVendor(prev => ({
            ...prev,
            addresses: prev.addresses.map((address, i) =>
                i === index ? { address: value } : address
            )
        }));
    };

    const addBankDetail = () => {
        setNewVendor(prev => ({
            ...prev,
            bank_details: [...prev.bank_details, { bank_name: '', ifsc_code: '', branch: '', account_number: '' }]
        }));
    };

    const removeBankDetail = (index: number) => {
        setNewVendor(prev => ({
            ...prev,
            bank_details: prev.bank_details.filter((_, i) => i !== index)
        }));
    };

    const updateBankDetail = (index: number, field: string, value: string) => {
        setNewVendor(prev => ({
            ...prev,
            bank_details: prev.bank_details.map((bank, i) =>
                i === index ? { ...bank, [field]: value } : bank
            )
        }));
    };

    const handleAddVendor = async () => {
        try {
            setIsSubmitting(true);

            // Validate required fields
            if (!newVendor.name || !newVendor.email) {
                toast({
                    title: "Validation Error",
                    description: "Please fill in all required fields.",
                    variant: "destructive",
                });
                return;
            }

            // Filter out empty contacts, addresses, and bank details
            const filteredContacts = newVendor.contacts.filter(contact => contact.name && contact.mobile_number);
            const filteredAddresses = newVendor.addresses.filter(address => address.address.trim());
            const filteredBankDetails = newVendor.bank_details.filter(bank =>
                bank.bank_name && bank.ifsc_code && bank.branch && bank.account_number
            );

            // Create vendor data for API
            const vendorData = {
                name: newVendor.name,
                email: newVendor.email,
                gst_number: newVendor.gst_number,
                priority: newVendor.priority,
                rating: newVendor.rating
            };

            // Create vendor via API
            const createdVendor = await purchaseApi.vendors.create(vendorData);

            // Create contacts
            for (const contact of filteredContacts) {
                await purchaseApi.contacts.create(contact);
            }

            // Create addresses
            for (const address of filteredAddresses) {
                await purchaseApi.addresses.create(address);
            }

            // Create bank details
            for (const bankDetail of filteredBankDetails) {
                await purchaseApi.bankDetails.create(bankDetail);
            }

            // Refresh vendors list with stats
            const response = await purchaseApi.vendors.list();
            const vendorsWithStats = await Promise.all(
                response.map(async (vendor) => {
                    try {
                        const summary = await purchaseApi.vendors.paymentSummary(vendor.id);
                        return {
                            ...vendor,
                            total_bill_amount: summary.total_bill_amount || 0,
                            total_paid_amount: summary.total_paid_amount || 0,
                            total_outstanding: summary.total_outstanding || 0,
                            total_bills: summary.total_bills || 0,
                        };
                    } catch (error) {
                        console.error(`Failed to fetch summary for vendor ${vendor.id}:`, error);
                        return {
                            ...vendor,
                            total_bill_amount: 0,
                            total_paid_amount: 0,
                            total_outstanding: 0,
                            total_bills: 0,
                        };
                    }
                })
            );
            setVendors(vendorsWithStats);

            toast({
                title: "Success",
                description: "Vendor added successfully!",
            });

            setIsAddDialogOpen(false);
            setNewVendor({
                name: '',
                email: '',
                gst_number: '',
                priority: 'Medium',
                rating: 3,
                contacts: [{ name: '', mobile_number: '' }],
                addresses: [{ address: '' }],
                bank_details: [{ bank_name: '', ifsc_code: '', branch: '', account_number: '' }]
            });
        } catch (error) {
            console.error('Error creating vendor:', error);
            toast({
                title: "Error",
                description: "Failed to add vendor. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openPaymentDialog = (vendor: VendorWithStats) => {
        setSelectedVendorForPayment(vendor);
        setPaymentForm({
            account: '',
            transaction_type: 'Debit',
            amount: 0,
            from_party: '',
            to_party: vendor.name,
            vendor: vendor.id.toString(),
            custom_vendor: '',
            purpose: `Payment to ${vendor.name}`,
            bill_no: '',
            utr_number: '',
            time: new Date().toISOString().slice(0, 16),
            create_finance_transaction: true,
        });
        setUseCustomVendor(false);
        setSelectedImage(null);
        setImagePreview(null);
        setIsPaymentDialogOpen(true);
    };

    const handlePaymentInputChange = (field: string, value: any) => {
        setPaymentForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVendorForPayment) return;

        // Validate amount
        if (paymentForm.amount <= 0) {
            toast({
                title: "Validation Error",
                description: "Payment amount must be greater than zero.",
                variant: "destructive",
            });
            return;
        }

        setPaymentLoading(true);
        try {
            // Step 1: Add purchase payment to vendor
            const purchasePaymentData = {
                amount: paymentForm.amount,
                payment_date: paymentForm.time.slice(0, 10),
                mode: 'Bank',
                note: paymentForm.purpose,
            };

            const paymentResponse = await purchaseApi.vendors.addPayment(selectedVendorForPayment.id, purchasePaymentData);
            console.log('Purchase payment added:', paymentResponse);

            // Step 2: Create finance transaction if enabled
            if (paymentForm.create_finance_transaction && paymentForm.account) {
                const transactionData = {
                    ...paymentForm,
                    account: parseInt(paymentForm.account),
                    amount: parseFloat(paymentForm.amount.toString()),
                    time: new Date(paymentForm.time).toISOString(),
                    // Handle vendor selection for debit transactions
                    ...(paymentForm.transaction_type === 'Debit' && {
                        ...(useCustomVendor && paymentForm.custom_vendor
                            ? { to_party: paymentForm.custom_vendor }
                            : paymentForm.vendor
                                ? {
                                    vendor: parseInt(paymentForm.vendor),
                                    to_party: paymentForm.to_party // Keep the to_party field
                                }
                                : {}
                        )
                    }),
                    // Clear party fields that shouldn't be sent
                    ...(paymentForm.transaction_type === 'Credit' && { to_party: '' }),
                };

                await financeApi.createTransactionWithImage(transactionData, selectedImage || undefined);
                console.log('Finance transaction created');
            }

            // Step 3: Refresh vendors list
            const response = await purchaseApi.vendors.list();
            const vendorsWithStats = await Promise.all(
                response.map(async (vendor) => {
                    try {
                        const summary = await purchaseApi.vendors.paymentSummary(vendor.id);
                        return {
                            ...vendor,
                            total_bill_amount: summary.total_bill_amount || 0,
                            total_paid_amount: summary.total_paid_amount || 0,
                            total_outstanding: summary.total_outstanding || 0,
                            total_bills: summary.total_bills || 0,
                        };
                    } catch (error) {
                        console.error(`Failed to fetch summary for vendor ${vendor.id}:`, error);
                        return {
                            ...vendor,
                            total_bill_amount: 0,
                            total_paid_amount: 0,
                            total_outstanding: 0,
                            total_bills: 0,
                        };
                    }
                })
            );
            setVendors(vendorsWithStats);

            toast({
                title: "Success",
                description: "Payment added successfully!",
            });

            // Reset form and close dialog
            setSelectedVendorForPayment(null);
            setPaymentForm({
                account: '',
                transaction_type: 'Debit',
                amount: 0,
                from_party: '',
                to_party: '',
                vendor: '',
                custom_vendor: '',
                purpose: '',
                bill_no: '',
                utr_number: '',
                time: new Date().toISOString().slice(0, 16),
                create_finance_transaction: true,
            });
            setSelectedImage(null);
            setImagePreview(null);
            setUseCustomVendor(false);
            setIsPaymentDialogOpen(false);
        } catch (error) {
            console.error('Error adding payment:', error);
            toast({
                title: "Error",
                description: "Failed to add payment. Please try again.",
                variant: "destructive",
            });
        } finally {
            setPaymentLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <div className="text-lg font-semibold">Loading Vendors...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
                    <p className="text-gray-600 mt-1">Manage your suppliers and vendors</p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Vendor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New Vendor</DialogTitle>
                            <DialogDescription>
                                Enter the vendor information below. Fields marked with * are required.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Basic Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="name">Company Name *</Label>
                                        <Input
                                            id="name"
                                            value={newVendor.name}
                                            onChange={(e) => setNewVendor(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Enter company name"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="email">Email *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={newVendor.email}
                                            onChange={(e) => setNewVendor(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="Enter email address"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="gst">GST Number</Label>
                                        <Input
                                            id="gst"
                                            value={newVendor.gst_number}
                                            onChange={(e) => setNewVendor(prev => ({ ...prev, gst_number: e.target.value }))}
                                            placeholder="Enter GST number"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="priority">Priority</Label>
                                        <Select value={newVendor.priority} onValueChange={(value: 'High' | 'Medium' | 'Low') =>
                                            setNewVendor(prev => ({ ...prev, priority: value }))
                                        }>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="High">High</SelectItem>
                                                <SelectItem value="Medium">Medium</SelectItem>
                                                <SelectItem value="Low">Low</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label htmlFor="rating">Rating</Label>
                                        <Select value={newVendor.rating.toString()} onValueChange={(value) =>
                                            setNewVendor(prev => ({ ...prev, rating: parseInt(value) }))
                                        }>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">1 Star</SelectItem>
                                                <SelectItem value="2">2 Stars</SelectItem>
                                                <SelectItem value="3">3 Stars</SelectItem>
                                                <SelectItem value="4">4 Stars</SelectItem>
                                                <SelectItem value="5">5 Stars</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Contacts */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        Contacts
                                    </h3>
                                    <Button type="button" variant="outline" size="sm" onClick={addContact}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Contact
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {newVendor.contacts.map((contact, index) => (
                                        <div key={index} className="p-4 border rounded-lg space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">Contact {index + 1}</span>
                                                {newVendor.contacts.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeContact(index)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <Label>Name</Label>
                                                    <Input
                                                        value={contact.name}
                                                        onChange={(e) => updateContact(index, 'name', e.target.value)}
                                                        placeholder="Contact name"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Mobile Number</Label>
                                                    <Input
                                                        value={contact.mobile_number}
                                                        onChange={(e) => updateContact(index, 'mobile_number', e.target.value)}
                                                        placeholder="Mobile number"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Addresses */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Addresses
                                    </h3>
                                    <Button type="button" variant="outline" size="sm" onClick={addAddress}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Address
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {newVendor.addresses.map((address, index) => (
                                        <div key={index} className="p-4 border rounded-lg space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">Address {index + 1}</span>
                                                {newVendor.addresses.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeAddress(index)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>

                                            <div>
                                                <Label>Address</Label>
                                                <Textarea
                                                    value={address.address}
                                                    onChange={(e) => updateAddress(index, e.target.value)}
                                                    placeholder="Enter complete address"
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <CreditCard className="h-5 w-5" />
                                        Bank Details
                                    </h3>
                                    <Button type="button" variant="outline" size="sm" onClick={addBankDetail}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Bank Account
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {newVendor.bank_details.map((bank, index) => (
                                        <div key={index} className="p-4 border rounded-lg space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">Bank Account {index + 1}</span>
                                                {newVendor.bank_details.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeBankDetail(index)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <Label>Bank Name</Label>
                                                    <Input
                                                        value={bank.bank_name}
                                                        onChange={(e) => updateBankDetail(index, 'bank_name', e.target.value)}
                                                        placeholder="Bank name"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>IFSC Code</Label>
                                                    <Input
                                                        value={bank.ifsc_code}
                                                        onChange={(e) => updateBankDetail(index, 'ifsc_code', e.target.value)}
                                                        placeholder="IFSC code"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Branch</Label>
                                                    <Input
                                                        value={bank.branch}
                                                        onChange={(e) => updateBankDetail(index, 'branch', e.target.value)}
                                                        placeholder="Branch name"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Account Number</Label>
                                                    <Input
                                                        value={bank.account_number}
                                                        onChange={(e) => updateBankDetail(index, 'account_number', e.target.value)}
                                                        placeholder="Account number"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddVendor} disabled={isSubmitting}>
                                {isSubmitting ? "Adding..." : "Add Vendor"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Search vendors by name, GST number, or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="w-48">
                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priorities</SelectItem>
                                    <SelectItem value="High">High Priority</SelectItem>
                                    <SelectItem value="Medium">Medium Priority</SelectItem>
                                    <SelectItem value="Low">Low Priority</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Vendors Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Vendors ({filteredAndSortedVendors.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('name')}
                                            className="h-auto p-0 font-semibold"
                                        >
                                            Vendor {getSortIcon('name')}
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('gst_number')}
                                            className="h-auto p-0 font-semibold"
                                        >
                                            GST Number {getSortIcon('gst_number')}
                                        </Button>
                                    </TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('rating')}
                                            className="h-auto p-0 font-semibold"
                                        >
                                            Rating {getSortIcon('rating')}
                                        </Button>
                                    </TableHead>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('priority')}
                                            className="h-auto p-0 font-semibold"
                                        >
                                            Priority {getSortIcon('priority')}
                                        </Button>
                                    </TableHead>
                                    <TableHead>Total Bills</TableHead>
                                    <TableHead>Total Amount</TableHead>
                                    <TableHead>Outstanding</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAndSortedVendors.map((vendor) => (
                                    <TableRow
                                        key={vendor.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => navigate(`/purchase/vendors/${vendor.id}`)}
                                    >
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{vendor.name}</div>
                                                <div className="text-sm text-gray-600 flex items-center gap-1">
                                                    <Mail className="h-3 w-3" />
                                                    {vendor.email}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-mono text-sm">{vendor.gst_number}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {vendor.contacts.slice(0, 2).map((contact, index) => (
                                                    <div key={index} className="text-sm flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {contact.mobile_number}
                                                    </div>
                                                ))}
                                                {vendor.contacts.length > 2 && (
                                                    <div className="text-xs text-gray-500">
                                                        +{vendor.contacts.length - 2} more
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {renderStars(vendor.rating)}
                                                <span className="text-sm text-gray-600 ml-1">
                                                    ({vendor.rating}/5)
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getPriorityColor(vendor.priority)}>
                                                {vendor.priority}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-center">
                                                {vendor.total_bills}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {formatCurrency(vendor.total_bill_amount)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-gray-500">
                                                {formatCurrency(vendor.total_outstanding)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(`/purchase/vendors/${vendor.id}`)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(`/purchase/vendors/${vendor.id}/edit`)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openPaymentDialog(vendor)}
                                                >
                                                    <CreditCard className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Payment Dialog */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Add Payment</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handlePaymentSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="account">Account *</Label>
                                <Select value={paymentForm.account} onValueChange={(value) => handlePaymentInputChange('account', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map((account) => (
                                            <SelectItem key={account.id} value={account.id.toString()}>
                                                {account.nickname} ({account.account_type})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="transaction_type">Transaction Type *</Label>
                                <Select value={paymentForm.transaction_type} onValueChange={(value) => handlePaymentInputChange('transaction_type', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Credit">Credit</SelectItem>
                                        <SelectItem value="Debit">Debit</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount *</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={paymentForm.amount}
                                    onChange={(e) => handlePaymentInputChange('amount', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                    required
                                />
                                {paymentForm.amount <= 0 && (
                                    <p className="text-sm text-red-600">Amount must be greater than zero</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="time">Date & Time *</Label>
                                <Input
                                    id="time"
                                    type="datetime-local"
                                    value={paymentForm.time}
                                    onChange={(e) => handlePaymentInputChange('time', e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="purpose">Purpose *</Label>
                            <Textarea
                                id="purpose"
                                value={paymentForm.purpose}
                                onChange={(e) => handlePaymentInputChange('purpose', e.target.value)}
                                placeholder="Describe the purpose of this transaction"
                                required
                                rows={3}
                            />
                        </div>

                        {/* Party fields based on transaction type */}
                        {paymentForm.transaction_type === 'Credit' && (
                            <div className="space-y-2">
                                <Label htmlFor="from_party">From Party *</Label>
                                <Input
                                    id="from_party"
                                    value={paymentForm.from_party}
                                    onChange={(e) => handlePaymentInputChange('from_party', e.target.value)}
                                    placeholder="Who is paying/sending money"
                                    required
                                />
                            </div>
                        )}

                        {paymentForm.transaction_type === 'Debit' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vendor">Vendor *</Label>
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="useCustomVendor"
                                                checked={useCustomVendor}
                                                onChange={(e) => {
                                                    setUseCustomVendor(e.target.checked);
                                                    if (e.target.checked) {
                                                        // Clear vendor selection when using custom
                                                        handlePaymentInputChange('vendor', '');
                                                        handlePaymentInputChange('to_party', paymentForm.custom_vendor);
                                                    } else {
                                                        // Clear custom vendor when using vendor selection
                                                        handlePaymentInputChange('custom_vendor', '');
                                                        // Set to_party to selected vendor name
                                                        const selectedVendor = vendorsList.find(v => v.id.toString() === paymentForm.vendor);
                                                        if (selectedVendor) {
                                                            handlePaymentInputChange('to_party', selectedVendor.name);
                                                        }
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                            <Label htmlFor="useCustomVendor" className="text-sm">
                                                Use custom vendor name
                                            </Label>
                                        </div>

                                        {useCustomVendor ? (
                                            <Input
                                                id="custom_vendor"
                                                value={paymentForm.custom_vendor}
                                                onChange={(e) => {
                                                    handlePaymentInputChange('custom_vendor', e.target.value);
                                                    handlePaymentInputChange('to_party', e.target.value);
                                                }}
                                                placeholder="Enter vendor name"
                                                required
                                            />
                                        ) : (
                                            <Combobox
                                                value={paymentForm.vendor}
                                                onChange={(value) => {
                                                    handlePaymentInputChange('vendor', value);
                                                    // Auto-update to_party when vendor is selected
                                                    const selectedVendor = vendorsList.find(v => v.id.toString() === value);
                                                    if (selectedVendor) {
                                                        handlePaymentInputChange('to_party', selectedVendor.name);
                                                    }
                                                }}
                                                options={vendorsList.map(vendor => ({
                                                    label: `${vendor.name} ${vendor.gst_number ? `(${vendor.gst_number})` : ''}`,
                                                    value: vendor.id.toString()
                                                }))}
                                                placeholder="Select vendor"
                                                searchPlaceholder="Search vendors..."
                                                emptyText="No vendors found"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="to_party">To *</Label>
                                    <Input
                                        id="to_party"
                                        value={paymentForm.to_party}
                                        onChange={(e) => handlePaymentInputChange('to_party', e.target.value)}
                                        placeholder="Who is receiving the payment (can be different from vendor)"
                                        required
                                    />
                                    <p className="text-xs text-gray-500">
                                        This can be different from the vendor if payment is made to a different person/account
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="bill_no">Bill Number</Label>
                                <Input
                                    id="bill_no"
                                    value={paymentForm.bill_no}
                                    onChange={(e) => handlePaymentInputChange('bill_no', e.target.value)}
                                    placeholder="Reference bill number"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="utr_number">UTR/Reference Number</Label>
                                <Input
                                    id="utr_number"
                                    value={paymentForm.utr_number}
                                    onChange={(e) => handlePaymentInputChange('utr_number', e.target.value)}
                                    placeholder="Bank UTR, cheque no, etc."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="transaction_image">Transaction Image (Optional)</Label>
                            <div className="space-y-2">
                                <input
                                    id="transaction_image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {imagePreview && (
                                    <div className="relative inline-block">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="h-24 w-24 object-cover rounded border"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={paymentLoading}>
                                <Save className="h-4 w-4 mr-2" />
                                {paymentLoading ? "Adding..." : "Add Payment"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
