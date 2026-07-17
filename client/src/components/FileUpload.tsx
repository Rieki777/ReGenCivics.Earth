import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { File, Loader2, Trash2, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";

type UploadedFile = {
  name: string;
  url: string;
  size: number;
  type: string;
};

type FileUploadProps = {
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  label?: string;
  helperText?: string;
};

export function FileUpload({
  value = [],
  onChange,
  maxFiles = 5,
  maxSizeMB = 10,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.webm",
  label = "Upload Documents",
  helperText = "Drag and drop files here, or click to browse",
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = trpc.files.upload.useMutation();

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setError(null);

      // Check max files limit
      if (value.length + files.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const filesToUpload = Array.from(files);

      // Validate file sizes
      for (const file of filesToUpload) {
        if (file.size > maxSizeMB * 1024 * 1024) {
          setError(`File "${file.name}" exceeds ${maxSizeMB}MB limit`);
          return;
        }
      }

      setIsUploading(true);

      try {
        const uploadedFiles: UploadedFile[] = [];

        for (const file of filesToUpload) {
          // Convert file to base64
          const base64 = await fileToBase64(file);

          // Upload via tRPC
          const result = await uploadMutation.mutateAsync({
            fileName: file.name,
            fileData: base64,
            contentType: file.type,
          });

          uploadedFiles.push({
            name: file.name,
            url: result.url,
            size: file.size,
            type: file.type,
          });
        }

        onChange([...value, ...uploadedFiles]);
      } catch (err) {
        console.error("Upload error:", err);
        setError("Failed to upload files. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [value, onChange, maxFiles, maxSizeMB, uploadMutation]
  );

  const removeFile = (index: number) => {
    const newFiles = [...value];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎬";
    if (type.includes("pdf")) return "📄";
    if (type.includes("word") || type.includes("document")) return "📝";
    return "📎";
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-[#1a472a]">
          {label}
        </label>
      )}

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? "border-[#7dd87d] bg-[#7dd87d]/10"
            : "border-[#1a472a]/30 hover:border-[#7dd87d]/50"
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          // tap-audit-ok: invisible file input over its own dropzone, taps are the point
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading || value.length >= maxFiles}
        />

        <div className="text-center">
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#7dd87d]" />
              <p className="text-sm text-[#1a472a]/70">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto text-[#1a472a]/80 mb-2" />
              <p className="text-sm text-[#1a472a]/70">{helperText}</p>
              <p className="text-xs text-[#1a472a]/80 mt-1">
                Max {maxFiles} files, {maxSizeMB}MB each
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <X className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Uploaded Files List */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-[#f0ebe3] rounded-lg"
            >
              <span className="text-xl">{getFileIcon(file.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a472a] truncate">
                  {file.name}
                </p>
                <p className="text-xs text-[#1a472a]/80">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4a7c59] hover:text-[#7dd87d] text-sm"
              >
                View
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

export default FileUpload;
