/**
 * CampaignStep2 - Equipment
 * Wrapper for the EquipmentSection in CreateCampaign.tsx.
 */
import React from "react";

interface CampaignStep2Props {
  EquipmentSectionComp: React.ComponentType<any>;
  equipment: any[];
  setEquipment: (v: any[]) => void;
  currency: string;
  currencySymbol: string;
}

export function CampaignStep2({
  EquipmentSectionComp,
  equipment,
  setEquipment,
  currency,
  currencySymbol,
}: CampaignStep2Props) {
  return (
    <EquipmentSectionComp
      equipment={equipment}
      setEquipment={setEquipment}
      currency={currency}
      currencySymbol={currencySymbol}
    />
  );
}
