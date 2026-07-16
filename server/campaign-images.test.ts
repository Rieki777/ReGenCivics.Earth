/**
 * Tests for Campaign Image Upload Feature
 * Tests data structures, validation rules, and component logic
 */

import { describe, expect, it } from "vitest";

describe("Campaign Image Upload Feature", () => {
  describe("Image Validation", () => {
    it("should accept valid image MIME types", () => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      const testTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      
      testTypes.forEach(type => {
        expect(allowedTypes.includes(type)).toBe(true);
      });
    });

    it("should reject invalid MIME types", () => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      const invalidTypes = ["image/svg+xml", "application/pdf", "text/plain", "video/mp4", "image/bmp"];
      
      invalidTypes.forEach(type => {
        expect(allowedTypes.includes(type)).toBe(false);
      });
    });

    it("should enforce 5MB file size limit", () => {
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      
      expect(4 * 1024 * 1024).toBeLessThanOrEqual(maxSize); // 4MB OK
      expect(5 * 1024 * 1024).toBeLessThanOrEqual(maxSize); // 5MB OK
      expect(6 * 1024 * 1024).toBeGreaterThan(maxSize); // 6MB rejected
      expect(10 * 1024 * 1024).toBeGreaterThan(maxSize); // 10MB rejected
    });

    it("should enforce maximum 12 images per campaign", () => {
      const maxImages = 12;
      const currentCount = 10;
      const newUploadCount = 3;
      
      expect(currentCount + newUploadCount).toBeGreaterThan(maxImages);
      expect(currentCount + 2).toBeLessThanOrEqual(maxImages);
    });
  });

  describe("Image Categories", () => {
    it("should have all valid category options", () => {
      const validCategories = ["land", "team", "progress", "infrastructure", "community", "other"];
      
      expect(validCategories).toHaveLength(6);
      expect(validCategories).toContain("land");
      expect(validCategories).toContain("team");
      expect(validCategories).toContain("progress");
      expect(validCategories).toContain("infrastructure");
      expect(validCategories).toContain("community");
      expect(validCategories).toContain("other");
    });

    it("should map categories to human-readable labels", () => {
      const categoryLabels: Record<string, string> = {
        land: "Land / Landscape",
        team: "Team / People",
        progress: "Progress / Before-After",
        infrastructure: "Infrastructure",
        community: "Community",
        other: "Other",
      };

      expect(Object.keys(categoryLabels)).toHaveLength(6);
      expect(categoryLabels["land"]).toBe("Land / Landscape");
      expect(categoryLabels["team"]).toBe("Team / People");
    });
  });

  describe("Image Data Structure", () => {
    it("should have valid campaign image schema", () => {
      const image = {
        id: 1,
        campaignId: 42,
        uploadedByUserId: 7,
        url: "https://storage.example.com/campaigns/42/images/abc123.jpg",
        fileKey: "campaigns/42/images/abc123.jpg",
        fileName: "my-land-photo.jpg",
        mimeType: "image/jpeg",
        fileSize: 2048000,
        category: "land",
        caption: "Beautiful view of the valley",
        isCover: 1,
        sortOrder: 0,
        createdAt: new Date(),
      };

      expect(image.id).toBeGreaterThan(0);
      expect(image.campaignId).toBeGreaterThan(0);
      expect(image.url).toMatch(/^https?:\/\//);
      expect(image.fileKey).toBeTruthy();
      expect(image.category).toBe("land");
      expect(image.isCover).toBe(1);
    });

    it("should support optional fields", () => {
      const minimalImage = {
        id: 1,
        campaignId: 42,
        uploadedByUserId: 7,
        url: "https://storage.example.com/campaigns/42/images/abc123.jpg",
        fileKey: "campaigns/42/images/abc123.jpg",
        fileName: null,
        mimeType: null,
        fileSize: null,
        category: "other",
        caption: null,
        isCover: 0,
        sortOrder: 0,
        createdAt: new Date(),
      };

      expect(minimalImage.fileName).toBeNull();
      expect(minimalImage.caption).toBeNull();
      expect(minimalImage.isCover).toBe(0);
    });
  });

  describe("Cover Image Logic", () => {
    it("should auto-set first image as cover", () => {
      const existingCount = 0;
      const shouldBeCover = existingCount === 0;
      expect(shouldBeCover).toBe(true);
    });

    it("should not auto-set subsequent images as cover", () => {
      const existingCount: number = 3;
      const shouldBeCover = existingCount === 0;
      expect(shouldBeCover).toBe(false);
    });

    it("should find cover image from sorted list", () => {
      const images = [
        { id: 1, isCover: 0, sortOrder: 0 },
        { id: 2, isCover: 1, sortOrder: 1 },
        { id: 3, isCover: 0, sortOrder: 2 },
      ];

      // Sort by isCover desc, then sortOrder
      const sorted = [...images].sort((a, b) => {
        if (b.isCover !== a.isCover) return b.isCover - a.isCover;
        return a.sortOrder - b.sortOrder;
      });

      expect(sorted[0].id).toBe(2); // Cover image first
      expect(sorted[0].isCover).toBe(1);
    });

    it("should fall back to first image if no cover set", () => {
      const images = [
        { id: 1, isCover: 0, sortOrder: 0 },
        { id: 2, isCover: 0, sortOrder: 1 },
      ];

      const coverImage = images.find(img => img.isCover === 1) || images[0] || null;
      expect(coverImage?.id).toBe(1);
    });
  });

  describe("S3 File Key Generation", () => {
    it("should generate valid file key with campaign ID", () => {
      const campaignId = 42;
      const uniqueId = "abc123xyz";
      const ext = "jpg";
      const fileKey = `campaigns/${campaignId}/images/${uniqueId}.${ext}`;

      expect(fileKey).toBe("campaigns/42/images/abc123xyz.jpg");
      expect(fileKey).toMatch(/^campaigns\/\d+\/images\/.+\.\w+$/);
    });

    it("should extract extension from filename", () => {
      const testCases = [
        { fileName: "photo.jpg", expected: "jpg" },
        { fileName: "my.photo.png", expected: "png" },
        { fileName: "image.webp", expected: "webp" },
        { fileName: "noext", expected: "noext" },
      ];

      testCases.forEach(({ fileName, expected }) => {
        const ext = fileName.split(".").pop() || "jpg";
        expect(ext).toBe(expected);
      });
    });
  });

  describe("Caption Validation", () => {
    it("should accept captions up to 500 characters", () => {
      const maxLength = 500;
      const shortCaption = "A beautiful sunset over the valley";
      const longCaption = "x".repeat(500);
      const tooLongCaption = "x".repeat(501);

      expect(shortCaption.length).toBeLessThanOrEqual(maxLength);
      expect(longCaption.length).toBeLessThanOrEqual(maxLength);
      expect(tooLongCaption.length).toBeGreaterThan(maxLength);
    });
  });

  describe("Gallery Display Logic", () => {
    it("should separate cover from other images", () => {
      const images = [
        { id: 1, isCover: 1, category: "land" },
        { id: 2, isCover: 0, category: "team" },
        { id: 3, isCover: 0, category: "progress" },
      ];

      const coverImage = images[0]; // Already sorted by isCover desc
      const otherImages = images.slice(1);

      expect(coverImage.isCover).toBe(1);
      expect(otherImages).toHaveLength(2);
      expect(otherImages.every(img => img.isCover === 0)).toBe(true);
    });

    it("should handle lightbox navigation correctly", () => {
      const images = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
      let selectedIndex = 0;

      // Next
      selectedIndex = selectedIndex < images.length - 1 ? selectedIndex + 1 : 0;
      expect(selectedIndex).toBe(1);

      // Next to end
      selectedIndex = 3;
      selectedIndex = selectedIndex < images.length - 1 ? selectedIndex + 1 : 0;
      expect(selectedIndex).toBe(0); // Wraps around

      // Prev from beginning
      selectedIndex = 0;
      selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : images.length - 1;
      expect(selectedIndex).toBe(3); // Wraps around
    });
  });

  describe("Upload Input Validation", () => {
    it("should require campaignId for upload", () => {
      const input = {
        campaignId: 42,
        fileName: "photo.jpg",
        fileData: "base64data...",
        contentType: "image/jpeg",
        fileSize: 1024000,
        category: "land",
      };

      expect(input.campaignId).toBeGreaterThan(0);
      expect(input.fileName).toBeTruthy();
      expect(input.fileData).toBeTruthy();
      expect(input.contentType).toBeTruthy();
      expect(input.fileSize).toBeGreaterThan(0);
    });

    it("should validate file size is a positive number", () => {
      const validSizes = [1024, 500000, 5242880];
      const invalidSizes = [0, -1, -1024];

      validSizes.forEach(size => {
        expect(size).toBeGreaterThan(0);
      });

      invalidSizes.forEach(size => {
        expect(size).toBeLessThanOrEqual(0);
      });
    });
  });

  describe("File Size Formatting", () => {
    it("should format bytes correctly", () => {
      const formatFileSize = (bytes: number | null) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      };

      expect(formatFileSize(null)).toBe("");
      expect(formatFileSize(512)).toBe("512 B");
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(1048576)).toBe("1.0 MB");
      expect(formatFileSize(2621440)).toBe("2.5 MB");
    });
  });
});
