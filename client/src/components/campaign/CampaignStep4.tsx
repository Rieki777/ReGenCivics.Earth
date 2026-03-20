/**
 * CampaignStep4 - Other Needs
 * Wrapper for the OtherNeedsSection in CreateCampaign.tsx.
 */
import React from "react";

interface CampaignStep4Props {
  OtherNeedsSectionComp: React.ComponentType<any>;
  otherNeeds: any[];
  setOtherNeeds: (v: any[]) => void;
  currency: string;
  currencySymbol: string;
}

export function CampaignStep4({
  OtherNeedsSectionComp,
  otherNeeds,
  setOtherNeeds,
  currency,
  currencySymbol,
}: CampaignStep4Props) {
  return (
    <OtherNeedsSectionComp
      otherNeeds={otherNeeds}
      setOtherNeeds={setOtherNeeds}
      currency={currency}
      currencySymbol={currencySymbol}
    />
  );
}
