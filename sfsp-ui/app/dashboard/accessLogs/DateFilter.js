"use client";

import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const presetRanges = [
  {
    label: "Today",
    value: () => ({
      from: new Date(),
      to: new Date(),
    }),
  },
  {
    label: "Yesterday",
    value: () => ({
      from: subDays(new Date(), 1),
      to: subDays(new Date(), 1),
    }),
  },
  {
    label: "Last 7 days",
    value: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    label: "Last 30 days",
    value: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    label: "This month",
    value: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "Last month",
    value: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
];

export function DateFilter({ value, onChange, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState(
    value || { from: undefined, to: undefined }
  );
  const [isCustom, setIsCustom] = useState(false);

  const handlePresetSelect = (preset) => {
    const range = preset.value();
    setDateRange(range);
    onChange?.(range);
    setIsCustom(false);
    setIsOpen(false);
  };

  const handleCustomRangeSelect = (range) => {
    setDateRange(range);
    onChange?.(range);
    setIsCustom(true);
  };

  const formatDateRange = () => {
    if (!dateRange.from) return "Select date range";

    if (!dateRange.to || dateRange.from.getTime() === dateRange.to.getTime()) {
      return format(dateRange.from, "MMM dd, yyyy");
    }

    return `${format(dateRange.from, "MMM dd, yyyy")} - ${format(
      dateRange.to,
      "MMM dd, yyyy"
    )}`;
  };

  const getActivePreset = () => {
    if (isCustom || !dateRange.from || !dateRange.to) return null;

    return presetRanges.find((preset) => {
      const presetRange = preset.value();
      return (
        presetRange.from?.getTime() === dateRange.from?.getTime() &&
        presetRange.to?.getTime() === dateRange.to?.getTime()
      );
    });
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-between min-w-[240px] font-normal",
              !dateRange.from && "text-muted-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              {formatDateRange()}
            </div>
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 shadow-large"
          align="start"
          side="bottom"
        >
          <div className="flex">
            {/* Preset ranges sidebar */}
            <div className="border-r border-border p-3 space-y-1 min-w-[140px] bg-gradient-soft">
              <div className="text-sm font-medium text-foreground mb-2">
                Quick filters
              </div>
              {presetRanges.map((preset) => {
                const activePreset = getActivePreset();
                const isActive = activePreset?.label === preset.label;

                return (
                  <Button
                    key={preset.label}
                    variant={isActive ? "filter-active" : "filter"}
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => handlePresetSelect(preset)}
                  >
                    {preset.label}
                  </Button>
                );
              })}
              <div className="pt-2 border-t border-border">
                <Button
                  variant={isCustom ? "filter-active" : "filter"}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setIsCustom(true)}
                >
                  Custom range
                </Button>
              </div>
            </div>

            {/* Calendar */}
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  if (range) {
                    handleCustomRangeSelect(range);
                  }
                }}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
