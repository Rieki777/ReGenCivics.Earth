/**
 * Project matches: every land project with a funding profile, and how many
 * grant programs it matches, is one step from, is pursuing and has won
 * (funding engine Phase 5; server/funding/projectFunding.ts).
 *
 * Counts only. The profiles belong to the projects: stewards fill and change
 * them on each project page, and the eligibility flags are never shown here.
 */
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { TaoSpinner } from "@/components/TaoSpinner";
import { projectPathForApplication } from "@shared/projectKey";

export function ProjectMatchesPanel() {
  const { data, isLoading } = trpc.projectFunding.overview.useQuery();
  if (isLoading) return <TaoSpinner size={48} />;
  const projects = data?.projects ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#1a472a]/85 max-w-3xl">
        Grant programs land projects can apply to, matched to each project's funding profile by who can apply, where the
        land is, and what each program asks for. {data?.programs ?? 0} programs are loaded, {data?.openPrograms ?? 0} of
        them taking applications. Stewards fill the profile on their project page; each project decides what to pursue
        and applies itself.
      </p>
      {projects.length === 0 ? (
        <Card className="p-4 bg-white border-[#1a472a]/15 text-sm text-[#1a472a]/85">
          No project has a funding profile yet. Stewards find it under "Grants this project can apply to" on their project
          page. {data?.programs ? "" : "Load the programs first with npx tsx scripts/seed-grant-programs.ts --write."}
        </Card>
      ) : (
        <Card className="bg-white border-[#1a472a]/15 overflow-x-auto">
          <table className="w-full text-sm text-[#1a472a]">
            <thead>
              <tr className="text-left border-b border-[#1a472a]/15">
                <th className="p-2 pl-3">Project</th>
                <th className="p-2">Can apply</th>
                <th className="p-2">One step away</th>
                <th className="p-2">Working on</th>
                <th className="p-2 pr-3">Awarded</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.applicationId} className="border-t border-[#1a472a]/10">
                  <td className="p-2 pl-3">
                    <a href={`${projectPathForApplication(p.applicationId, p.projectName)}#grants`} className="font-semibold underline">
                      {p.projectName}
                    </a>
                  </td>
                  <td className="p-2">{p.matches}</td>
                  <td className="p-2">{p.nearMisses}</td>
                  <td className="p-2">{p.pursuing}</td>
                  <td className="p-2 pr-3">{p.awarded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
