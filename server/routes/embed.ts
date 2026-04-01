/**
 * Embeddable widget routes.
 * Lightweight HTML pages for external sites to embed via iframe.
 * No React, no heavy JS. Just styled HTML with live data.
 */
import type { Express, Request, Response } from "express";
import { getDb } from "../db";
import { campaigns, applications, events } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

const BASE_URL = "https://regencivics.earth";

function widgetShell(title: string, body: string, accentColor = "#7dd87d"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - ReGen Civics</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#1a472a;color:#fff;padding:16px;min-height:100vh;display:flex;flex-direction:column}
a{color:${accentColor};text-decoration:none}
a:hover{text-decoration:underline}
.widget{flex:1;display:flex;flex-direction:column;gap:12px}
.footer{margin-top:auto;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,0.4)}
.footer svg{width:14px;height:14px;fill:${accentColor}}
.bar-bg{height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden}
.bar-fill{height:100%;border-radius:4px;transition:width 0.5s}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
</style>
</head>
<body>
<div class="widget">${body}</div>
<div class="footer">
<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
<a href="${BASE_URL}" target="_blank" rel="noopener">Powered by ReGen Civics</a>
</div>
</body>
</html>`;
}

function errorWidget(msg: string): string {
  return widgetShell("Error", `<p style="color:rgba(255,255,255,0.5);font-size:14px">${msg}</p>`);
}

export function registerEmbedRoutes(app: Express) {

  // Campaign progress widget
  app.get("/embed/campaign/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.send(errorWidget("Invalid campaign ID"));

    const database = await getDb();
    if (!database) return res.send(errorWidget("Service unavailable"));

    const [campaign] = await database.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!campaign) return res.send(errorWidget("Campaign not found"));

    const title = campaign.title || "Regenerative Land Project";
    const goal = Number(campaign.targetAmount) || 100000;
    const raised = Number(campaign.currentAmount) || 0;
    const pct = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;
    const funded = pct >= 100;
    const color = funded ? "#fbbf24" : "#7dd87d";

    const body = `
<div style="font-size:18px;font-weight:700;line-height:1.3">${title}</div>
${campaign.location ? `<div style="font-size:13px;color:rgba(255,255,255,0.5)">${campaign.location}</div>` : ""}
<div class="bar-bg"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
<div style="display:flex;justify-content:space-between;font-size:13px;color:rgba(255,255,255,0.6)">
<span>$${raised.toLocaleString()} of $${goal.toLocaleString()}</span>
<span class="badge" style="background:${color}20;color:${color}">${funded ? "Funded!" : pct + "% funded"}</span>
</div>
<a href="${BASE_URL}/crowd-pooling-projects" target="_blank" style="display:inline-block;padding:8px 20px;background:${color};color:#1a472a;border-radius:8px;font-weight:700;font-size:14px;text-align:center;text-decoration:none">
${funded ? "View Project" : "Support This Project"}
</a>`;

    res.set({ "Content-Type": "text/html", "Cache-Control": "public, max-age=3600" });
    res.send(widgetShell(title, body, color));
  });

  // Quest badge widget
  app.get("/embed/badge/quest/:questId", async (req: Request, res: Response) => {
    const questId = req.params.questId;
    const playerName = (req.query.player as string) || "A ReGen Player";
    const questName = (req.query.name as string) || `Quest ${questId}`;

    const body = `
<div style="text-align:center">
<div style="font-size:11px;color:#7dd87d;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Quest Complete</div>
<div style="font-size:22px;font-weight:700;margin-bottom:6px">${questName}</div>
<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-bottom:12px">Completed by ${playerName}</div>
<a href="${BASE_URL}/quest" target="_blank" style="display:inline-block;padding:8px 20px;background:#7dd87d;color:#1a472a;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none">
Start Your Own Quest
</a>
</div>`;

    res.set({ "Content-Type": "text/html", "Cache-Control": "public, max-age=604800" });
    res.send(widgetShell("Quest Badge", body));
  });

  // Alliance partner badge widget
  app.get("/embed/badge/alliance", async (req: Request, res: Response) => {
    const orgName = (req.query.org as string) || "Alliance Partner";

    const body = `
