/**
 * CampaignStep5 - Financial Target
 * Wrapper for the FinancialTargetSection in CreateCampaign.tsx.
 */
import React from "react";

interface CampaignStep5Props {
  FinancialTargetSectionComp: React.ComponentType<any>;
  financialTarget: number;
  setFinancialTarget: (v: number) => void;
  financialNotes: string;
  setFinancialNotes: (v: string) => void;
  durationDays: number;
  setDurationDays: (v: number) => void;
  grandTotal: number;
  recommendedFinancial: number;
  currency: string;
  currencySymbol: string;
}

export function CampaignStep5({
  FinancialTargetSectionComp,
  financialTarget,
  setFinancialTarget,
  financialNotes,
  setFinancialNotes,
  durationDays,
  setDurationDays,
  grandTotal,
  recommendedFinancial,
  currency,
  currencySymbol,
}: CampaignStep5Props) {
  return (
    <FinancialTargetSectionComp
      financialTarget={financialTarget}
      setFinancialTarget={setFinancialTarget}
      financialNotes={financialNotes}
      setFinancialNotes={setFinancialNotes}
      durationDays={durationDays}
      setDurationDays={setDurationDays}
      grandTotal={grandTotal}
      recommendedFinancial={recommendedFinancial}
      currency={currency}
      currencySymbol={currencySymbol}
    />
  );
}
