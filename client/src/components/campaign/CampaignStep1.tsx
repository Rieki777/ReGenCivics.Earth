/**
 * CampaignStep1 - Land Requirements
 * Wrapper for the LandSection in CreateCampaign.tsx.
 * All state lives in CreateCampaign.tsx and is passed as props.
 */
import React from "react";

interface CampaignStep1Props {
  LandSectionComp: React.ComponentType<any>;
  landRequirements: any[];
  setLandRequirements: (v: any[]) => void;
  currency: string;
  currencySymbol: string;
}

export function CampaignStep1({
  LandSectionComp,
  landRequirements,
  setLandRequirements,
  currency,
  currencySymbol,
}: CampaignStep1Props) {
  return (
    <LandSectionComp
      landRequirements={landRequirements}
      setLandRequirements={setLandRequirements}
      currency={currency}
      currencySymbol={currencySymbol}
    />
  );
}
