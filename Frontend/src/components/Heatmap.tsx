import { motion } from 'framer-motion';

interface HeatmapProps {
    data: Record<string, Record<string, number>>;
}

export function Heatmap({ data }: HeatmapProps) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const hours = ['9AM', '12PM', '3PM', '6PM'];

    // Calculate max value for color scaling
    const maxValue = Math.max(...Object.values(data).flatMap(h => Object.values(h)));

    const getIntensity = (val: number) => {
        if (maxValue === 0) return 0;
        return val / maxValue;
    };

    const getColor = (val: number) => {
        const intensity = getIntensity(val);
        // Green to Red gradient based on intensity
        if (intensity < 0.3) return 'bg-green-100 dark:bg-green-900/20';
        if (intensity < 0.6) return 'bg-yellow-100 dark:bg-yellow-900/20';
        if (intensity < 0.8) return 'bg-orange-100 dark:bg-orange-900/20';
        return 'bg-red-100 dark:bg-red-900/20';
    };

    const getTextColor = (val: number) => {
        const intensity = getIntensity(val);
        if (intensity < 0.3) return 'text-green-700 dark:text-green-400';
        if (intensity < 0.6) return 'text-yellow-700 dark:text-yellow-400';
        if (intensity < 0.8) return 'text-orange-700 dark:text-orange-400';
        return 'text-red-700 dark:text-red-400';
    };

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[600px]">
                {/* Grid Header (Hours) */}
                <div className="grid grid-cols-[100px_1fr_1fr_1fr_1fr] gap-4 mb-4">
                    <div />
                    {hours.map(hour => (
                        <div key={hour} className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                            {hour}
                        </div>
                    ))}
                </div>

                {/* Grid Body (Days) */}
                <div className="space-y-4">
                    {days.map(day => (
                        <div key={day} className="grid grid-cols-[100px_1fr_1fr_1fr_1fr] gap-4 items-center">
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {day}
                            </div>
                            {hours.map(hour => {
                                const value = data[day]?.[hour] || 0;
                                return (
                                    <motion.div
                                        key={`${day}-${hour}`}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ scale: 1.05 }}
                                        className={`relative h-20 rounded-xl border flex flex-col items-center justify-center transition-shadow hover:shadow-md cursor-default ${getColor(value)} border-white/20 dark:border-white/5`}
                                    >
                                        <span className={`text-2xl font-bold ${getTextColor(value)}`}>
                                            {value}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-tighter opacity-60">
                                            Transactions
                                        </span>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="mt-8 flex items-center justify-end gap-4 text-xs text-slate-500">
                    <span>Low Activity</span>
                    <div className="flex gap-1">
                        <div className="w-4 h-4 rounded bg-green-100" />
                        <div className="w-4 h-4 rounded bg-yellow-100" />
                        <div className="w-4 h-4 rounded bg-orange-100" />
                        <div className="w-4 h-4 rounded bg-red-100" />
                    </div>
                    <span>High Activity</span>
                </div>
            </div>
        </div>
    );
}
