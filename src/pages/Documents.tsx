import { DocumentsTab } from "@/components/documents/DocumentsTab";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Documents() {
  return (
    <AppLayout title="Documents">
      <DocumentsTab />
    </AppLayout>
  );
}
