/**
 * PaymentDashboard -- MRC20 token + sat balance management UI.
 *
 * Displays the pod payment gateway info (GET /pay/.info), the
 * authenticated user's balance (GET /pay/.balance), a deposit input
 * for TXO URIs, and -- when the operator has configured an MRC20
 * token -- token balance, buy, and withdraw controls.
 *
 * All API calls go through src/lib/forum-api.ts which targets the
 * pod-worker's /pay/ routes.
 */

import { useCallback, useEffect, useState } from "react";
import {
  type PayBalance,
  type PayDeposit,
  type PayInfoExtended,
  type TokenInfo,
  type TokenBuyResponse,
  type TokenWithdrawResponse,
  ForumApiError,
  getPayInfoExtended,
  getPayBalance,
  postPayDeposit,
  postTokenBuy,
  postTokenWithdraw,
} from "@/lib/forum-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentDashboardProps {
  /** NIP-98 Authorization header value. When absent the dashboard shows
   *  public info only (no balance, no deposit, no token ops). */
  nip98AuthHeader?: string;
}

type Status = "idle" | "loading" | "error";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaymentDashboard({ nip98AuthHeader }: PaymentDashboardProps) {
  // -- gateway info (public) ------------------------------------------------
  const [info, setInfo] = useState<PayInfoExtended | null>(null);
  const [infoStatus, setInfoStatus] = useState<Status>("idle");
  const [infoError, setInfoError] = useState<string | null>(null);

  // -- balance (authed) -----------------------------------------------------
  const [balance, setBalance] = useState<PayBalance | null>(null);
  const [balanceStatus, setBalanceStatus] = useState<Status>("idle");
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // -- deposit form ---------------------------------------------------------
  const [txoUri, setTxoUri] = useState("");
  const [depositResult, setDepositResult] = useState<PayDeposit | null>(null);
  const [depositStatus, setDepositStatus] = useState<Status>("idle");
  const [depositError, setDepositError] = useState<string | null>(null);

  // -- token ops ------------------------------------------------------------
  const [tokenAmount, setTokenAmount] = useState("");
  const [tokenOpResult, setTokenOpResult] = useState<
    TokenBuyResponse | TokenWithdrawResponse | null
  >(null);
  const [tokenOpStatus, setTokenOpStatus] = useState<Status>("idle");
  const [tokenOpError, setTokenOpError] = useState<string | null>(null);

  // -- fetch gateway info ---------------------------------------------------
  const fetchInfo = useCallback(async () => {
    setInfoStatus("loading");
    setInfoError(null);
    try {
      const data = await getPayInfoExtended();
      setInfo(data);
      setInfoStatus("idle");
    } catch (err) {
      const msg =
        err instanceof ForumApiError ? err.message : "Failed to fetch payment info";
      setInfoError(msg);
      setInfoStatus("error");
    }
  }, []);

  // -- fetch balance --------------------------------------------------------
  const fetchBalance = useCallback(async () => {
    if (!nip98AuthHeader) return;
    setBalanceStatus("loading");
    setBalanceError(null);
    try {
      const data = await getPayBalance(nip98AuthHeader);
      setBalance(data);
      setBalanceStatus("idle");
    } catch (err) {
      const msg =
        err instanceof ForumApiError ? err.message : "Failed to fetch balance";
      setBalanceError(msg);
      setBalanceStatus("error");
    }
  }, [nip98AuthHeader]);

  // -- initial load ---------------------------------------------------------
  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // -- deposit handler ------------------------------------------------------
  const handleDeposit = async () => {
    if (!nip98AuthHeader || !txoUri.trim()) return;
    setDepositStatus("loading");
    setDepositError(null);
    setDepositResult(null);
    try {
      const result = await postPayDeposit(nip98AuthHeader, txoUri.trim());
      setDepositResult(result);
      setDepositStatus("idle");
      setTxoUri("");
      // Refresh balance after deposit
      fetchBalance();
    } catch (err) {
      const msg =
        err instanceof ForumApiError ? err.message : "Deposit failed";
      setDepositError(msg);
      setDepositStatus("error");
    }
  };

  // -- token buy handler ----------------------------------------------------
  const handleTokenBuy = async () => {
    if (!nip98AuthHeader || !tokenAmount.trim()) return;
    const amount = parseInt(tokenAmount, 10);
    if (isNaN(amount) || amount <= 0) return;
    setTokenOpStatus("loading");
    setTokenOpError(null);
    setTokenOpResult(null);
    try {
      const result = await postTokenBuy(nip98AuthHeader, amount);
      setTokenOpResult(result);
      setTokenOpStatus("idle");
      setTokenAmount("");
      fetchBalance();
    } catch (err) {
      const msg =
        err instanceof ForumApiError ? err.message : "Token purchase failed";
      setTokenOpError(msg);
      setTokenOpStatus("error");
    }
  };

  // -- token withdraw handler -----------------------------------------------
  const handleTokenWithdraw = async () => {
    if (!nip98AuthHeader || !tokenAmount.trim()) return;
    const amount = parseInt(tokenAmount, 10);
    if (isNaN(amount) || amount <= 0) return;
    setTokenOpStatus("loading");
    setTokenOpError(null);
    setTokenOpResult(null);
    try {
      const result = await postTokenWithdraw(nip98AuthHeader, amount);
      setTokenOpResult(result);
      setTokenOpStatus("idle");
      setTokenAmount("");
      fetchBalance();
    } catch (err) {
      const msg =
        err instanceof ForumApiError ? err.message : "Token withdrawal failed";
      setTokenOpError(msg);
      setTokenOpStatus("error");
    }
  };

  // -- derived values -------------------------------------------------------
  const tokenConfig: TokenInfo | undefined = info?.token;
  const isAuthed = Boolean(nip98AuthHeader);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Gateway Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Gateway</CardTitle>
          <CardDescription>
            Web Ledgers micropayment system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {infoStatus === "loading" && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          )}
          {infoStatus === "error" && (
            <p className="text-sm text-destructive">{infoError}</p>
          )}
          {info && infoStatus === "idle" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Cost per request:</span>
                <Badge variant="secondary">
                  {info.cost_sats ?? (info as Record<string, unknown>).cost} sat
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={info.enabled ? "default" : "outline"}>
                  {info.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              {info.chains && info.chains.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Chains:</span>
                  {info.chains.map((c) => (
                    <Badge key={c.id} variant="outline">
                      {c.name}
                    </Badge>
                  ))}
                </div>
              )}
              {tokenConfig && (
                <div className="rounded-md border bg-muted/50 p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">MRC20 Token:</span>
                    <Badge>{tokenConfig.ticker}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Rate: {tokenConfig.rate} {tokenConfig.ticker}/sat
                    {" | "}Supply: {tokenConfig.supply.toLocaleString()}
                  </p>
                  {tokenConfig.issuer && (
                    <p className="text-xs text-muted-foreground truncate">
                      Issuer: {tokenConfig.issuer}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="ghost" size="sm" onClick={fetchInfo}>
            Refresh
          </Button>
        </CardFooter>
      </Card>

      {/* Balance Card (authed only) */}
      {isAuthed && (
        <Card>
          <CardHeader>
            <CardTitle>Your Balance</CardTitle>
            <CardDescription>
              Satoshi balance for pod resource access
            </CardDescription>
          </CardHeader>
          <CardContent>
            {balanceStatus === "loading" && (
              <div className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            )}
            {balanceStatus === "error" && (
              <p className="text-sm text-destructive">{balanceError}</p>
            )}
            {balance && balanceStatus === "idle" && (
              <div className="space-y-2">
                <p className="text-3xl font-bold tabular-nums">
                  {balance.balance.toLocaleString()}{" "}
                  <span className="text-lg font-normal text-muted-foreground">
                    {balance.unit}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Cost per request: {balance.cost_per_request} {balance.unit}
                  {" | "}
                  Remaining requests: {balance.requests_remaining.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  DID: {balance.did}
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" onClick={fetchBalance}>
              Refresh
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Deposit Card (authed only) */}
      {isAuthed && (
        <Card>
          <CardHeader>
            <CardTitle>Deposit</CardTitle>
            <CardDescription>
              Fund your balance via Bitcoin TXO URI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="bitcoin:<txid>?vout=0 or txid:vout"
                value={txoUri}
                onChange={(e) => setTxoUri(e.target.value)}
                disabled={depositStatus === "loading"}
              />
              <Button
                onClick={handleDeposit}
                disabled={depositStatus === "loading" || !txoUri.trim()}
              >
                {depositStatus === "loading" ? "Depositing..." : "Deposit"}
              </Button>
            </div>
            {depositError && (
              <p className="text-sm text-destructive">{depositError}</p>
            )}
            {depositResult && (
              <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
                <p className="font-medium">Deposit successful</p>
                <p>
                  Credited: {depositResult.credited} {depositResult.unit}
                </p>
                <p>
                  New balance: {depositResult.balance} {depositResult.unit}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Token Operations Card (authed + token configured) */}
      {isAuthed && tokenConfig && (
        <Card>
          <CardHeader>
            <CardTitle>{tokenConfig.ticker} Tokens</CardTitle>
            <CardDescription>
              Buy or withdraw MRC20 tokens at {tokenConfig.rate}{" "}
              {tokenConfig.ticker}/sat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                placeholder={`Amount in ${tokenConfig.ticker}`}
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                disabled={tokenOpStatus === "loading"}
              />
              <Button
                onClick={handleTokenBuy}
                disabled={tokenOpStatus === "loading" || !tokenAmount.trim()}
              >
                Buy
              </Button>
              <Button
                variant="outline"
                onClick={handleTokenWithdraw}
                disabled={tokenOpStatus === "loading" || !tokenAmount.trim()}
              >
                Withdraw
              </Button>
            </div>
            {tokenOpError && (
              <p className="text-sm text-destructive">{tokenOpError}</p>
            )}
            {tokenOpResult && (
              <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
                <p className="font-medium">
                  {"status" in tokenOpResult ? tokenOpResult.status : ""}
                </p>
                {"cost_sats" in tokenOpResult && (
                  <p>Cost: {tokenOpResult.cost_sats} sat</p>
                )}
                {"credited_sats" in tokenOpResult && (
                  <p>Credited: {tokenOpResult.credited_sats} sat</p>
                )}
                <p>
                  Sat balance: {tokenOpResult.balance_sats}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Unauthenticated prompt */}
      {!isAuthed && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Sign in with your Nostr identity to view your balance, make
              deposits, and manage tokens.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PaymentDashboard;
