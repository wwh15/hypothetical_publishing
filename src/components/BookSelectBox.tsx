"use client";

import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useBookSearch } from "@/hooks/useBookSearch";
import { useBookSelection } from "@/hooks/useBookSelection";

interface Book {
  id: number;
  title: string;
  author: { name: string };
  authorRoyaltyRate: number;
}

interface BookSelectBoxProps {
  books: Book[];
  selectedBookId: string;
  onSelect: (bookId: string) => void;
  placeholder?: string;
}

export function BookSelectBox({
  books,
  selectedBookId,
  onSelect,
  placeholder = "Select Book",
}: BookSelectBoxProps) {
  const { searchQuery, setSearchQuery, filteredBooks } = useBookSearch(books);
  const { open, setOpen, bookDisplayValue, handleBookSelect } = useBookSelection(
    books,
    selectedBookId,
    (bookId) => {
      onSelect(bookId);
      setSearchQuery("");
    }
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-gray-700",
            !selectedBookId && "text-muted-foreground"
          )}
        >
          <span className="truncate">{bookDisplayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder="Search books..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No book found.</CommandEmpty>
            <CommandGroup>
              {filteredBooks.map((book) => (
                <CommandItem
                  key={book.id}
                  value={`${book.title} ${book.author.name}`}
                  onSelect={() => handleBookSelect(book.id.toString())}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedBookId === book.id.toString()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {book.title} - {book.author.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}