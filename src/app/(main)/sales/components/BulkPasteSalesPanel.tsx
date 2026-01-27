"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function BulkPasteSalesPanel() {
  const [text, setText] = useState("");

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Bulk paste sales records</CardTitle>
        <CardDescription>
          Paste multiple records at once (one per line). We’ll parse and validate
          these before adding them to Pending Records.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="font-medium mb-2">Expected format</div>
          <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
MM-YYYY,ISBN,Quantity,PublisherRevenue
01-2026,9781234567890,120,4125.50
01-2026,9780987654321,80,2600
          </pre>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bulk-text">Paste records</Label>
          <Textarea
            id="bulk-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`01-2026,9781234567890,120,4125.50\n01-2026,9780987654321,80,2600`}
            className="font-mono"
          />
        </div>

        {/* Placeholder preview area — you’ll populate later */}
        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          Preview will appear here after you wire parsing.
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setText("")}
          disabled={!text.trim()}
        >
          Clear
        </Button>

        {/* Placeholder buttons — you’ll wire functionality next */}
        <Button type="button" variant="secondary" disabled={!text.trim()}>
          Preview
        </Button>
        <Button type="button" disabled={!text.trim()}>
          Add valid rows
        </Button>
      </CardFooter>
    </Card>
  );
}