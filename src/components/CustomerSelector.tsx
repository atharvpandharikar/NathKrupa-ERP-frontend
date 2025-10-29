import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ChevronsUpDown, UserPlus, User } from 'lucide-react';
import { toast } from 'sonner';
import { shopCustomersApi, ShopCustomer } from '@/lib/api';
import { INDIAN_STATES } from '@/constants/states';
import { BillTo } from '@/types/quote';

interface CustomerSelectorProps {
    billTo: BillTo;
    onCustomerSelect: (customer: Partial<BillTo>) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
    billTo,
    onCustomerSelect,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [customers, setCustomers] = useState<ShopCustomer[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch customers based on search query
    useEffect(() => {
        const fetchCustomers = async () => {
            if (!searchQuery.trim() && isOpen) {
                // Fetch all customers if no search term
                try {
                    setLoading(true);
                    const data = await shopCustomersApi.list();
                    setCustomers(data);
                } catch (error) {
                    console.error('Error fetching customers:', error);
                    toast.error('Failed to fetch customers');
                }
            } else if (searchQuery.trim()) {
                // Search customers
                try {
                    setLoading(true);
                    const data = await shopCustomersApi.list(searchQuery);
                    setCustomers(data);
                } catch (error) {
                    console.error('Error searching customers:', error);
                    toast.error('Failed to search customers');
                }
            }
            setLoading(false);
        };

        if (isOpen) {
            const timer = setTimeout(fetchCustomers, 300);
            return () => clearTimeout(timer);
        }
    }, [searchQuery, isOpen]);

    const handleCustomerSelect = (customer: ShopCustomer) => {
        onCustomerSelect({
            org_name: customer.organization_name || '',
            name: customer.first_name + ' ' + (customer.last_name || ''),
            contact_no: customer.phone_number || '',
            email: customer.email || '',
            billing_address_1: customer.billing_address_1 || '',
            billing_address_2: customer.billing_address_2 || '',
            pin_code: customer.pin_code || '',
            city: customer.city || '',
            state: customer.state || '',
            gst_no: customer.gst_no || '',
        });
        setIsOpen(false);
        setSearchQuery('');
        setShowNewCustomerForm(false);
    };

    const displayText =
        billTo.name || billTo.org_name || 'Select existing customer...';

    return (
        <div className="space-y-4">
            {/* Customer Selection Mode Toggle */}
            <div className="flex gap-2">
                <Button
                    variant={!showNewCustomerForm ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                        setShowNewCustomerForm(false);
                        setIsOpen(true);
                    }}
                    className="flex items-center gap-2"
                >
                    <User className="h-4 w-4" />
                    Select Existing
                </Button>
                <Button
                    variant={showNewCustomerForm ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                        setShowNewCustomerForm(true);
                        setIsOpen(false);
                    }}
                    className="flex items-center gap-2"
                >
                    <UserPlus className="h-4 w-4" />
                    Add New
                </Button>
            </div>

