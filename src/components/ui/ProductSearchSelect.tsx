import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Package } from "lucide-react";
import { shopProductsApi } from "@/lib/shop-api";
import type { ShopProduct } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ProductSearchSelectProps {
    value: string;
    onValueChange: (product: ShopProduct | null) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function ProductSearchSelect({ value, onValueChange, placeholder = "Select a product...", disabled }: ProductSearchSelectProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    // Fetch products with search
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['shop', 'products', searchTerm],
        queryFn: () => shopProductsApi.list({ search: searchTerm, ordering: '-created_at' }),
        enabled: isOpen,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
    });

    // Get selected product details
    const selectedProduct = products.find(p => p.product_id === value);

    // Reset search when dropdown closes
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm("");
        }
    }, [isOpen]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleSelect = (selectedValue: string) => {
        const product = products.find(p => p.product_id === selectedValue);
        onValueChange(product || null);
        setIsOpen(false);
    };

    return (
        <Select open={isOpen} onOpenChange={setIsOpen} value={value} onValueChange={handleSelect}>
            <SelectTrigger disabled={disabled} className="w-full">
                <SelectValue placeholder={placeholder}>
                    {selectedProduct && (
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedProduct.title}</span>
                            <span className="text-sm text-muted-foreground">
                                ({selectedProduct.product_id}) - Stock: {selectedProduct.stock || 0}
                            </span>
                        </div>
                    )}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                <div className="p-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="pl-10"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                            Loading products...
                        </div>
                    ) : products.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                            {searchTerm ? "No products found" : "Start typing to search products"}
                        </div>
                    ) : (
                        [...products]
                            .sort((a, b) => a.title.localeCompare(b.title))
                            .map((product) => (
                                <SelectItem key={product.product_id} value={product.product_id}>
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex-1">
                                            <div className="font-medium">{product.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                ID: {product.product_id} | Stock: {product.stock || 0}
                                            </div>
                                        </div>
                                    </div>
                                </SelectItem>
                            ))
                    )}
                </div>
            </SelectContent>
        </Select>
    );
}