<div style="text-align:center">
<div style="width:48px;height:48px;margin:0 auto 12px;border-radius:50%;background:#7dd87d20;display:flex;align-items:center;justify-content:center">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7dd87d" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
</div>
<div style="font-size:11px;color:#7dd87d;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Alliance Partner</div>
<div style="font-size:18px;font-weight:700;margin-bottom:4px">${orgName}</div>
<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:12px">Building the Regenerative Renaissance together</div>
<a href="${BASE_URL}/ally" target="_blank" style="display:inline-block;padding:8px 20px;background:#7dd87d;color:#1a472a;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none">
Learn About the Alliance
</a>
</div>`;

    res.set({ "Content-Type": "text/html", "Cache-Control": "public, max-age=86400" });
    res.send(widgetShell("Alliance Partner", body));
  });

  // Season countdown widget
  app.get("/embed/season", async (_req: Request, res: Response) => {
    const seasonStart = new Date("2026-09-26T15:00:00Z");
    const now = new Date();
    const diff = seasonStart.getTime() - now.getTime();
    const started = diff <= 0;

    let countdown = "";
    if (started) {
      countdown = `<div class="badge" style="background:#7dd87d;color:#1a472a;font-size:14px;padding:6px 16px">Season 2 is Live</div>`;
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      countdown = `
<div style="display:flex;gap:12px;justify-content:center">
<div style="text-align:center"><div style="font-size:28px;font-weight:700;color:#7dd87d">${days}</div><div style="font-size:10px;color:rgba(255,255,255,0.4)">days</div></div>
<div style="text-align:center"><div style="font-size:28px;font-weight:700;color:#7dd87d">${hours}</div><div style="font-size:10px;color:rgba(255,255,255,0.4)">hours</div></div>
</div>`;
    }

    const body = `
<div style="text-align:center">
<div style="font-size:11px;color:#7dd87d;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">ReGen Civics</div>
<div style="font-size:18px;font-weight:700;margin-bottom:12px">Season 2 Incubator</div>
${countdown}
<div style="margin-top:12px">
<a href="${BASE_URL}/seasons" target="_blank" style="display:inline-block;padding:8px 20px;background:#7dd87d;color:#1a472a;border-radius:8px;font-weight:700;font-size:13px;text-decoration:none">
${started ? "Join Now" : "Learn More"}
</a>
</div>
</div>`;

    res.set({ "Content-Type": "text/html", "Cache-Control": "public, max-age=3600" });
    res.send(widgetShell("Season 2", body));
  });

  // Embed code generator page (for admin to copy embed codes)
  app.get("/embed", (_req: Request, res: Response) => {
    const body = `
<div style="max-width:600px;margin:0 auto">
<h1 style="font-size:24px;font-weight:700;margin-bottom:8px">Embeddable Widgets</h1>
<p style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:24px">Copy these embed codes to put ReGen Civics widgets on other websites.</p>

<h2 style="font-size:16px;font-weight:700;margin-bottom:8px;color:#7dd87d">Campaign Progress</h2>
<code style="display:block;background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;font-size:12px;margin-bottom:20px;word-break:break-all">&lt;iframe src="${BASE_URL}/embed/campaign/1" width="320" height="240" frameborder="0"&gt;&lt;/iframe&gt;</code>

<h2 style="font-size:16px;font-weight:700;margin-bottom:8px;color:#7dd87d">Quest Badge</h2>
<code style="display:block;background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;font-size:12px;margin-bottom:20px;word-break:break-all">&lt;iframe src="${BASE_URL}/embed/badge/quest/0?name=Fire&player=YourName" width="320" height="200" frameborder="0"&gt;&lt;/iframe&gt;</code>

<h2 style="font-size:16px;font-weight:700;margin-bottom:8px;color:#7dd87d">Alliance Badge</h2>
<code style="display:block;background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;font-size:12px;margin-bottom:20px;word-break:break-all">&lt;iframe src="${BASE_URL}/embed/badge/alliance?org=YourOrg" width="320" height="220" frameborder="0"&gt;&lt;/iframe&gt;</code>

<h2 style="font-size:16px;font-weight:700;margin-bottom:8px;color:#7dd87d">Season Countdown</h2>
<code style="display:block;background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;font-size:12px;margin-bottom:20px;word-break:break-all">&lt;iframe src="${BASE_URL}/embed/season" width="320" height="200" frameborder="0"&gt;&lt;/iframe&gt;</code>
</div>`;

    res.set({ "Content-Type": "text/html" });
    res.send(widgetShell("Embed Widgets", body));
  });
}
