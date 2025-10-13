/**
 * Formats a number as currency
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Calculates the total price for an order item
 */
export function calculateItemTotal(price: number, quantity: number): number {
    return price * quantity;
}

/**
 * Truncates a string to a specified length
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
}

/**
 * Calculates the subtotal for all items in an order
 */
export function calculateSubtotal(
    items: { item: { price: number }; quantity: number }[],
): number {
    return items.reduce((sum, item) => sum + item.item.price * item.quantity, 0);
}

/**
 * Calculates the total amount for an order including discounts and shipping
 */
export function calculateOrderTotal(
    items: { item: { price: number }; quantity: number }[],
    discountPercentage: number,
    shippingCost: number,
): number {
    const subtotal = calculateSubtotal(items);
    const discount = subtotal * (discountPercentage / 100);
    const tax = subtotal * 0.18; // 18% tax
    return subtotal - discount + tax + shippingCost;
}

/**
 * Formats a date string to a more readable format
 */
export const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
