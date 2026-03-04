/**
 * Banner Database Helpers
 * Provides functions for managing site banners
 */

import { getDb } from './db';
import { siteBanners, InsertSiteBanner, SiteBanner } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Get banner by key
 */
export async function getBannerByKey(key: string): Promise<SiteBanner | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const banner = await db
      .select()
      .from(siteBanners)
      .where(eq(siteBanners.key, key))
      .limit(1);

    return banner[0] || null;
  } catch (error) {
    console.error('[Banner] Error fetching banner:', error);
    return null;
  }
}

/**
 * Get all active banners
 */
export async function getActiveBanners(): Promise<SiteBanner[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const now = new Date();
    const banners = await db
      .select()
      .from(siteBanners)
      .where(
        (col) => {
          const conditions = [eq(col.isActive, true)];
          // Add date range checks if needed
          return conditions[0];
        }
      );

    return banners.filter((banner) => {
      if (banner.displayStartDate && new Date(banner.displayStartDate) > now) {
        return false;
      }
      if (banner.displayEndDate && new Date(banner.displayEndDate) < now) {
        return false;
      }
      return true;
    });
  } catch (error) {
    console.error('[Banner] Error fetching active banners:', error);
    return [];
  }
}

/**
 * Create or update banner
 */
export async function upsertBanner(data: InsertSiteBanner): Promise<SiteBanner | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if banner exists
    const existing = await getBannerByKey(data.key || '');

    if (existing) {
      // Update existing banner
      const updated = await db
        .update(siteBanners)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(siteBanners.key, existing.key));

      return getBannerByKey(existing.key);
    } else {
      // Create new banner
      await db.insert(siteBanners).values(data);
      return getBannerByKey(data.key || '');
    }
  } catch (error) {
    console.error('[Banner] Error upserting banner:', error);
    return null;
  }
}

/**
 * Delete banner
 */
export async function deleteBanner(key: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(siteBanners).where(eq(siteBanners.key, key));
    return true;
  } catch (error) {
    console.error('[Banner] Error deleting banner:', error);
    return false;
  }
}

/**
 * Toggle banner active status
 */
export async function toggleBannerActive(key: string): Promise<SiteBanner | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const banner = await getBannerByKey(key);
    if (!banner) return null;

    const updated = await db
      .update(siteBanners)
      .set({
        isActive: !banner.isActive,
        updatedAt: new Date(),
      })
      .where(eq(siteBanners.key, key));

    return getBannerByKey(key);
  } catch (error) {
    console.error('[Banner] Error toggling banner:', error);
    return null;
  }
}
