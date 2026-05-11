"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (imageRef: string) => Promise<void>;
}

export function AddImageModal({ open, onOpenChange, onSubmit }: Props) {
  const [imageRef, setImageRef] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setImageRef(""); setLoading(false); }
  }, [open]);

  const handleSubmit = async () => {
    const ref = imageRef.trim();
    if (!ref) return;
    setLoading(true);
    try {
      await onSubmit(ref);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Image</DialogTitle>
          <DialogDescription>
            Enter the image reference to pull onto the device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="image-ref">Image</Label>
          <Input
            id="image-ref"
            value={imageRef}
            onChange={e => setImageRef(e.target.value)}
            placeholder="e.g. adguard/adguardhome:latest"
            className="font-mono"
            autoFocus
            onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!imageRef.trim() || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
