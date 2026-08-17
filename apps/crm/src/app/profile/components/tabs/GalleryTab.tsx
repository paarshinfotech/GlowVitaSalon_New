import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { UploadCloud, Eye, Trash2, FileText, X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { useUpdateVendorProfileMutation, useUpdateSupplierProfileMutation, useUpdateDoctorProfileMutation } from '@repo/store/api';
import { useCrmAuth } from '@/hooks/useCrmAuth';
import { toast } from 'sonner';

interface GalleryTabProps {
  gallery: string[];
  setVendor: any;
}

export const GalleryTab = ({ gallery, setVendor }: GalleryTabProps) => {
  const [updateVendorProfile] = useUpdateVendorProfileMutation();
  const [updateSupplierProfile] = useUpdateSupplierProfileMutation();
  const [updateDoctorProfile] = useUpdateDoctorProfileMutation();
  const { role } = useCrmAuth();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleSave = async () => {
    try {
      const updateFn = role === 'vendor'
        ? updateVendorProfile
        : role === 'supplier'
          ? updateSupplierProfile
          : updateDoctorProfile;
      const result: any = await updateFn({
        _id: typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('user') || '{}')._id) : undefined,
        gallery: gallery
      }).unwrap();

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update gallery');
    }
  };

  const handleRemoveImage = (index: number) => {
    const newGallery = [...gallery];
    newGallery.splice(index, 1);
    setVendor((prev: any) => ({ ...prev, gallery: newGallery }));
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const newImages: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // File type validation
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}. Only JPG, JPEG, PNG, and WEBP are allowed.`);
        continue;
      }

      // File size validation
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large: ${file.name}. Maximum size allowed is 5MB.`);
        continue;
      }

      // In a real app, you would upload the files to a server and get URLs
      // For now, we'll convert to base64 strings for demonstration
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
        newImages.push(base64);
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error(`Failed to read file: ${file.name}`);
      }
    }

    if (newImages.length > 0) {
      setVendor((prev: any) => ({
        ...prev,
        gallery: [...(prev.gallery || []), ...newImages]
      }));
    }
  };

  const openPreview = (src: string) => {
    setPreviewImage(src);
    setZoom(1);
    setRotation(0);
  };

  const closePreview = () => {
    setPreviewImage(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{role === 'doctor' ? 'Doctor Gallery' : role === 'supplier' ? 'Supplier Gallery' : 'Salon Gallery'}</CardTitle>
        <CardDescription>Manage your {role === 'doctor' ? 'clinic' : role === 'supplier' ? 'business' : "salon's"} photo gallery.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="mb-6 p-6 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => document.getElementById('gallery-upload')?.click()}
        >
          <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Drag & drop images here or click to upload
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Click anywhere in this area to select files
          </p>
          <div className="mt-4 p-3 bg-primary/5 border-l-4 border-primary rounded-r-md">
            <p className="text-xs font-bold text-primary uppercase mb-1">Upload Requirements:</p>
            <ul className="text-[11px] text-primary/80 list-disc list-inside space-y-0.5 font-medium">
              <li>File formats: <span className="font-bold">JPG, JPEG, PNG, WEBP</span></li>
              <li>Maximum file size: <span className="font-bold text-primary underline">5MB</span></li>
            </ul>
          </div>
          <Input
            id="gallery-upload"
            type="file"
            className="hidden"
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
        </div>
        {gallery && gallery.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.map((src, index) => (
              <div key={index} className="relative group aspect-video">
                {src && (src?.startsWith('data:') || src?.startsWith('http')) ? (
                  <img
                    src={src}
                    alt={`Salon image ${index + 1}`}
                    className="object-cover rounded-lg w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => openPreview(src)}
                    onError={(e) => {
                      // Set a fallback image on error
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2Ij5JbWFnZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
                    }}
                  />
                ) : (
                  <div className="bg-gray-200 border-2 border-dashed rounded-lg w-full h-full flex items-center justify-center cursor-pointer" onClick={() => openPreview(src)}>
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                )}

                {/* Top-Right Delete Button */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-700 hover:text-white bg-red-600 text-white z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">No images uploaded yet</p>
        )}

        {/* Image Preview Modal */}
        {previewImage && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={closePreview}>
            <div className="relative max-w-4xl max-h-full w-full" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-12 right-0 h-10 w-10 rounded-lg"
                onClick={closePreview}
              >
                <X className="h-4 w-4" />
              </Button>
              {previewImage?.startsWith('data:') || previewImage?.startsWith('http') ? (
                <div className="relative w-full h-[80vh] flex flex-col items-center justify-center overflow-auto bg-black/40 rounded-xl">
                  <div className="absolute top-4 right-4 flex gap-2 z-10 bg-black/50 p-2 rounded-lg backdrop-blur-md">
                    <Button variant="secondary" size="icon" onClick={() => setZoom(z => Math.min(z + 0.25, 3))}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={() => setRotation(r => r + 90)}>
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-center flex-1 w-full h-full overflow-auto">
                    <img
                      src={previewImage}
                      alt="Preview"
                      style={{ transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: 'transform 0.2s ease-in-out' }}
                      className="object-contain h-full w-full m-auto rounded-lg shadow-2xl"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-full flex items-center justify-center">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} className="h-12 px-6 rounded-lg bg-primary hover:bg-primary/90">
          Save Gallery
        </Button>
      </CardFooter>
    </Card>
  );
};