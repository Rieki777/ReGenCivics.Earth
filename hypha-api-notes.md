# Hypha API Research Notes

## Available Endpoints

### Public Endpoint (No Auth Required)
- `https://app.hypha.earth/api/v1/spaces/regen-civics` - Returns space info, subspaces, members, documents

### Protected Endpoints (Auth Required)
- `https://app.hypha.earth/api/v1/spaces/regen-civics/assets` - Treasury assets
- `https://app.hypha.earth/api/v1/spaces/regen-civics/transfers` - Treasury transfers

## Public Data Available
- Space ID: 377
- Title: ReGen Civics
- Description: "ReGen Civics strengthens a global network of regenerative projects by creating a shared capital pool. We co-invest in land projects, food systems, villages, and supporting organizations. The fund is governed by the projects where every project becomes co-invested."
- Address: 0x61203bC03b70A6A985a15DE92E1cd381CEA268ac
- Categories: networks, villages, land, knowledge, housing, governance, bioregions, biodiversity, finance
- Created: 2025-11-29

## Subspace: ReGen Games
- ID: 378
- Description: "An Infinite Game where our goal is to heal ourselves by coordinating systemic regeneration through play."
- Address: 0x3aeC296CC5D99f05f083eE2639725e9E06348554

## Approach for Dashboard
Since treasury data requires authentication, we'll:
1. Create a dashboard with sample/placeholder data that represents the structure
2. Embed the Hypha treasury page via iframe for live data
3. Add a link to the full Hypha treasury page
4. Show the wallet address so users can verify on-chain
