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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  placeholder = "Search series...",
}: SeriesSelectBoxProps) {
  const contentId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { searchQuery, setSearchQuery, filteredSeries } = useSeriesSearch(series);

  const selectedSeries = series.find((s) => s.id === selectedSeriesId);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [newSeriesDescription, setNewSeriesDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Track the last selected series ID to detect when it changes externally
  const lastSelectedSeriesIdRef = useRef<number | null>(selectedSeriesId);

  // Initialize input value when component mounts or selectedSeriesId changes
  useEffect(() => {
    // Update ref if selectedSeriesId changed
    if (lastSelectedSeriesIdRef.current !== selectedSeriesId) {
      lastSelectedSeriesIdRef.current = selectedSeriesId;
    }

    // Update input value based on selected series
    if (selectedSeries) {
      // Always update to match the selected series (important for initial load when editing)
      setInputValue(selectedSeries.name);
    } else if (selectedSeriesId === null && !isOpen && !inputValue) {
      // Only clear if nothing is selected, dropdown is closed, and input is empty
      setInputValue("");
    }
    // Note: If selectedSeriesId is set but selectedSeries is undefined (series list not loaded yet),
    // the input will be populated once the series list loads and selectedSeries becomes defined
  }, [selectedSeriesId, selectedSeries?.name, selectedSeries?.id, series]);

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
      const typed = inputValue.trim();
      if (!typed) return;

      const exact = series.find(
        (s) => s.name.toLowerCase() === typed.toLowerCase(),
      );
      if (exact) {
        // If user typed an exact existing series name, select it.
        onSelect(exact.id);
        setInputValue(exact.name);
        return;
      }

      // Otherwise revert to selected series (or clear)
      if (selectedSeries) {
        setInputValue(selectedSeries.name);
      } else {
        setInputValue("");
      }
    }, 200);
  };

  const handleSelectSeries = (seriesId: number) => {
    const selected = series.find((s) => s.id === seriesId);
    if (selected) {
      lastSelectedSeriesIdRef.current = seriesId;
      setInputValue(selected.name);
      onSelect(seriesId);
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClearSelection = () => {
    setInputValue("");
    lastSelectedSeriesIdRef.current = null;
    onSelect(null);
    inputRef.current?.focus();
  };

  const handleCreateSeries = async () => {
    const name = newSeriesName.trim();
    const description = newSeriesDescription.trim();
    if (!name) {
      setCreateError("Series name is required");
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    try {
      const result = await createSeries(name, description || undefined);
      if (!result.success) {
        setCreateError(result.error || "Failed to create series");
        return;
      }

      const newSeries: SeriesListItem = {
        id: result.seriesId,
        name,
        description: description || null,
      };

      // Notify parent to refresh series list (user can manually select the new series)
      onSeriesCreated?.(newSeries);

      setIsCreateDialogOpen(false);
      setNewSeriesName("");
      setNewSeriesDescription("");
      setIsOpen(false);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Popover open={isOpen}>
        <div className="relative flex-1">
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
                  if (e.key === "Escape") {
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
                  {searchQuery.trim() ? (
                    <div className="py-2 text-center text-sm text-muted-foreground">
                      No series found matching &quot;{searchQuery.trim()}&quot;
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
                            : "opacity-0",
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
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </div>
      </Popover>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0"
          onClick={() => {
            setCreateError(null);
            setNewSeriesName("");
            setNewSeriesDescription("");
            setIsCreateDialogOpen(true);
          }}
          disabled={isCreating}
        >
          <Plus className="h-4 w-4" />
          <span className="ml-2">Add series</span>
        </Button>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new series</DialogTitle>
            <DialogDescription>
              Add a new series, then it will be selectable in the search box.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {createError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {createError}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="newSeriesName" className="text-sm font-medium">
                Series name <span className="text-red-500">*</span>
              </label>
              <input
                id="newSeriesName"
                type="text"
                value={newSeriesName}
                onChange={(e) => {
                  setNewSeriesName(e.target.value);
                  if (createError) setCreateError(null);
                }}
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "dark:bg-gray-700",
                )}
                placeholder="e.g., The Stormlight Archive"
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="newSeriesDescription"
                className="text-sm font-medium"
              >
                Description (optional)
              </label>
              <textarea
                id="newSeriesDescription"
                value={newSeriesDescription}
                onChange={(e) => setNewSeriesDescription(e.target.value)}
                className={cn(
                  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "dark:bg-gray-700",
                )}
                placeholder="Optional blurb about the series"
                rows={3}
                disabled={isCreating}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateSeries}
              disabled={isCreating || !newSeriesName.trim()}
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
