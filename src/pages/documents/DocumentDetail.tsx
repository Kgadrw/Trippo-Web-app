import { useParams } from "react-router-dom";
import { DocumentDetailTab } from "@/components/documents/DocumentDetailTab";

export default function DocumentDetail() {
  const { documentId = "" } = useParams<{ documentId: string }>();
  return <DocumentDetailTab documentId={documentId} />;
}
