import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronRight,
  Clock3,
  Info,
  Pencil,
  Timer,
  UserRound,
  Users,
} from "lucide-react";
import { workspaceApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { UserProfileAvatar } from "@/components/profile/UserProfileAvatar";
import { WorkspaceProfileAvatar } from "@/components/workspace/WorkspaceProfileAvatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  DISAPPEARING_OPTIONS,
  formatDisappearingLabel,
  type DisappearingDurationSec,
} from "@/lib/disappearingMessages";

export type ChatInfoPeer = {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  profilePictureUrl?: string | null;
  nickname?: string | null;
  lastSeenAt?: string | null;
};

export type ChatInfoCommonWorkspace = {
  workspaceId: string;
  name: string;
  profilePictureUrl?: string | null;
};

type DirectProps = {
  mode: "direct";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  conversationId: string;
  peer: ChatInfoPeer;
  disappearingDurationSec: number;
  onDisappearingChange: (durationSec: number) => void;
  onNicknameChange: (nickname: string | null) => void;
};

type GroupProps = {
  mode: "group";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
  workspaceProfilePictureUrl?: string | null;
};

type ChatInfoSheetProps = DirectProps | GroupProps;

function InfoRow({
  icon,
  title,
  subtitle,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
        onClick && !disabled && "hover:bg-sky-50 active:bg-sky-50",
        disabled && "opacity-60",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-gray-900">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-gray-500">{subtitle}</span>
        ) : null}
      </span>
      {onClick ? <ChevronRight size={18} className="shrink-0 text-gray-400" /> : null}
    </Comp>
  );
}

