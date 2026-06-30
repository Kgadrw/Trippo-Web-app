import { useParams } from "react-router-dom";
import { AssetDetailTab } from "@/components/assets/AssetDetailTab";

export default function AssetDetail() {
  const { assetId = "" } = useParams<{ assetId: string }>();
  return <AssetDetailTab assetId={assetId} />;
}
