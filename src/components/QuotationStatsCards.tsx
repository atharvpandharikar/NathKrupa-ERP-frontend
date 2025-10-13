import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { QuotationStats } from '@/types/quotation-list';

interface QuotationStatsCardsProps {
    stats: QuotationStats;
    icons: {
        FileText: React.ComponentType<{ className?: string }>;
        Activity: React.ComponentType<{ className?: string }>;
        CalendarDays: React.ComponentType<{ className?: string }>;
    };
}

const QuotationStatsCards: React.FC<QuotationStatsCardsProps> = ({
    stats,
    icons,
}) => {
    const { FileText, Activity, CalendarDays } = icons;
    const cards = [
        {
            title: 'Total Quotations',
            icon: <FileText className="text-primary/80 h-5 w-5" />,
            value: stats.totalCount,
            desc: 'All time quotations',
            accent: 'from-green-300/60 via-blue-100/40 to-blue-400/40',
            gridColor: 'text-green-200 dark:text-blue-900',
        },
        {
            title: 'Todays Quotations',
            icon: <Activity className="text-primary/80 h-5 w-5" />,
            value: stats.todayCount,
            desc: 'Generated today',
            accent: 'from-purple-300/60 via-pink-100/40 to-pink-400/40',
            gridColor: 'text-pink-200 dark:text-purple-900',
        },
        {
            title: 'Recent Activity',
            icon: <CalendarDays className="text-primary/80 h-5 w-5" />,
            value: stats.recentCount,
            desc: 'Last 24 hours',
            accent: 'from-yellow-200/60 via-orange-100/40 to-orange-300/40',
            gridColor: 'text-yellow-200 dark:text-orange-900',
        },
    ];

    return (
        <div className="mt-24 grid gap-6 md:grid-cols-3">
            {cards.map((card, idx) => (
                <div
                    key={idx}
                    className={`relative overflow-hidden rounded-xl bg-gradient-to-br p-1 ${card.accent} z-0 shadow-lg transition-all duration-300 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] before:from-white/10 before:to-transparent hover:scale-[1.010] dark:before:from-white/5`}
                    style={{ minHeight: 160 }}
                >
                    <Card className="relative z-10 flex h-full flex-col justify-between border-none bg-white/70 shadow-none backdrop-blur-xl transition-all duration-300 dark:bg-neutral-900/60">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 rounded-2xl pb-2">
                            <CardTitle className="text-base font-semibold tracking-tight text-gray-800 dark:text-gray-100">
                                {card.title}
                            </CardTitle>
                            <span className="flex items-center justify-center rounded-full bg-white/60 p-2 shadow dark:bg-neutral-800/60">
                                {card.icon}
                            </span>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-extrabold text-gray-900 drop-shadow-sm dark:text-white">
                                {card.value}
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {card.desc}
                            </p>
                        </CardContent>
                    </Card>
                    {/* Subtle grid background */}
                    <svg
                        className={`pointer-events-none absolute inset-0 h-full w-full opacity-20 ${card.gridColor}`}
                        style={{ zIndex: 0 }}
                        width="100%"
                        height="100%"
                    >
                        <defs>
                            <pattern
                                id={`grid-${idx}`}
                                width="32"
                                height="32"
                                patternUnits="userSpaceOnUse"
                            >
                                <path
                                    d="M 32 0 L 0 0 0 32"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="0.5"
                                />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#grid-${idx})`} />
                    </svg>
                </div>
            ))}
        </div>
    );
};

export default QuotationStatsCards;
