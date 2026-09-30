      if (report.ok) {
        try {
          const { setSiteSetting } = await import("../db");
          const { DAILY_SNAPSHOT_CRON_LAST_OK_KEY } = await import(
            "../../shared/dailyContributionSnapshotCronHealth"
          );
          await setSiteSetting(DAILY_SNAPSHOT_CRON_LAST_OK_KEY, new Date().toISOString());
        } catch (stampErr) {
          log.error("daily-contribution-snapshots last_ok stamp failed", stampErr);
        }
      }
      const status = report.ok ? 200 : 500;
      return res.status(status).json({ ok: report.ok, ...report });
    } catch (err: any) {
      log.error("cron daily-contribution-snapshots failed", err);
      return res.status(500).json({ error: err.message });
    }
  });
