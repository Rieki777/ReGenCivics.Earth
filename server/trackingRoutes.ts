/**
 * Email Tracking Routes
 * Handles tracking pixel (open) and click tracking endpoints
 */

import { Express, Request, Response } from "express";
import { recordEmailOpen, recordEmailClick } from "./emailTracking";

/**
 * Register tracking routes with Express app
 * @param app - Express application instance
 */
export function registerTrackingRoutes(app: Express): void {
  /**
   * Tracking pixel endpoint for email opens
   * Returns a 1x1 transparent GIF
   */
  app.get("/api/track/open/:emailLogId", async (req: Request, res: Response) => {
    try {
      const emailLogId = parseInt(req.params.emailLogId, 10);
      
      if (isNaN(emailLogId)) {
        return res.status(400).send("Invalid email log ID");
      }
      
      // Record the open event asynchronously
      recordEmailOpen(emailLogId).catch((error) => {
        console.error("Failed to record email open:", error);
      });
      
      // Return a 1x1 transparent GIF immediately
      const transparentGif = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      
      res.setHeader("Content-Type", "image/gif");
      res.setHeader("Content-Length", transparentGif.length.toString());
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.setHeader("Pragma", "no-cache");
      res.status(200).send(transparentGif);
    } catch (error) {
      console.error("Error in tracking pixel endpoint:", error);
      // Still return the pixel even if tracking fails
      const transparentGif = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      res.setHeader("Content-Type", "image/gif");
      res.status(200).send(transparentGif);
    }
  });
  
  /**
   * Click tracking endpoint
   * Records the click and redirects to the original URL
   */
  app.get("/api/track/click/:emailLogId", async (req: Request, res: Response) => {
    try {
      const emailLogId = parseInt(req.params.emailLogId, 10);
      const targetUrl = req.query.url as string;
      
      if (isNaN(emailLogId)) {
        return res.status(400).send("Invalid email log ID");
      }
      
      if (!targetUrl) {
        return res.status(400).send("Missing target URL");
      }
      
      // Record the click event asynchronously
      recordEmailClick(emailLogId).catch((error) => {
        console.error("Failed to record email click:", error);
      });
      
      // Redirect to the original URL immediately
      res.redirect(302, targetUrl);
    } catch (error) {
      console.error("Error in click tracking endpoint:", error);
      // Try to redirect anyway if we have the URL
      const targetUrl = req.query.url as string;
      if (targetUrl) {
        res.redirect(302, targetUrl);
      } else {
        res.status(500).send("Tracking error");
      }
    }
  });
}
