import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Handshake, Palette, HomeIcon, UserCheck } from "lucide-react";
import { RoleSubmissionsView } from "@/components/RoleSubmissionsView";

interface SimpleInquirySectionProps {
  pathType: string;
  inquiries: any[];
  InquirySectionComp: React.ComponentType<{ pathType: string; inquiries: any[] }>;
}

interface AdminPlayersTabComp {
  AdminPlayersTabComp: React.ComponentType;
}

interface Props {
  inquiries: any[] | undefined;
  InquirySectionComp: React.ComponentType<{ pathType: string; inquiries: any[] }>;
  AdminPlayersTabComp: React.ComponentType;
}

export function AdminAllianceTab({ inquiries, InquirySectionComp }: Omit<Props, 'AdminPlayersTabComp'>) {
  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Handshake className="w-5 h-5" />
          Alliance Partner Inquiries
        </CardTitle>
        <CardDescription>
          Organizations interested in joining the ReGen Civics Alliance
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <InquirySectionComp pathType="alliance" inquiries={inquiries || []} />
      </CardContent>
    </Card>
  );
}

export function AdminCreateTab({ inquiries, InquirySectionComp }: Omit<Props, 'AdminPlayersTabComp'>) {
  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Palette className="w-5 h-5" />
          Create with ReGens Inquiries
        </CardTitle>
        <CardDescription>
          People interested in collaborating on regenerative projects
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <InquirySectionComp pathType="create" inquiries={inquiries || []} />
      </CardContent>
    </Card>
  );
}

export function AdminLiveTab({ inquiries, InquirySectionComp }: Omit<Props, 'AdminPlayersTabComp'>) {
  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <HomeIcon className="w-5 h-5" />
          Live in a Land Project Inquiries
        </CardTitle>
        <CardDescription>
          People interested in living in regenerative communities
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <InquirySectionComp pathType="live" inquiries={inquiries || []} />
      </CardContent>
    </Card>
  );
}

export function AdminRoleTab() {
  return (
    <Card className="bg-white border-2 border-[#1a472a]/10">
      <CardHeader>
        <CardTitle className="text-[#1a472a] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <UserCheck className="w-5 h-5" />
          Role inquiries
        </CardTitle>
        <CardDescription>
          Enhanced view for exploring and managing role submissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RoleSubmissionsView />
      </CardContent>
    </Card>
  );
}

export function AdminRolesTab({ AdminPlayersTabComp }: { AdminPlayersTabComp: React.ComponentType }) {
  return <AdminPlayersTabComp />;
}
