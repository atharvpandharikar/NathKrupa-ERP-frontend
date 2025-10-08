import * as React from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

// Utility function to safely convert date strings to Date objects
const parseDateString = (dateString: string): Date | null => {
    if (!dateString) return null;
    // Create date in local timezone to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Utility function to convert Date to YYYY-MM-DD string
const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface WorkOrderDatePickerProps {
    date: Date | undefined;
    onDateChange: (date: Date | undefined) => void;
    className?: string;
    placeholder?: string;
    // Work order specific dates for color coding
    quotationDate?: string;
    workOrderDate?: string;
    appointmentDate?: string;
    deliveryDate?: string;
    disabled?: boolean;
}

export function WorkOrderDatePicker({
    date,
    onDateChange,
    className,
    placeholder = "Pick a date",
    quotationDate,
    workOrderDate,
    appointmentDate,
    deliveryDate,
    disabled = false,
}: WorkOrderDatePickerProps) {
    const [open, setOpen] = React.useState(false);

    // Convert string dates to Date objects for comparison using safe parsing
    const quotationDateObj = quotationDate ? parseDateString(quotationDate) : null;
    const workOrderDateObj = workOrderDate ? parseDateString(workOrderDate) : null;
    const appointmentDateObj = appointmentDate ? parseDateString(appointmentDate) : null;
    const deliveryDateObj = deliveryDate ? parseDateString(deliveryDate) : null;

    // Custom modifiers for different date types - only include valid dates
    const modifiers: Record<string, Date> = {};
    if (quotationDateObj) modifiers.quotation = quotationDateObj;
    if (workOrderDateObj) modifiers.workOrder = workOrderDateObj;
    if (appointmentDateObj) modifiers.appointment = appointmentDateObj;
    if (deliveryDateObj) modifiers.delivery = deliveryDateObj;

    // Custom modifier class names for styling
    const modifiersClassNames = {
        quotation: "bg-blue-100 text-blue-800 border-blue-300 font-semibold",
        workOrder: "bg-green-100 text-green-800 border-green-300 font-semibold",
        appointment: "bg-orange-100 text-orange-800 border-orange-300 font-semibold",
        delivery: "bg-purple-100 text-purple-800 border-purple-300 font-semibold",
    };

    // Handle date selection and close calendar
    const handleDateSelect = (selectedDate: Date | undefined) => {
        onDateChange(selectedDate);
        setOpen(false); // Close the calendar after selection
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={disabled}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : placeholder}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <DayPicker
                        mode="single"
                        selected={date}
                        onSelect={handleDateSelect}
                        disabled={disabled}
                        modifiers={modifiers}
                        modifiersClassNames={modifiersClassNames}
                        className="rounded-md border p-3"
                        classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4",
                            caption: "flex justify-center pt-1 relative items-center",
                            caption_label: "text-sm font-medium",
                            nav: "space-x-1 flex items-center",
                            nav_button: cn(
                                buttonVariants({ variant: "outline" }),
                                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                            ),
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell:
                                "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                            row: "flex w-full mt-2",
                            cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            day: cn(
                                buttonVariants({ variant: "ghost" }),
                                "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
                            ),
                            day_selected:
                                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                            day_today: "bg-accent text-accent-foreground",
                            day_outside:
                                "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                            day_disabled: "text-muted-foreground opacity-50",
                            day_range_middle:
                                "aria-selected:bg-accent aria-selected:text-accent-foreground",
                            day_hidden: "invisible",
                        }}
                        components={{
                            IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
                            IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
                        }}
                    />

                    {/* Legend for date colors */}
                    <div className="p-3 border-t bg-gray-50">
                        <div className="text-xs font-medium text-gray-700 mb-2">Date Legend:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {quotationDate && (
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
                                    <span>Quote Date</span>
                                </div>
                            )}
                            {workOrderDate && (
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                                    <span>Work Order</span>
                                </div>
                            )}
                            {appointmentDate && (
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></div>
                                    <span>Appointment</span>
                                </div>
                            )}
                            {deliveryDate && (
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></div>
                                    <span>Delivery</span>
                                </div>
                            )}
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
