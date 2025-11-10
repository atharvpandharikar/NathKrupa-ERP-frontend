import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X, ChevronDown, ChevronUp, CheckCircle2, Loader2, AlertCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Viewport>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Viewport
        ref={ref}
        className={cn(
            "fixed top-0 z-[100] flex max-h-screen w-full flex-col p-4 sm:right-0 md:max-w-[420px]",
            className
        )}
        {...props}
    />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
    "group pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-lg border bg-white shadow-xl transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
    {
        variants: {
            variant: {
                default: "border-gray-200",
                success: "border-green-200 bg-green-50",
                error: "border-red-200 bg-red-50",
                warning: "border-yellow-200 bg-yellow-50",
                info: "border-blue-200 bg-blue-50",
                destructive:
                    "destructive group border-destructive bg-destructive text-destructive-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

interface ExpandableToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> {
    variant?: VariantProps<typeof toastVariants>["variant"]
    showTimer?: boolean
    duration?: number
    expandable?: boolean
    icon?: React.ReactNode
}

const Toast = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Root>,
    ExpandableToastProps
>(({ className, variant, showTimer = true, duration = 5000, expandable = true, icon, children, ...props }, ref) => {
    const [isExpanded, setIsExpanded] = React.useState(false)
    const [timeRemaining, setTimeRemaining] = React.useState(duration)
    const [isPaused, setIsPaused] = React.useState(false)
    const intervalRef = React.useRef<NodeJS.Timeout | null>(null)
    const startTimeRef = React.useRef<number>(Date.now())
    const pausedTimeRef = React.useRef<number>(0)

    React.useEffect(() => {
        if (!showTimer) return

        if (isPaused) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            return
        }

        startTimeRef.current = Date.now() - (duration - timeRemaining)

        intervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current
            const remaining = Math.max(0, duration - elapsed)
            setTimeRemaining(remaining)

            if (remaining <= 0) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }
            }
        }, 16) // Update every 16ms for smooth animation

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [showTimer, duration, isPaused, timeRemaining])

    const handleMouseEnter = () => {
        setIsPaused(true)
    }

    const handleMouseLeave = () => {
        setIsPaused(false)
    }

    const progress = (timeRemaining / duration) * 100

    return (
        <ToastPrimitives.Root
            ref={ref}
            className={cn(toastVariants({ variant }), className)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
        >
            {children}
            {showTimer && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                    <div
                        className="h-full bg-current transition-all duration-75 ease-linear"
                        style={{
                            width: `${progress}%`,
                            backgroundColor: variant === "success" ? "#10b981" : variant === "error" ? "#ef4444" : variant === "warning" ? "#f59e0b" : variant === "info" ? "#3b82f6" : "#6b7280"
                        }}
                    />
                </div>
            )}
        </ToastPrimitives.Root>
    )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Action>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Action
        ref={ref}
        className={cn(
            "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
            className
        )}
        {...props}
    />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Close>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Close
        ref={ref}
        className={cn(
            "absolute right-3 top-3 rounded-md p-1.5 text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 group-hover:opacity-100",
            className
        )}
        toast-close=""
        {...props}
    >
        <X className="h-4 w-4" />
    </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Title>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Title
        ref={ref}
        className={cn("text-sm font-semibold text-gray-900", className)}
        {...props}
    />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Description>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description> & {
        expandable?: boolean
    }
>(({ className, expandable = true, children, ...props }, ref) => {
    const [isExpanded, setIsExpanded] = React.useState(false)
    const contentRef = React.useRef<HTMLDivElement>(null)
    const [shouldShowExpand, setShouldShowExpand] = React.useState(false)

    React.useEffect(() => {
        if (contentRef.current && expandable) {
            const height = contentRef.current.scrollHeight
            const clientHeight = contentRef.current.clientHeight
            setShouldShowExpand(height > clientHeight)
        }
    }, [children, expandable])

    return (
        <ToastPrimitives.Description
            ref={ref}
            className={cn("text-sm text-gray-600", className)}
            {...props}
        >
            <div
                ref={contentRef}
                className={cn(
                    "transition-all duration-300 ease-in-out",
                    isExpanded ? "max-h-none" : "max-h-12 overflow-hidden"
                )}
            >
                {children}
            </div>
            {shouldShowExpand && expandable && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="h-3 w-3" />
                            Show less
                        </>
                    ) : (
                        <>
                            <ChevronDown className="h-3 w-3" />
                            Show more
                        </>
                    )}
                </button>
            )}
        </ToastPrimitives.Description>
    )
})
ToastDescription.displayName = ToastPrimitives.Description.displayName

const ToastIcon = ({ variant }: { variant?: VariantProps<typeof toastVariants>["variant"] }) => {
    const iconClass = "h-5 w-5"

    switch (variant) {
        case "success":
            return <CheckCircle2 className={cn(iconClass, "text-green-600")} />
        case "error":
        case "destructive":
            return <AlertCircle className={cn(iconClass, "text-red-600")} />
        case "warning":
            return <AlertCircle className={cn(iconClass, "text-yellow-600")} />
        case "info":
            return <Info className={cn(iconClass, "text-blue-600")} />
        default:
            return <Info className={cn(iconClass, "text-gray-600")} />
    }
}

type ToastProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants> & {
    showTimer?: boolean
    duration?: number
    expandable?: boolean
    icon?: React.ReactNode
}

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
    type ToastProps,
    type ToastActionElement,
    ToastProvider,
    ToastViewport,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
    ToastAction,
    ToastIcon,
}