export function ChatInfoSheet(props: ChatInfoSheetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [panel, setPanel] = useState<"main" | "disappear" | "profile" | "groups">("main");
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [commonWorkspaces, setCommonWorkspaces] = useState<ChatInfoCommonWorkspace[]>([]);
  const [groupMembers, setGroupMembers] = useState<
    Array<{ userId: string; name: string; profilePictureUrl?: string | null }>
  >([]);
  const [peerDetails, setPeerDetails] = useState<ChatInfoPeer | null>(
    props.mode === "direct" ? props.peer : null,
  );

  useEffect(() => {
    if (!props.open) {
      setPanel("main");
      return;
    }
    if (props.mode === "direct") {
      setPeerDetails(props.peer);
      void workspaceApi
        .getDirectChatInfo(props.workspaceId, props.conversationId)
        .then((res) => {
          if (res.error || !res.data) return;
          const data = res.data as {
            otherUser?: ChatInfoPeer;
            commonWorkspaces?: ChatInfoCommonWorkspace[];
            disappearingDurationSec?: number;
          };
          if (data.otherUser) setPeerDetails({ ...props.peer, ...data.otherUser });
          setCommonWorkspaces(data.commonWorkspaces || []);
          if (typeof data.disappearingDurationSec === "number") {
            props.onDisappearingChange(data.disappearingDurationSec);
          }
        })
        .catch(() => undefined);
    } else {
      void workspaceApi
        .getGroupChatSettings(props.workspaceId)
        .then((res) => {
          if (res.error || !res.data) return;
          const data = res.data as {
            members?: Array<{ userId: string; name: string; profilePictureUrl?: string | null }>;
          };
          setGroupMembers(data.members || []);
        })
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, props.mode, props.workspaceId]);

  const title =
    props.mode === "direct"
      ? peerDetails?.nickname || peerDetails?.name || props.peer.name
      : props.workspaceName;

  const saveDisappearing = async (durationSec: DisappearingDurationSec) => {
    if (props.mode !== "direct") return;
    setSaving(true);
    try {
      const res = await workspaceApi.updateDirectChatDisappearing(
        props.workspaceId,
        props.conversationId,
        durationSec,
      );
      if (res.error) throw new Error(res.error);
      props.onDisappearingChange(durationSec);
      setPanel("main");
      toast({
        title: t("chatDisappearUpdated"),
        description: formatDisappearingLabel(durationSec, t),
      });
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("chatDisappearUpdateFailed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveNickname = async () => {
    if (props.mode !== "direct") return;
    setSaving(true);
    try {
      const next = nicknameDraft.trim();
      const res = await workspaceApi.updateChatNickname(props.peer.userId, next);
      if (res.error) throw new Error(res.error);
      const nickname = next || null;
      props.onNicknameChange(nickname);
      setPeerDetails((prev) => (prev ? { ...prev, nickname } : prev));
      setNicknameOpen(false);
      toast({ title: t("chatNicknameUpdated") });
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("chatNicknameUpdateFailed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Sheet open={props.open} onOpenChange={props.onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-gray-100 px-4 pb-4 pt-6 text-left">
            <SheetTitle className="text-lg font-semibold text-gray-900">
              {panel === "disappear"
                ? t("chatDisappearingMessages")
                : panel === "profile"
                  ? t("chatViewContact")
                  : panel === "groups"
                    ? t("chatGroupsInCommon")
                    : t("chatInfo")}
            </SheetTitle>
          </SheetHeader>

          {panel === "main" ? (
            <div className="flex flex-col">
              <div className="flex flex-col items-center gap-2 border-b border-gray-100 px-4 py-6">
                {props.mode === "direct" ? (
                  <UserProfileAvatar
                    name={peerDetails?.name || props.peer.name}
                    profilePictureUrl={
                      peerDetails?.profilePictureUrl || props.peer.profilePictureUrl || undefined
                    }
                    className="h-24 w-24"
                    fallbackClassName="bg-sky-400 text-2xl font-bold text-white"
                  />
                ) : (
                  <WorkspaceProfileAvatar
                    name={props.workspaceName}
                    profilePictureUrl={props.workspaceProfilePictureUrl}
                    className="h-24 w-24"
                    fallbackClassName="bg-sky-400 text-2xl font-bold text-white"
                  />
                )}
                <p className="text-xl font-semibold text-gray-900">{title}</p>
                {props.mode === "direct" && peerDetails?.email ? (
                  <p className="text-sm text-gray-500">{peerDetails.email}</p>
                ) : null}
              </div>

              <div className="divide-y divide-gray-100 border-b border-gray-100">
                {props.mode === "direct" ? (
                  <>
                    <InfoRow
                      icon={<Timer size={18} />}
                      title={t("chatDisappearingMessages")}
                      subtitle={formatDisappearingLabel(props.disappearingDurationSec, t)}
                      onClick={() => setPanel("disappear")}
                    />
                    <InfoRow
                      icon={<Pencil size={18} />}
                      title={t("chatNickname")}
                      subtitle={
                        peerDetails?.nickname || props.peer.nickname || t("chatNicknameNone")
                      }
                      onClick={() => {
                        setNicknameDraft(peerDetails?.nickname || props.peer.nickname || "");
                        setNicknameOpen(true);
                      }}
                    />
                    <InfoRow
                      icon={<UserRound size={18} />}
                      title={t("chatViewContact")}
                      subtitle={t("chatViewContactHint")}
                      onClick={() => setPanel("profile")}
                    />
                    <InfoRow
                      icon={<Users size={18} />}
                      title={t("chatGroupsInCommon")}
                      subtitle={
                        commonWorkspaces.length
                          ? t("chatGroupsInCommonCount").replace(
                              "{count}",
                              String(commonWorkspaces.length),
                            )
                          : t("chatGroupsInCommonNone")
                      }
                      onClick={() => setPanel("groups")}
                    />
                  </>
                ) : (
                  <InfoRow
                    icon={<Users size={18} />}
                    title={t("chatGroupMembers")}
                    subtitle={t("chatGroupMembersCount").replace(
                      "{count}",
                      String(groupMembers.length),
                    )}
                  />
                )}
              </div>

              {props.mode === "group" && groupMembers.length ? (
                <div className="divide-y divide-gray-100">
                  {groupMembers.map((member) => (
                    <div key={member.userId} className="flex items-center gap-3 px-4 py-3">
                      <UserProfileAvatar
                        name={member.name}
                        profilePictureUrl={member.profilePictureUrl || undefined}
                        className="h-10 w-10"
                        fallbackClassName="bg-sky-100 text-xs font-semibold text-sky-700"
                      />
                      <p className="truncate text-sm font-medium text-gray-900">{member.name}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {panel === "disappear" && props.mode === "direct" ? (
            <div className="flex flex-col">
              <p className="px-4 py-3 text-sm text-gray-500">{t("chatDisappearHint")}</p>
              <div className="divide-y divide-gray-100">
                {DISAPPEARING_OPTIONS.map((option) => {
                  const selected = Number(props.disappearingDurationSec || 0) === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={saving}
                      onClick={() => void saveDisappearing(option.value)}
                      className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-sky-50"
                    >
                      <span className="text-[15px] text-gray-900">{t(option.labelKey)}</span>
                      {selected ? (
                        <span className="text-sm font-medium text-sky-600">✓</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="mx-4 mt-4 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setPanel("main")}
              >
                {t("back")}
              </button>
            </div>
          ) : null}

          {panel === "profile" && props.mode === "direct" && peerDetails ? (
            <div className="flex flex-col gap-4 px-4 py-5">
              <div className="flex items-center gap-3">
                <UserProfileAvatar
                  name={peerDetails.name}
                  profilePictureUrl={peerDetails.profilePictureUrl || undefined}
                  className="h-14 w-14"
                  fallbackClassName="bg-sky-400 text-lg font-bold text-white"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-gray-900">
                    {peerDetails.name}
                  </p>
                  {peerDetails.nickname ? (
                    <p className="text-sm text-gray-500">~ {peerDetails.nickname}</p>
                  ) : null}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                {peerDetails.email ? (
                  <p>
                    <span className="text-gray-500">{t("email")}: </span>
                    {peerDetails.email}
                  </p>
                ) : null}
                {peerDetails.phone ? (
                  <p className="mt-2">
                    <span className="text-gray-500">{t("phone")}: </span>
                    {peerDetails.phone}
                  </p>
                ) : null}
                {!peerDetails.email && !peerDetails.phone ? (
                  <p className="text-gray-500">{t("chatNoContactDetails")}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setPanel("main")}
              >
                {t("back")}
              </button>
            </div>
          ) : null}

          {panel === "groups" && props.mode === "direct" ? (
            <div className="flex flex-col">
              {commonWorkspaces.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-500">
                  {t("chatGroupsInCommonNone")}
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {commonWorkspaces.map((ws) => (
                    <div key={ws.workspaceId} className="flex items-center gap-3 px-4 py-3">
                      <WorkspaceProfileAvatar
                        name={ws.name}
                        profilePictureUrl={ws.profilePictureUrl}
                        className="h-10 w-10"
                        fallbackClassName="bg-sky-100 text-xs font-bold text-sky-700"
                      />
                      <p className="truncate text-sm font-medium text-gray-900">{ws.name}</p>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="mx-4 mt-4 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setPanel("main")}
              >
                {t("back")}
              </button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {props.mode === "direct" ? (
        <Dialog open={nicknameOpen} onOpenChange={setNicknameOpen}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>{t("chatNickname")}</DialogTitle>
            </DialogHeader>
            <input
              value={nicknameDraft}
              onChange={(event) => setNicknameDraft(event.target.value.slice(0, 40))}
              placeholder={t("chatNicknamePlaceholder")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none ring-sky-300 focus:ring-2"
              maxLength={40}
            />
            <DialogFooter className="gap-2 sm:gap-2">
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                onClick={() => setNicknameOpen(false)}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={saving}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
                onClick={() => void saveNickname()}
              >
                {t("save")}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

export function ChatInfoButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sky-600 transition-colors hover:bg-sky-50 active:bg-sky-50"
      aria-label={label}
      title={label}
    >
      <Info size={20} strokeWidth={2.25} />
    </button>
  );
}

export function DisappearingBanner({
  durationSec,
  label,
}: {
  durationSec: number;
  label: string;
}) {
  if (!durationSec) return null;
  return (
    <div className="mx-auto mb-3 flex max-w-md items-center justify-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700">
      <Clock3 size={12} />
      {label}
    </div>
  );
}