            {/* Existing Customer Selector */}
            {!showNewCustomerForm && (
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isOpen}
                            className="w-full justify-between text-left font-normal"
                        >
                            <span className="truncate">{displayText}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-full" align="start">
                        <Command>
                            <CommandInput
                                placeholder="Search customers by name, email, or phone..."
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                            />
                            <CommandList>
                                {loading && (
                                    <div className="text-muted-foreground p-4 text-center text-sm">
                                        Loading customers...
                                    </div>
                                )}
                                {!loading && customers.length === 0 && (
                                    <CommandEmpty>
                                        {searchQuery
                                            ? 'No customers found.'
                                            : 'No customers available.'}
                                    </CommandEmpty>
                                )}
                                {!loading && customers.length > 0 && (
                                    <CommandGroup>
                                        {customers.map(customer => (
                                            <CommandItem
                                                key={customer.id}
                                                value={customer.email}
                                                onSelect={() =>
                                                    handleCustomerSelect(customer)
                                                }
                                                className="flex flex-col items-start gap-1 p-3"
                                            >
                                                <span className="text-sm font-medium">
                                                    {customer.first_name}{' '}
                                                    {customer.last_name || ''}
                                                </span>
                                                {customer.organization_name && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {customer.organization_name}
                                                    </span>
                                                )}
                                                <span className="text-xs text-muted-foreground">
                                                    {customer.email}
                                                    {customer.phone_number &&
                                                        ` • ${customer.phone_number}`}
                                                </span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            )}

            {/* New Customer Form */}
            {showNewCustomerForm && (
                <Card className="shadow-sm">
                    <CardContent className="space-y-4 pt-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="org_name"
                                    className="text-sm font-medium"
                                >
                                    Organization Name
                                </Label>
                                <Input
                                    id="org_name"
                                    placeholder="Enter organization name"
                                    value={billTo.org_name}
                                    onChange={e =>
                                        onCustomerSelect({
                                            ...billTo,
                                            org_name: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="name"
                                    className="text-sm font-medium"
                                >
                                    Customer Name *
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="Enter customer name"
                                    value={billTo.name}
                                    onChange={e =>
                                        onCustomerSelect({
                                            ...billTo,
                                            name: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="contact"
                                    className="text-sm font-medium"
                                >
                                    Contact Number *
                                </Label>
                                <Input
                                    id="contact"
                                    placeholder="Enter contact number"
                                    value={billTo.contact_no}
                                    onChange={e =>
                                        onCustomerSelect({
                                            ...billTo,
                                            contact_no: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="email"
                                    className="text-sm font-medium"
                                >
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter email address"
                                    value={billTo.email}
                                    onChange={e =>
                                        onCustomerSelect({
                                            ...billTo,
                                            email: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label
                                    htmlFor="address1"
                                    className="text-sm font-medium"
                                >
                                    Billing Address Line 1 *
                                </Label>
                                <Input
                                    id="address1"
                                    placeholder="Enter address line 1"
                                    value={billTo.billing_address_1}
                                    onChange={e =>
                                        onCustomerSelect({
                                            ...billTo,
                                            billing_address_1: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <Label
                                    htmlFor="address2"
                                    className="text-sm font-medium"
                                >
                                    Billing Address Line 2
                                </Label>
                                <Input
                                    id="address2"
                                    placeholder="Enter address line 2 (optional)"
                                    value={billTo.billing_address_2}
                                    onChange={e =>
                                        onCustomerSelect({
                                            ...billTo,
                                            billing_address_2: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="city"
                                    className="text-sm font-medium"
                                >
                                    City
                                </Label>
                                <Input
                                    id="city"
                                    placeholder="Enter city"
                                    value={billTo.city}
                                    onChange={e =>
                                        onCustomerSelect({
                                            ...billTo,
                                            city: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="pincode"
                                    className="text-sm font-medium"
                                >
                                    Pin Code
                                </Label>
                                <Input
                                    id="pincode"
                                    placeholder="Pin code"
                                    value={billTo.pin_code}
                                    onChange={e =>
                                        onCustomerSelect({
                                            ...billTo,
                                            pin_code: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="state"
                                    className="text-sm font-medium"
                                >
                                    State
                                </Label>
                                <Select
                                    value={billTo.state}
                                    onValueChange={value => onCustomerSelect({
                                        ...billTo,
                                        state: value,
                                    })}
                                >
                                    <SelectTrigger className="w-full" id="state">
                                        <SelectValue placeholder="Select state" />
                                    </SelectTrigger>
                                    <SelectContent className="h-[250px] w-full">
                                        {INDIAN_STATES.map(state => (
                                            <SelectItem key={state} value={state}>
                                                {state}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="gst_no"
                                    className="text-sm font-medium"
                                >
                                    GST Number
                                </Label>
                                <Input
                                    id="gst_no"
                                    placeholder="Enter GST number"
                                    value={billTo.gst_no}
                                    onChange={e =>
                                        onCustomerSelect({
                                            ...billTo,
                                            gst_no: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
