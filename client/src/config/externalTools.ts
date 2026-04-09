/**
 * External tools the ReGen Civics community actively uses or watches.
 * Surfaced as a "Tools we use" strip on /tools and (later) in the mobile More menu.
 *
 * To add a tool: drop a logo into client/public/images/tools/{slug}.webp
 * (placeholder accepted), then add an entry here.
 */
export type ExternalTool = {
  slug: string;
  name: string;
  url: string;
  tagline: string;
  description: string;
  logo: string;
};

export const EXTERNAL_TOOLS: ExternalTool[] = [
  {
    slug: "hypha",
    name: "Hypha",
    url: "https://app.hypha.earth/",
    tagline: "Governance and DAO tooling",
    description:
      "Where ReGen Civics proposals and votes live. We use Hypha for the Fund governance and for ratifying game variable changes.",
    logo: "/images/tools/hypha.webp",
  },
  {
    slug: "localscale",
    name: "LocalScale",
    url: "https://localscale.org/",
    tagline: "Bioregional coordination",
    description:
      "Maps and activates bioregional cohorts. We're watching LocalScale closely as a potential partner for the Land Projects network.",
    logo: "/images/tools/localscale.webp",
  },
  {
    slug: "gitcoin",
    name: "Gitcoin",
    url: "https://gitcoin.co/",
    tagline: "Public goods funding",
    description:
      "Quadratic-funding rounds for open public goods. We run and support rounds relevant to regenerative projects.",
    logo: "/images/tools/gitcoin.webp",
  },
  {
    slug: "hylo",
    name: "Hylo",
    url: "https://www.hylo.com/",
    tagline: "Community coordination",
    description:
      "Group hosting for regen communities. Several land projects run their internal coordination on Hylo and we link out for that.",
    logo: "/images/tools/hylo.webp",
  },
];
