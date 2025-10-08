import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
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
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value),
        [options, value]
    );

    const filteredOptions = useMemo(() => {
        if (!searchValue) return options;

        const searchLower = searchValue.toLowerCase();
        return options.filter((option) => {
            const labelMatch = option.label.toLowerCase().includes(searchLower);
            const searchableMatch = option.searchableText?.toLowerCase().includes(searchLower);
            return labelMatch || searchableMatch;
        });
    }, [options, searchValue]);

    const handleSelect = (selectedValue: string) => {
        onValueChange?.(selectedValue);
        setOpen(false);
        setSearchValue('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClear?.();
    };

    // Reset search when opening
    useEffect(() => {
        if (open) {
            setSearchValue('');
        }
    }, [open]);

    // Handle wheel scrolling
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop += e.deltaY;
        }
    };

    // Alternative approach: Handle wheel on the entire popover content
    const handlePopoverWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop += e.deltaY;
        }
    };

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
            <PopoverContent className="w-full p-0" align="start" onWheel={handlePopoverWheel}>
                <Command>
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                            ref={inputRef}
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                    </div>
                    <div
                        ref={scrollContainerRef}
                        className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 scroll-smooth"
                        onWheel={handleWheel}
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
