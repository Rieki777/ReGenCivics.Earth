/**
 * CampaignStep3 - Roles
 * Wrapper for the RolesSection in CreateCampaign.tsx.
 */
import React from "react";

interface CampaignStep3Props {
  RolesSectionComp: React.ComponentType<any>;
  roles: any[];
  setRoles: (v: any[]) => void;
  currency: string;
  currencySymbol: string;
}

export function CampaignStep3({
  RolesSectionComp,
  roles,
  setRoles,
  currency,
  currencySymbol,
}: CampaignStep3Props) {
  return (
    <RolesSectionComp
      roles={roles}
      setRoles={setRoles}
      currency={currency}
      currencySymbol={currencySymbol}
    />
  );
}
