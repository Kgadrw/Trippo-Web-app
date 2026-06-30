import { useParams } from "react-router-dom";
import { ProjectDetailTab } from "@/components/projects/ProjectDetailTab";

export default function ProjectDetail() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  return <ProjectDetailTab projectId={projectId} />;
}
