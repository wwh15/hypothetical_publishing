"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getBooksInSeries, reorderSeriesBooks } from "../action";
import { SeriesBook } from "@/lib/data/books";
import { cn } from "@/lib/utils";

/** Sentinel id for the current (unsaved) book in the form - not persisted until form save */
export const CURRENT_BOOK_SENTINEL = -1;

export type SeriesOrderItem = SeriesBook & { id: number };

interface SeriesOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: number;
  seriesName: string;
  /** Current book being edited/created - not in series yet. Shown in list so user can position it. */
  currentBook?: { title: string; author: string };
  /** Called when user applies order with unsaved current book - order is stored for form submit */
  onOrderChange?: (orderedIds: number[]) => void;
  onReorderComplete?: () => void;
}

function SortableBookRow({
  book,
  index,
  isUnsaved,
}: {
  book: SeriesOrderItem;
  index: number;
  isUnsaved?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        type="button"
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="text-sm font-medium tabular-nums text-muted-foreground w-6">
        {index + 1}.
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{book.title}</p>
        <p className="truncate text-sm text-muted-foreground">
          {book.author}
          {isUnsaved && (
            <span className="ml-1 text-amber-600 dark:text-amber-400">
              (unsaved)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function SeriesOrderModal({
  open,
  onOpenChange,
  seriesId,
  seriesName,
  currentBook,
  onOrderChange,
  onReorderComplete,
}: SeriesOrderModalProps) {
  const [books, setBooks] = useState<SeriesOrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasUnsavedCurrentBook = !!currentBook;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!open || !seriesId) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setError(null);
        setIsLoading(true);
      }
    });
    getBooksInSeries(seriesId)
      .then((fetched) => {
        if (cancelled) return;
          let items: SeriesOrderItem[] = fetched;
          if (currentBook) {
            items = [
              ...fetched,
              {
                id: CURRENT_BOOK_SENTINEL,
                title: currentBook.title.trim() || "(No title yet)",
                author: currentBook.author.trim() || "(No author yet)",
                seriesOrder: fetched.length + 1,
              },
            ];
          }
          setBooks(items);
        })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load books");
          setBooks([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentBook intentionally omitted; refetch only when open/seriesId changes
  }, [open, seriesId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setBooks((items) => {
      const oldIndex = items.findIndex((b) => b.id === active.id);
      const newIndex = items.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleSave = async () => {
    if (books.length === 0) return;
    const orderedIds = books.map((b) => b.id);

    if (hasUnsavedCurrentBook) {
      // Don't persist - pass order to form, will apply on form submit
      onOrderChange?.(orderedIds);
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    const result = await reorderSeriesBooks(seriesId, orderedIds);
    if (result.success) {
      onReorderComplete?.();
      onOpenChange(false);
    } else {
      setError(result.error ?? "Failed to save order");
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!isSaving}
        onPointerDownOutside={(e) => isSaving && e.preventDefault()}
        onEscapeKeyDown={(e) => isSaving && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Reorder series: {seriesName}</DialogTitle>
          <DialogDescription>
            {hasUnsavedCurrentBook
              ? "Drag and drop to set the order. The unsaved book will be placed when you save the form."
              : "Drag and drop books to change their order in the series. Changes are saved when you click Save."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Loading books...
          </div>
        ) : books.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No books in this series yet.
          </p>
        ) : (
          <div
            className="space-y-2 max-h-[60vh] overflow-y-auto overflow-x-hidden pr-1"
            style={{ minHeight: 0 }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            >
              <SortableContext
                items={books.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {books.map((book, index) => (
                  <SortableBookRow
                    key={book.id}
                    book={book}
                    index={index}
                    isUnsaved={book.id === CURRENT_BOOK_SENTINEL}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || books.length === 0}
          >
            {hasUnsavedCurrentBook
              ? "Apply order"
              : isSaving
                ? "Saving..."
                : "Save order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
