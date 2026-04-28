import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Star, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";

interface ImageManagerProps {
  itemId: string;
  itemName: string;
  isOpen: boolean;
  onClose: () => void;
  onImagesUpdated?: () => void;
}

export function ImageManager({
  itemId,
  itemName,
  isOpen,
  onClose,
  onImagesUpdated,
}: ImageManagerProps) {
  const { session } = useSession();
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      const data = await inventoryService.listItemImages(session.tenant_id, session, itemId);
      setImages(data);
    } catch (err) {
      console.error("Failed to fetch images:", err);
      setError("Failed to load images.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && itemId) {
      fetchImages();
    }
  }, [isOpen, itemId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await inventoryService.uploadItemImage(session.tenant_id, session, itemId, file);
      await fetchImages();
      onImagesUpdated?.();
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Failed to upload image.");
    } finally {
      setUploading(false);
      // Clear input
      e.target.value = "";
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      await inventoryService.deleteItemImage(session.tenant_id, session, itemId, imageId);
      await fetchImages();
      onImagesUpdated?.();
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Failed to delete image.");
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await inventoryService.setPrimaryItemImage(session.tenant_id, session, itemId, imageId);
      await fetchImages();
      onImagesUpdated?.();
    } catch (err) {
      console.error("Set primary failed:", err);
      setError("Failed to set primary image.");
    }
  };

  const getFullUrl = (url: string) => {
    const baseUrl = (window as any).VITE_API_URL || "http://localhost:3001/v1";
    // If URL starts with /v1, it's relative to the API root
    if (url.startsWith("/v1")) {
      return `${baseUrl.replace("/v1", "")}${url}`;
    }
    return url;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Images - {itemName}</DialogTitle>
          <DialogDescription>
            Upload and manage images for this inventory item. The primary image will be shown in the stock list.
          </DialogDescription>
        </DialogHeader>

        {error && <FeedbackAlert message={null} error={error} onClear={() => setError(null)} />}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="col-span-full flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : images.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/50">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No images found for this item.</p>
            </div>
          ) : (
            images.map((img) => (
              <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-black/5">
                <img
                  src={getFullUrl(img.url)}
                  alt="Item"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant={img.is_primary ? "default" : "secondary"}
                    onClick={() => handleSetPrimary(img.id)}
                    title={img.is_primary ? "Primary Image" : "Set as Primary"}
                  >
                    <Star className={`h-4 w-4 ${img.is_primary ? "fill-current" : ""}`} />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(img.id)}
                    title="Delete Image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {img.is_primary && (
                  <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wider">
                    Primary
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="sm:justify-between items-center">
          <div className="flex items-center gap-2">
            <input
              type="file"
              id="image-upload"
              className="hidden"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button
              asChild
              variant="outline"
              disabled={uploading}
            >
              <label htmlFor="image-upload" className="cursor-pointer flex items-center gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Upload New Image"}
              </label>
            </Button>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
