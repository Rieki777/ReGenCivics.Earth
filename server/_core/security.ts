/**
 * Security Middleware & Utilities
 * Handles CSP, CSRF protection, rate limiting, and input sanitization
 */

import { Request, Response, NextFunction } from 'express';

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Content Security Policy Middleware
 * Prevents XSS attacks by restricting resource loading
 */
export function cspMiddleware(_req: Request, res: Response, next: NextFunction) {
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://translate.google.com https://translate.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https: wss:",
    "frame-src 'self' https://calendly.com https://www.youtube.com https://youtu.be",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests"
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspHeader);
  next();
}

/**
 * Additional Security Headers Middleware
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  
  // HSTS for HTTPS enforcement
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  next();
}

/**
 * Rate Limiting Middleware
 * Prevents abuse of public endpoints
 */
export function rateLimitMiddleware(
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (record && now < record.resetTime) {
      if (record.count >= maxRequests) {
        res.status(429).json({ error: 'Too many requests, please try again later' });
        return;
      }
      record.count++;
    } else {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    }
    
    next();
  };
}

/**
 * CSRF Token Generation & Validation
 */
const csrfTokens = new Map<string, { token: string; createdAt: number }>();

export function generateCSRFToken(sessionId: string): string {
  const token = require('crypto').randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, { token, createdAt: Date.now() });
  return token;
}

export function validateCSRFToken(sessionId: string, token: string): boolean {
  const record = csrfTokens.get(sessionId);
  
  if (!record) return false;
  
  // Token expires after 1 hour
  if (Date.now() - record.createdAt > 60 * 60 * 1000) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  return record.token === token;
}

/**
 * Input Sanitization
 * Removes potentially harmful HTML/JavaScript from user input
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove script tags and event handlers
  let sanitized = input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '');
  
  // Escape HTML entities for safety
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return sanitized.replace(/[&<>"']/g, char => htmlEscapes[char] || char);
}

/**
 * Sanitize Object
 * Recursively sanitizes all string values in an object
 */
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeInput(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  
  return sanitized;
}

/**
 * Validate Email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate File Upload
 */
export function validateFileUpload(
  fileName: string,
  fileSize: number,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf'],
  maxSize: number = 10 * 1024 * 1024 // 10MB
): { valid: boolean; error?: string } {
  // Check file size
  if (fileSize > maxSize) {
    return { valid: false, error: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB` };
  }
  
  // Check file extension (basic check)
  const extension = fileName.split('.').pop()?.toLowerCase();
  const validExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx'];
  
  if (!extension || !validExtensions.includes(extension)) {
    return { valid: false, error: 'File type not allowed' };
  }
  
  return { valid: true };
}

/**
 * Prevent Path Traversal
 */
export function sanitizePath(path: string): string {
  // Remove any path traversal attempts
  return path.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
}
