/**
 * FileUploadInput Component
 * Handles file uploads for forum posts with preview and validation
 */

import { useState, useRef } from 'react';
import { Upload, X, FileIcon, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  preview?: string;
}

interface FileUploadInputProps {
  onFilesUpload: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export function FileUploadInput({
  onFilesUpload,
  maxFiles = 5,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
}: FileUploadInputProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (uploadedFiles.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of files) {
      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        toast.error(`File type not supported: ${file.name}`);
        continue;
      }

      // Validate file size
      if (file.size > maxSize) {
        toast.error(`File too large: ${file.name} (max ${formatFileSize(maxSize)})`);
        continue;
      }

      // Create preview for images
      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);

      try {
        // Upload to S3 via API
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        
        newFiles.push({
          id: data.key || file.name,
          name: file.name,
          type: file.type,
          size: file.size,
          url: data.url,
          preview,
        });
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (newFiles.length > 0) {
      const updated = [...uploadedFiles, ...newFiles];
      setUploadedFiles(updated);
      onFilesUpload(updated);
      toast.success(`${newFiles.length} file(s) uploaded`);
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    const updated = uploadedFiles.filter(f => f.id !== id);
    setUploadedFiles(updated);
    onFilesUpload(updated);
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-[#7dd87d]/30 rounded-lg p-4 hover:border-[#7dd87d]/60 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          disabled={isUploading || uploadedFiles.length >= maxFiles}
          className="hidden"
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || uploadedFiles.length >= maxFiles}
          className="w-full flex flex-col items-center gap-2 py-6 text-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-6 h-6 text-[#7dd87d] animate-spin" />
              <span className="text-sm text-[#1a472a]/60">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-[#7dd87d]" />
              <div>
                <p className="text-sm font-medium text-[#1a472a]">
                  Click to upload or drag files
                </p>
                <p className="text-xs text-[#1a472a]/50 mt-1">
                  Images, PDFs, and documents up to {formatFileSize(maxSize)}
                </p>
              </div>
            </>
          )}
        </button>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#1a472a]">
            Attached Files ({uploadedFiles.length}/{maxFiles})
          </p>
          <div className="space-y-2">
            {uploadedFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-[#f8f5f0] rounded-lg border border-[#e8e4de]"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-[#7dd87d]/10 flex items-center justify-center text-[#7dd87d]">
                    {getFileIcon(file.type)}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a472a] truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-[#1a472a]/50">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="p-1 hover:bg-red-100 rounded transition-colors text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUploadInput;
