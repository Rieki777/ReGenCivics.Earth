import { useEffect } from "react";
import { useLocation } from "wouter";

interface InvestorPacketFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InvestorPacketForm({ isOpen, onClose }: InvestorPacketFormProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isOpen) {
      // Redirect to the investment form page which hosts the Tripetto form
      setLocation('/investmentform');
      onClose();
    }
  }, [isOpen, setLocation, onClose]);

  // This component now just handles the redirect
  // The /investmentform page will show the Tripetto form which captures info and redirects to /opportunity
  return null;
}
