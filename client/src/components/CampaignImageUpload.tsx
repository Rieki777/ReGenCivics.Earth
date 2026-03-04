/**
 * Campaign Image Upload Component
 * Specialized image uploader for crowd-pooling campaigns.
 * Supports categories (land, team, progress, etc.), captions, and cover image selection.
 * Uses S3 storage via tRPC campaigns.uploadImage procedure.
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Camera, ImagePlus, Loader2, Star, StarOff, Trash2, X, Mountain, Users, TrendingUp, Building, Heart, Package } from 'lucide-react';
import { useCallback, useState } from 'react';

export type CampaignImageData = {
  id: number;
  url: string;
  fileName: string | null;
  category: string;
  caption: string | null;
  isCover: number;
  fileSize: number | null;
};

const IMAGE_CATEGORIES = [
  { value: 'land', label: 'Land / Landscape', icon: Mountain },
  { value: 'team', label: 'Team / People', icon: Users },
  { value: 'progress', label: 'Progress / Before-After', icon: TrendingUp },
  { value: 'infrastructure', label: 'Infrastructure', icon: Building },
  { value: 'community', label: 'Community', icon: Heart },
  { value: 'other', label: 'Other', icon: Package },
] as const;

type CategoryValue = typeof IMAGE_CATEGORIES[number]['value'];

type CampaignImageUploadProps = {
  campaignId: number;
  maxImages?: number;
};

export function CampaignImageUpload({ campaignId, maxImages = 12 }: CampaignImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<CategoryValue>('land');
  const [uploadCaption, setUploadCaption] = useState('');

  // Fetch existing images
  const { data: images, refetch: refetchImages } = trpc.campaigns.getImages.useQuery({ campaignId });
  
  // Mutations
  const uploadMutation = trpc.campaigns.uploadImage.useMutation({
    onSuccess: () => {
      refetchImages();
      setUploadCaption('');
    },
  });

  const deleteMutation = trpc.campaigns.deleteImage.useMutation({
    onSuccess: () => refetchImages(),
  });

  const setCoverMutation = trpc.campaigns.setCoverImage.useMutation({
    onSuccess: () => refetchImages(),
  });

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);

      const currentCount = images?.length || 0;
      if (currentCount + files.length > maxImages) {
        setError(`Maximum ${maxImages} images allowed. You have ${currentCount} already.`);
        return;
      }

      const filesToUpload = Array.from(files);

      // Validate
      for (const file of filesToUpload) {
        if (file.size > 5 * 1024 * 1024) {
          setError(`"${file.name}" exceeds 5MB limit. Please compress or resize it.`);
          return;
        }
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
          setError(`"${file.name}" is not a supported image format. Use JPEG, PNG, WebP, or GIF.`);
          return;
        }
      }

      setIsUploading(true);

      try {
        for (const file of filesToUpload) {
          const base64 = await fileToBase64(file);
          await uploadMutation.mutateAsync({
            campaignId,
            fileName: file.name,
            fileData: base64,
            contentType: file.type,
            fileSize: file.size,
            category: uploadCategory,
            caption: uploadCaption || undefined,
            isCover: currentCount === 0, // First image is auto-cover
          });
        }
      } catch (err: any) {
        console.error('Upload error:', err);
        setError(err?.message || 'Failed to upload image. Please try again.');
      } finally {
        setIsUploading(false);
      }
    },
    [campaignId, images, maxImages, uploadCategory, uploadCaption, uploadMutation]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm('Remove this image?')) return;
    try {
      await deleteMutation.mutateAsync({ imageId });
    } catch (err: any) {
      setError(err?.message || 'Failed to delete image');
    }
  };

  const handleSetCover = async (imageId: number) => {
    try {
      await setCoverMutation.mutateAsync({ campaignId, imageId });
    } catch (err: any) {
      setError(err?.message || 'Failed to set cover image');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryIcon = (cat: string) => {
    const found = IMAGE_CATEGORIES.find(c => c.value === cat);
    if (!found) return Package;
    return found.icon;
  };

  const getCategoryLabel = (cat: string) => {
    return IMAGE_CATEGORIES.find(c => c.value === cat)?.label || 'Other';
  };

  const imageCount = images?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-[#1a472a]">
          <Camera className="w-4 h-4 inline mr-1" />
          Campaign Photos ({imageCount}/{maxImages})
        </label>
        {imageCount > 0 && (
          <span className="text-xs text-[#1a472a]/60">
            Tap the star to set a cover image
          </span>
        )}
      </div>

      {/* Upload Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={uploadCategory} onValueChange={(v) => setUploadCategory(v as CategoryValue)}>
          <SelectTrigger className="w-full sm:w-[180px] bg-white border-[#1a472a]/20 text-[#1a472a]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                <span className="flex items-center gap-2">
                  <cat.icon className="w-3 h-3" />
                  {cat.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Caption (optional)"
          value={uploadCaption}
          onChange={(e) => setUploadCaption(e.target.value)}
          className="flex-1 bg-white border-[#1a472a]/20 text-[#1a472a] placeholder:text-[#1a472a]/40"
          maxLength={500}
        />
      </div>

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 transition-colors ${
          dragActive
            ? 'border-[#7dd87d] bg-[#7dd87d]/10'
            : 'border-[#1a472a]/20 hover:border-[#7dd87d]/50 bg-white/50'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => handleFiles(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading || imageCount >= maxImages}
        />
        <div className="text-center">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#7dd87d]" />
              <p className="text-sm text-[#1a472a]/70">Uploading your photo...</p>
            </div>
          ) : imageCount >= maxImages ? (
            <div className="flex flex-col items-center gap-2">
              <Camera className="w-8 h-8 text-[#1a472a]/30" />
              <p className="text-sm text-[#1a472a]/50">Maximum images reached</p>
            </div>
          ) : (
            <>
              <ImagePlus className="w-8 h-8 mx-auto text-[#4a7c59] mb-2" />
              <p className="text-sm text-[#1a472a]/70">
                Drop images here or tap to browse
              </p>
              <p className="text-xs text-[#1a472a]/50 mt-1">
                JPEG, PNG, WebP, or GIF. Max 5MB each.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          <X className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Image Grid */}
      {images && images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img: CampaignImageData) => {
            const CatIcon = getCategoryIcon(img.category);
            return (
              <div
                key={img.id}
                className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                  img.isCover ? 'border-[#7dd87d] ring-2 ring-[#7dd87d]/30' : 'border-transparent'
                }`}
              >
                {/* Image */}
                <div className="aspect-[4/3] bg-[#f0ebe3]">
                  <img
                    src={img.url}
                    alt={img.caption || img.fileName || 'Campaign photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Overlay on hover/tap */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-start justify-between p-2">
                  {/* Cover badge */}
                  {img.isCover ? (
                    <span className="bg-[#7dd87d] text-[#1a472a] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" /> Cover
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetCover(img.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 text-[#1a472a] p-1.5 rounded-full hover:bg-white"
                      title="Set as cover image"
                    >
                      <StarOff className="w-3 h-3" />
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 text-white p-1.5 rounded-full hover:bg-red-600"
                    title="Remove image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Bottom info bar */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pt-6">
                  <div className="flex items-center gap-1 text-white/90">
                    <CatIcon className="w-3 h-3" />
                    <span className="text-[10px] font-medium">{getCategoryLabel(img.category)}</span>
                    {img.fileSize && (
                      <span className="text-[10px] text-white/60 ml-auto">
                        {formatFileSize(img.fileSize)}
                      </span>
                    )}
                  </div>
                  {img.caption && (
                    <p className="text-[10px] text-white/80 mt-0.5 line-clamp-1">{img.caption}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tip */}
      {imageCount === 0 && (
        <p className="text-xs text-[#1a472a]/50 text-center">
          Add photos of your land, team, and progress to make your campaign more compelling.
          The first image you upload will automatically become your cover photo.
        </p>
      )}
    </div>
  );
}

// Helper: convert File to base64 string
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

export default CampaignImageUpload;
