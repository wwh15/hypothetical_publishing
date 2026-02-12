"use client";

import { useId, useState, useRef, useEffect } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSeriesSearch } from "@/hooks/useSeriesSearch";
import { SeriesListItem } from "@/lib/data/books";
import { createSeries } from "@/app/(main)/books/action";

interface SeriesSelectBoxProps {
  series: SeriesListItem[];
  selectedSeriesId: number | null;
  onSelect: (seriesId: number | null) => void;
  onSeriesCreated?: (newSeries: SeriesListItem) => void;
  placeholder?: string;
}

export function SeriesSelectBox({
  series,
  selectedSeriesId,
  onSelect,
  onSeriesCreated,
  placeholder = "Type to search or add new series...",
}: SeriesSelectBoxProps) {
  const contentId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { searchQuery, setSearchQuery, filteredSeries } = useSeriesSearch(series);

  const selectedSeries = series.find((s) => s.id === selectedSeriesId);
  const [isCreating, setIsCreating] = useState(false);

  // Update input value when selected series changes externally
  useEffect(() => {
    if (selectedSeries) {
      setInputValue(selectedSeries.name);
    } else if (!isOpen) {
      setInputValue("");
    }
  }, [selectedSeries, isOpen]);

  // Update search query when input value changes
  useEffect(() => {
    setSearchQuery(inputValue);
  }, [inputValue, setSearchQuery]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay closing to allow click events on dropdown items
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleSelectSeries = (seriesId: number) => {
    const selected = series.find((s) => s.id === seriesId);
    if (selected) {
      setInputValue(selected.name);
      onSelect(seriesId);
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClearSelection = () => {
    setInputValue("");
    onSelect(null);
    inputRef.current?.focus();
  };

  const handleCreateFromInput = async () => {
    if (!inputValue.trim()) {
      return;
    }

    // Check if exact match exists
    const exactMatch = series.find(
      (s) => s.name.toLowerCase() === inputValue.trim().toLowerCase()
    );
    if (exactMatch) {
      handleSelectSeries(exactMatch.id);
      return;
    }

    // Create new series
    setIsCreating(true);

    try {
      const result = await createSeries(inputValue.trim());
      
      if (result.success) {
        const newSeries: SeriesListItem = {
          id: result.seriesId,
          name: inputValue.trim(),
          description: null,
        };
        
        // Select the newly created series
        onSelect(result.seriesId);
        onSeriesCreated?.(newSeries);
        setIsOpen(false);
      } else {
        // Show error - could add error state here if needed
        console.error(result.error || "Failed to create series");
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsCreating(false);
    }
  };


  // Check if current input matches any existing series
  const exactMatch = series.find(
    (s) => s.name.toLowerCase() === inputValue.trim().toLowerCase()
  );
  const showCreateOption = inputValue.trim() && !exactMatch;

  return (
    <Popover open={isOpen && (filteredSeries.length > 0 || showCreateOption)}>
      <div className="relative">
        <PopoverAnchor asChild>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter" && showCreateOption && !isCreating) {
                  e.preventDefault();
                  handleCreateFromInput();
                } else if (e.key === "Escape") {
                  setIsOpen(false);
                  inputRef.current?.blur();
                }
              }}
              placeholder={placeholder}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "dark:bg-gray-700",
              )}
              disabled={isCreating}
            />
            {selectedSeriesId && inputValue && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm opacity-70 hover:opacity-100 focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          id={contentId}
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty>
                {inputValue.trim() ? (
                  <div className="py-2 text-center text-sm text-muted-foreground">
                    No series found matching &quot;{inputValue.trim()}&quot;
                  </div>
                ) : (
                  "Start typing to search for a series..."
                )}
              </CommandEmpty>
              <CommandGroup>
                {filteredSeries.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={s.name}
                    onSelect={() => handleSelectSeries(s.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedSeriesId === s.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{s.name}</span>
                      {s.description && (
                        <span className="text-xs text-muted-foreground">
                          {s.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
                {showCreateOption && (
                  <CommandItem
                    onSelect={handleCreateFromInput}
                    className="text-primary font-medium"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Create new series: &quot;{inputValue.trim()}&quot;</span>
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </div>
    </Popover>
  );
}
