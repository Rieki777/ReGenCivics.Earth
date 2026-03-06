# Blockchain Integrations

This file tracks all blockchain data connections needed for the ReGen Civics site.

---

## Issue #5 — Live $RCivics Token Supply Tracker (PENDING)

**Page:** `/tokenomics`

**Widget requirements:**
- Total supply
- Circulating supply
- Number of holders
- Refresh: on page load + every 5 minutes
- Warning banner: "Token distributions have not begun yet — total supply is currently 0."
- Fallback: last-known values + timestamp + "Data may be delayed"

**Blockchain:** EOSIO (Hypha DAO)

**Token:** $RCivics

**Action items:**
- [ ] Locate $RCivics contract address on Hypha DAO (ask Rieki or check app.hypha.earth/en/dho/regen-civics)
- [ ] Find the correct Hypha DAO API endpoint or EOSIO blockchain explorer API (e.g. Dfuse, Hyperion, or EOS Authority)
- [ ] Confirm whether the token is minted yet or still pre-launch (display warning banner until minting begins)
- [ ] Implement `LiveTokenStats` widget in `client/src/components/LiveStats.tsx` or a new component
- [ ] Add widget to `client/src/pages/Tokenomics.tsx` near the top of the page

**Hypha DAO API reference:**
- Base: `https://api.hypha.earth` (to be confirmed)
- Token contract: TBD

---

## Future Integrations (Placeholder)

| Feature | Chain | Status |
|---|---|---|
| $RCivics supply tracker | EOSIO / Hypha | Pending contract address |
| rSeeds stablecoin data | EOSIO | Future (Year 10+) |
| Base network $RCivics listing | Base (EVM) | Future (Year 7-10) |
| Regenerative lending protocol | TBD | Future |
