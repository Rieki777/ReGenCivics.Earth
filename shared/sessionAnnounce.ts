  const title =
    (typeof input.title === "string" ? input.title.trim() : "") || "ReGen Civics session";

  let publicUrl = typeof input.publicUrl === "string" ? input.publicUrl.trim() : "";
  if (!publicUrl) {
    publicUrl =
      input.eventId != null && Number.isFinite(input.eventId)
        ? sessionPublicUrl(Number(input.eventId))
        : `${SITE_ORIGIN}/schedule`;
  }

  const when = formatSessionWhen(input.startTime, input.timeZone);
  const lines = [
    `Join us: ${title}`,
    when ? `When: ${when}` : null,
    publicUrl,
    "",
    "See you in the circle — ReGen Civics / SEEDS",
  ].filter((line): line is string => line != null);

  return {
    body: lines.join("\n"),
    hyloUrl: HYLO_SEEDS_URL,
    holosUrl: HOLOS_REGEN_CIVICS_URL,
    publicUrl,
  };
}
