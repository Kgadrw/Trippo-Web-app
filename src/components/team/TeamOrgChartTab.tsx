import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { teamMemberApi, type TeamMemberRecord } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceCategories } from "@/hooks/useWorkspaceCategories";
import { formatCategoryLabel } from "@/lib/workspaceCategories";
import { buildOrgChartTree, type OrgChartNode } from "@/lib/hrProfile";
import { Loader2 } from "lucide-react";
import { HelpTip } from "@/components/ui/help-tip";

function OrgChartBranch({ node, depth = 0 }: { node: OrgChartNode; depth?: number }) {
  const { t } = useTranslation();
  const { categories: departmentCategories } = useWorkspaceCategories("department");
  const deptLabel = formatCategoryLabel(
    node.member.department || "general",
    departmentCategories,
    t,
    "department",
  );

  return (
    <li className="relative">
      <div
        className="inline-block min-w-[180px] max-w-[240px] border border-gray-200 bg-white p-3 shadow-sm"
        style={{ marginLeft: depth * 24 }}
      >
        <Link
          to={`/hr/people/${node.member._id}`}
          className="text-sm font-semibold text-sky-700 hover:underline"
        >
          {node.member.name}
        </Link>
        <p className="mt-1 text-xs text-gray-600">{node.member.jobTitle || deptLabel}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">{deptLabel}</p>
      </div>
      {node.children.length > 0 ? (
        <ul className="mt-3 space-y-3 border-l border-gray-200 pl-4">
          {node.children.map((child) => (
            <OrgChartBranch key={child.member._id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function TeamOrgChartTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teamMemberApi.getAll({ status: "active" });
      setMembers((res.data as TeamMemberRecord[]) || []);
    } catch {
      toast({ title: t("teamLoadFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const tree = useMemo(() => buildOrgChartTree(members), [members]);

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <div className="flex items-center gap-1.5">
          <h2 className="text-lg font-semibold text-gray-900">{t("hrOrgChartTitle")}</h2>
          <HelpTip text={t("helpHrOrgChart")} />
        </div>
        <p className="text-sm text-gray-600">{t("hrOrgChartSubtitle")}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t("loading")}
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-500">{t("teamNoMembers")}</p>
      ) : tree.length === 0 ? (
        <p className="text-sm text-gray-500">{t("hrOrgChartEmpty")}</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 bg-gray-50/60 p-4">
          <ul className="space-y-4">
            {tree.map((node) => (
              <OrgChartBranch key={node.member._id} node={node} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
