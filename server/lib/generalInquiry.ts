/**
 * The Contact Us submit path, shared by generalInquiries.submit and the
 * season board's raise-a-hand sign-up. One rate limit, one insert, one
 * pair of notification hooks.
 */
import { z } from "zod";
import type { TrpcContext } from "../_core/context";
import { notifyOwner } from "../_core/notification";
import * as db from "../db";
import { getNotificationTypeForPath, notifyIfEnabled } from "../notify-with-prefs";
import { checkRateLimit } from "../rate-limit";

export const generalInquirySubmitInput = z.object({
  // Routing Path
  pathType: z.enum(["land_partner", "create_with_regens", "alliance", "finance", "live", "role", "something_else"]),

  // Contact Information (common to all paths)
  email: z.string().email(),
  fullName: z.string().optional(),

  // Path 1: Land Partner specific fields
  projectUrl: z.string().optional(),
  projectInspiration: z.string().optional(),
  projectProgress: z.string().optional(), // JSON array of checkboxes

  // Path 2: Create with ReGens specific fields
  allianceOrganizations: z.string().optional(), // JSON array of selected orgs
  otherOrganization: z.string().optional(),

  // Path 3: Alliance specific fields
  organizationUrl: z.string().optional(),
  organizationRole: z.string().optional(), // JSON array of role tags
  organizationScope: z.string().optional(), // "local" or "global"
  organizationLatitude: z.number().optional(),
  organizationLongitude: z.number().optional(),
  organizationCountry: z.string().optional(),
  partnershipDescription: z.string().optional(),

  // Path 5: Live specific fields
  landProjects: z.string().optional(), // JSON array of selected projects
  otherProject: z.string().optional(),

  // Path 6: Role specific fields
  roleArchetypes: z.string().optional(), // JSON array
  roleInterest: z.string().optional(),
  whyIdeal: z.string().optional(),
  seasonDeliverables: z.string().optional(),
  videoPitchUrl: z.string().optional(),
  cvWebsite: z.string().optional(),

  // Path 7: Something else specific fields
  uniqueContribution: z.string().optional(),

  // New enhanced fields
  capitalTypes: z.string().optional(), // JSON array of 9 forms of capital
  allianceSupportCategories: z.string().optional(), // JSON array of support categories
  otherAllianceSupport: z.string().optional(),
  allianceSupportDescription: z.string().optional(),
  valueContribution: z.string().optional(),
  whyIdealFit: z.string().optional(),
  organizationalCapital: z.string().optional(), // JSON array of org capital types

  // General fields
  additionalNotes: z.string().optional(),
  referralSource: z.string().optional(),
  newsletterOptIn: z.boolean().optional(),
});

export type GeneralInquirySubmitInput = z.infer<typeof generalInquirySubmitInput>;

const PATH_LABELS: Record<string, string> = {
  land_partner: "Land Partner Application",
  create_with_regens: "Create with ReGens",
  alliance: "Alliance Partnership",
  finance: "Finance the Renaissance",
  live: "Live at Land Project",
  role: "Role Application",
  something_else: "Other Inquiry",
};

/**
 * Rate-limit, store, and notify. Same result generalInquiries.submit has always returned.
 * `notify: false` skips the owner and applicant notices. Contact Us leaves it on.
 */
export async function submitGeneralInquiry(
  ctx: TrpcContext,
  input: GeneralInquirySubmitInput,
  opts?: { notify?: boolean },
) {
  await checkRateLimit(ctx, "general_inquiry");
  const inquiryId = await db.createGeneralInquiry({
    userId: ctx.user?.id || null,
    status: "new",
    pathType: input.pathType,
    email: input.email,
    fullName: input.fullName || null,
    projectUrl: input.projectUrl || null,
    projectInspiration: input.projectInspiration || null,
    projectProgress: input.projectProgress || null,
    allianceOrganizations: input.allianceOrganizations || null,
    otherOrganization: input.otherOrganization || null,
    organizationUrl: input.organizationUrl || null,
    organizationRole: input.organizationRole || null,
    organizationScope: input.organizationScope || null,
    organizationLatitude: input.organizationLatitude || null,
    organizationLongitude: input.organizationLongitude || null,
    organizationCountry: input.organizationCountry || null,
    partnershipDescription: input.partnershipDescription || null,
    landProjects: input.landProjects || null,
    otherProject: input.otherProject || null,
    roleArchetypes: input.roleArchetypes || null,
    roleInterest: input.roleInterest || null,
    whyIdeal: input.whyIdeal || null,
    seasonDeliverables: input.seasonDeliverables || null,
    videoPitchUrl: input.videoPitchUrl || null,
    cvWebsite: input.cvWebsite || null,
    uniqueContribution: input.uniqueContribution || null,
    capitalTypes: input.capitalTypes || null,
    allianceSupportCategories: input.allianceSupportCategories || null,
    otherAllianceSupport: input.otherAllianceSupport || null,
    allianceSupportDescription: input.allianceSupportDescription || null,
    valueContribution: input.valueContribution || null,
    whyIdealFit: input.whyIdealFit || null,
    organizationalCapital: input.organizationalCapital || null,
    additionalNotes: input.additionalNotes || null,
    referralSource: input.referralSource || null,
    newsletterOptIn: input.newsletterOptIn ? 1 : 0,
  });

  if (opts?.notify !== false) {
    // Notify owner of new inquiry
    try {
      const notifType = getNotificationTypeForPath(input.pathType);
      await notifyIfEnabled(notifType, {
        title: `New Inquiry: ${PATH_LABELS[input.pathType]}`,
        content: `A new inquiry has been submitted!\n\n**Path:** ${PATH_LABELS[input.pathType]}\n**Email:** ${input.email}\n**Name:** ${input.fullName || "Not provided"}\n\nReview it in the admin dashboard.`,
      });

      // Send confirmation notification (applicant copy) - always send
      await notifyOwner({
        title: `Inquiry Confirmation - ${PATH_LABELS[input.pathType]}`,
        content: `**CONFIRMATION COPY FOR APPLICANT**\n\nThank you for connecting with ReGen Civics!\n\n**Applicant Email:** ${input.email}\n**Name:** ${input.fullName || "Not provided"}\n**Inquiry Type:** ${PATH_LABELS[input.pathType]}\n\nWe will review your submission and get back to you soon.\n\n---\nPlease forward this confirmation to the applicant at ${input.email}`,
      });
    } catch (e) {
      console.warn("Failed to send notification:", e);
    }
  }

  return { id: inquiryId, success: true as const };
}
