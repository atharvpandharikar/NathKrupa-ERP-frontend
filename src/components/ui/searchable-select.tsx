import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronsUpDown, Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export interface SearchableSelectOption {
    value: string;
    label: string;
    searchableText?: string; // Additional text to search through
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    emptyMessage?: string;
    searchPlaceholder?: string;
    className?: string;
    disabled?: boolean;
    allowClear?: boolean;
    onClear?: () => void;
    onSearch?: (query: string) => void; // New prop for async search
}

export function SearchableSelect({
    options,
    value,
    onValueChange,
    placeholder = "Select option...",
    emptyMessage = "No options found.",
    searchPlaceholder = "Search...",
    className,
    disabled = false,
    allowClear = false,
    onClear,
    onSearch,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value),
        [options, value]
    );

    // Filter options locally if no onSearch is provided, otherwise show all options (filtered by server)
    const filteredOptions = useMemo(() => {
        if (onSearch) return options; // Server-side filtering, so display what's given
        
        if (!searchValue) return options;

        const searchLower = searchValue.toLowerCase();
        return options.filter((option) => {
            const labelMatch = option.label.toLowerCase().includes(searchLower);
            const searchableMatch = option.searchableText?.toLowerCase().includes(searchLower);
            return labelMatch || searchableMatch;
        });
    }, [options, searchValue, onSearch]);

    const handleSelect = (selectedValue: string) => {
        onValueChange?.(selectedValue);
        setOpen(false);
        setSearchValue('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClear?.();
    };

    // Debounced search handler
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchValue(newValue);

        if (onSearch) {
            setIsSearching(true);
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            
            searchTimeoutRef.current = setTimeout(() => {
                onSearch(newValue);
                setIsSearching(false);
            }, 300); // 300ms debounce
        }
    };

    // Reset search when opening
    useEffect(() => {
        if (open) {
            setSearchValue('');
            // Optionally trigger an empty search to reset list if needed
            // if (onSearch) onSearch(''); 
        }
    }, [open]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between",
                        !selectedOption && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <div className="flex items-center gap-1">
                        {allowClear && selectedOption && (
                            <X
                                className="h-4 w-4 opacity-50 hover:opacity-100"
                                onClick={handleClear}
                            />
                        )}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={!onSearch}> {/* Disable Command's internal filtering if onSearch is present */}
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                            ref={inputRef}
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChange={handleSearchChange}
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    <div
                        ref={scrollContainerRef}
                        className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 scroll-smooth"
                    >
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                {emptyMessage}
                            </div>
                        ) : (
                            <div className="p-1">
                                {filteredOptions.map((option) => (
                                    <div
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={cn(
                                            "flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm",
                                            value === option.value && "bg-accent text-accent-foreground"
                                        )}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === option.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <span className="truncate">{option.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
