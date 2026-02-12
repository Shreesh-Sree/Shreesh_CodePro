import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    label?: string;
}

export function DateTimePicker({ date, setDate, label }: DateTimePickerProps) {
    const [selectedDateTime, setSelectedDateTime] = React.useState<Date | undefined>(date);

    React.useEffect(() => {
        if (date) {
            setSelectedDateTime(date);
        }
    }, [date]);

    const handleDateSelect = (day: Date | undefined) => {
        if (!day) {
            setDate(undefined);
            setSelectedDateTime(undefined);
            return;
        }
        const newDateTime = selectedDateTime ? new Date(selectedDateTime) : new Date();
        newDateTime.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());

        // Preserve time if it existed, otherwise default to 12:00 or current time
        if (!selectedDateTime) {
            newDateTime.setHours(12, 0, 0, 0);
        }

        setSelectedDateTime(newDateTime);
        setDate(newDateTime);
    };

    const handleTimeChange = (type: 'hour' | 'minute', value: number) => {
        const newDateTime = selectedDateTime ? new Date(selectedDateTime) : new Date();
        if (type === 'hour') {
            newDateTime.setHours(value);
        } else {
            newDateTime.setMinutes(value);
        }
        setSelectedDateTime(newDateTime);
        setDate(newDateTime);
    };

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal h-11 bg-background border-input hover:bg-accent hover:text-accent-foreground",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP p") : <span>{label || "Pick a date"}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-border/50 bg-popover/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden flex" align="start">
                <div className="p-0 border-r border-border/50">
                    <Calendar
                        mode="single"
                        selected={selectedDateTime}
                        onSelect={handleDateSelect}
                        initialFocus
                        className="bg-transparent border-none shadow-none"
                    />
                </div>
                <div className="p-3 w-[160px] flex flex-col bg-muted/10">
                    <div className="flex items-center gap-2 mb-3 px-1">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Time</span>
                    </div>
                    <div className="flex gap-2 h-[300px] min-h-0">
                        <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
                            <span className="text-[10px] text-center font-mono text-muted-foreground uppercase">Hr</span>
                            <div className="flex-1 h-full rounded-md border border-border/50 bg-background/50 overflow-y-auto">
                                <div className="flex flex-col p-1 gap-1">
                                    {hours.map((hour) => (
                                        <button
                                            key={hour}
                                            onClick={() => handleTimeChange('hour', hour)}
                                            className={cn(
                                                "w-full text-center text-sm py-1 rounded hover:bg-primary/20 transition-colors font-mono",
                                                selectedDateTime?.getHours() === hour ? "bg-primary text-primary-foreground font-bold" : "text-foreground"
                                            )}
                                        >
                                            {hour.toString().padStart(2, '0')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
                            <span className="text-[10px] text-center font-mono text-muted-foreground uppercase">Min</span>
                            <div className="flex-1 h-full rounded-md border border-border/50 bg-background/50 overflow-y-auto">
                                <div className="flex flex-col p-1 gap-1">
                                    {minutes.map((minute) => (
                                        <button
                                            key={minute}
                                            onClick={() => handleTimeChange('minute', minute)}
                                            className={cn(
                                                "w-full text-center text-sm py-1 rounded hover:bg-primary/20 transition-colors font-mono",
                                                selectedDateTime?.getMinutes() === minute ? "bg-primary text-primary-foreground font-bold" : "text-foreground"
                                            )}
                                        >
                                            {minute.toString().padStart(2, '0')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
