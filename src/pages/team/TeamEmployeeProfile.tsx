import { useParams } from "react-router-dom";
import { TeamEmployeeProfileTab } from "@/components/team/TeamEmployeeProfileTab";

export default function TeamEmployeeProfile() {
  const { memberId = "" } = useParams<{ memberId: string }>();
  return <TeamEmployeeProfileTab memberId={memberId} />;
}
