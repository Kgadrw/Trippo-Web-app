import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { PUBLIC_API_BASE_URL } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, ExternalLink } from "lucide-react";

type VerifyResult = {
  valid: boolean;
  ticketId: string;
  serviceName?: string;
  barberName?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  recordedAt?: string;
  businessName?: string;
};

function useQueryParam(name: string) {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search).get(name) || "", [search, name]);
}

function formatMoney(amount?: number, currency?: string) {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return "-";
  const c = currency || "RWF";
  return `${Number(amount).toLocaleString()} ${c}`;
}

export default function VerifyTicket() {
  const ticketFromUrl = useQueryParam("ticket");
  const [ticket, setTicket] = useState(ticketFromUrl);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const isLoggedIn = useMemo(() => {
    return localStorage.getItem("profit-pilot-user-id") && localStorage.getItem("profit-pilot-authenticated") === "true";
  }, []);

  const verify = async (ticketId: string) => {
    const trimmed = (ticketId || "").trim();
    if (!trimmed) return;

    setStatus("loading");
    setErrorMsg("");
    setResult(null);

    // Public verification endpoint (preferred)
    try {
      const url = `${PUBLIC_API_BASE_URL}/auth/verify-ticket?ticket=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && (json?.valid === true || json?.valid === false)) {
        setResult({
          valid: Boolean(json.valid),
          ticketId: trimmed,
          serviceName: json.serviceName,
          barberName: json.barberName,
          amount: json.amount,
          currency: json.currency || "RWF",
          paymentMethod: json.paymentMethod,
          recordedAt: json.recordedAt,
          businessName: json.businessName,
        });
        setStatus("success");
        return;
      }
      // If backend doesn't support this endpoint, fall through.
      throw new Error(json?.error || json?.message || "Verification endpoint not available.");
    } catch (e: any) {
      // Fallback: if user is logged in, try pulling by id from sales endpoint.
      if (isLoggedIn) {
        try {
          const userId = localStorage.getItem("profit-pilot-user-id") || "";
          const url = `${PUBLIC_API_BASE_URL}/sales/${encodeURIComponent(trimmed)}`;
          const res = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-User-Id": userId,
            },
          });
          const json = await res.json().catch(() => ({}));
          const sale = json?.data || json?.sale || json;
          if (res.ok && sale) {
            setResult({
              valid: true,
              ticketId: trimmed,
              serviceName: sale.serviceName || sale.product,
              barberName: sale.workerName,
              amount: sale.revenue,
              currency: "RWF",
              paymentMethod: sale.paymentMethod,
              recordedAt: sale.timestamp || sale.date,
              businessName: localStorage.getItem("profit-pilot-business-name") || undefined,
            });
            setStatus("success");
            return;
          }
          throw new Error(json?.error || json?.message || "Ticket not found.");
        } catch (inner: any) {
          setStatus("error");
          setErrorMsg(inner?.message || "Unable to verify this ticket.");
          return;
        }
      }

      setStatus("error");
      setErrorMsg(e?.message || "Unable to verify this ticket.");
    }
  };

  useEffect(() => {
    if (ticketFromUrl) {
      void verify(ticketFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketFromUrl]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <Badge variant="secondary" className="text-xs">
            Trippo Ticket Verification
          </Badge>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl">Verify receipt</CardTitle>
            <p className="text-sm text-slate-600">
              Scan the QR code or paste the ticket ID to confirm whether a receipt is valid.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  placeholder="Ticket ID (e.g. 67f1b...)"
                  className="bg-white"
                />
                <Button
                  type="button"
                  onClick={() => void verify(ticket)}
                  disabled={status === "loading" || !ticket.trim()}
                >
                  {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                If verification fails, make sure you opened the link from the same device and your internet is working.
              </p>
            </div>

            <Separator />

            {status === "idle" ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                Enter a ticket ID to begin verification.
              </div>
            ) : status === "loading" ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking ticket…
              </div>
            ) : status === "error" ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <div className="flex items-center gap-2 font-semibold">
                  <XCircle className="h-4 w-4" />
                  Unable to verify
                </div>
                <div className="mt-2 text-red-700">{errorMsg || "Verification service unavailable."}</div>
                {!isLoggedIn ? (
                  <div className="mt-3 text-xs text-red-700/90">
                    Tip: if you are the business owner, login to the dashboard and try again.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {result?.valid ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div className="font-semibold">
                      {result?.valid ? "VALID receipt" : "INVALID receipt"}
                    </div>
                  </div>
                  <Badge className={result?.valid ? "bg-emerald-600" : "bg-red-600"}>
                    {result?.valid ? "VALID" : "INVALID"}
                  </Badge>
                </div>

                <Separator />

                <div className="grid grid-cols-1 gap-3">
                  <div className="text-sm">
                    <div className="text-xs text-slate-500">Ticket ID</div>
                    <div className="font-mono text-slate-900 break-all">{result?.ticketId || "-"}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-sm">
                      <div className="text-xs text-slate-500">Service</div>
                      <div className="text-slate-900">{result?.serviceName || "-"}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-xs text-slate-500">Barber</div>
                      <div className="text-slate-900">{result?.barberName || "-"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-sm">
                      <div className="text-xs text-slate-500">Amount</div>
                      <div className="text-slate-900">{formatMoney(result?.amount, result?.currency)}</div>
                    </div>
                    <div className="text-sm">
                      <div className="text-xs text-slate-500">Payment</div>
                      <div className="text-slate-900">{result?.paymentMethod || "-"}</div>
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="text-xs text-slate-500">Recorded at</div>
                    <div className="text-slate-900">{result?.recordedAt ? new Date(result.recordedAt).toLocaleString() : "-"}</div>
                  </div>

                  {result?.businessName ? (
                    <div className="text-sm">
                      <div className="text-xs text-slate-500">Business</div>
                      <div className="text-slate-900">{result.businessName}</div>
                    </div>
                  ) : null}
                </div>

                {isLoggedIn ? (
                  <div className="pt-2">
                    <Link to="/sales">
                      <Button variant="outline" className="w-full gap-2">
                        Open Sales
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

