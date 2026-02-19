"use client";

import { useState, useRef, useEffect } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Author } from "@prisma/client";

interface AuthorSelectBoxProps {
  authors: Author[];
  selectedAuthorId: number | null;
  onSelect: (id: number | null) => void;
  onAddClick?: () => void;
}

export function AuthorSelectBox({ authors, selectedAuthorId, onSelect, onAddClick }: AuthorSelectBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [prevId, setPrevId] = useState<number | null>(selectedAuthorId);

  const selectedAuthor = authors.find((a) => a.id === selectedAuthorId);

  if (selectedAuthorId !== prevId) {
    setPrevId(selectedAuthorId);
    setInputValue(selectedAuthor ? selectedAuthor.name : "");
  }

  const filteredAuthors = authors.filter((a) =>
    a.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (!isOpen) setIsOpen(true);
    if (selectedAuthorId) onSelect(null); // Clear parent selection immediately on type
  };

  return (
    <div className="flex gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <div className="relative flex-1">
          <PopoverAnchor asChild>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Search authors..."
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setIsOpen(true)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {selectedAuthorId && (
                <button
                  type="button"
                  onClick={() => {
                    onSelect(null);
                    setInputValue("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </PopoverAnchor>

          <PopoverContent 
            className="w-[var(--radix-popover-trigger-width)] p-0" 
            align="start"
            // Crucial: prevents the popover from stealing focus when it opens
            onOpenAutoFocus={(e) => e.preventDefault()} 
          >
            <Command shouldFilter={false}>
              <CommandList>
                <CommandEmpty className="p-4 text-sm text-muted-foreground">No author found.</CommandEmpty>
                <CommandGroup>
                  {filteredAuthors.map((author) => (
                    <CommandItem
                      key={author.id}
                      onSelect={() => {
                        onSelect(author.id);
                        setInputValue(author.name);
                        setIsOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selectedAuthorId === author.id ? "opacity-100" : "opacity-0")} />
                      <div className="flex flex-col">
                        <span>{author.name}</span>
                        <span className="text-xs text-muted-foreground">{author.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </div>
      </Popover>

      {onAddClick && (
        <Button type="button" variant="outline" onClick={onAddClick} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      )}
    </div>
  );
}