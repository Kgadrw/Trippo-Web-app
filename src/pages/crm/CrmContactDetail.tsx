import { useParams } from "react-router-dom";
import { CrmContactDetailTab } from "@/components/crm/CrmContactDetailTab";

export default function CrmContactDetail() {
  const { clientId = "" } = useParams<{ clientId: string }>();
  return <CrmContactDetailTab clientId={clientId} />;
}
