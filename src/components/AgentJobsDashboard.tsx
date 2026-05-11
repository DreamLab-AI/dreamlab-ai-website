/**
 * AgentJobsDashboard -- surfaces D1 agent_jobs table data.
 *
 * Fetches the authenticated user's agent jobs from GET /pay/.jobs and
 * displays them in a table with status badges, timestamps, and cost info.
 *
 * P2-12: This component closes the feature gap where agent_jobs existed
 * in D1 but had no UI surfacing job status, history, or management.
 */

import { useCallback, useEffect, useState } from "react";
import {
  type AgentJob,
  type AgentJobsListResponse,
  type AgentJobStatus,
  ForumApiError,
  getAgentJobs,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentJobsDashboardProps {
  /** NIP-98 Authorization header value. Required to fetch jobs. */
  nip98AuthHeader?: string;
}

type Status = "idle" | "loading" | "error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map job status to a Badge variant for visual differentiation. */
function statusVariant(
  status: AgentJobStatus,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "settled":
      return "default";
    case "running":
      return "secondary";
    case "held":
    case "estimated":
      return "outline";
    case "failed":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

/** Format an epoch-seconds timestamp to a locale string, or return "--". */
function fmtTs(epochSecs: number | null): string {
  if (epochSecs == null || epochSecs === 0) return "--";
  return new Date(epochSecs * 1000).toLocaleString();
}

/** Truncate a DID for display (show first 16 + last 6 chars). */
function shortDid(did: string): string {
  if (did.length <= 26) return did;
  return `${did.slice(0, 16)}...${did.slice(-6)}`;
}

/** Truncate a job ID for display. */
function shortJobId(jobId: string): string {
  if (jobId.length <= 20) return jobId;
  return `${jobId.slice(0, 16)}...`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgentJobsDashboard({ nip98AuthHeader }: AgentJobsDashboardProps) {
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [jobCount, setJobCount] = useState(0);
  const [fetchStatus, setFetchStatus] = useState<Status>("idle");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isAuthed = Boolean(nip98AuthHeader);

  const fetchJobs = useCallback(async () => {
    if (!nip98AuthHeader) return;
    setFetchStatus("loading");
    setFetchError(null);
    try {
      const data: AgentJobsListResponse = await getAgentJobs(nip98AuthHeader);
      setJobs(data.jobs);
      setJobCount(data.count);
      setFetchStatus("idle");
    } catch (err) {
      const msg =
        err instanceof ForumApiError
          ? err.message
          : "Failed to fetch agent jobs";
      setFetchError(msg);
      setFetchStatus("error");
    }
  }, [nip98AuthHeader]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // -- Unauthenticated state ------------------------------------------------
  if (!isAuthed) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in with your Nostr identity to view your agent jobs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Jobs</CardTitle>
        <CardDescription>
          Status and history of your agent job requests ({jobCount} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Loading skeleton */}
        {fetchStatus === "loading" && (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        )}

        {/* Error state */}
        {fetchStatus === "error" && (
          <p className="text-sm text-destructive">{fetchError}</p>
        )}

        {/* Empty state */}
        {fetchStatus === "idle" && jobs.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No agent jobs found. Jobs will appear here once you submit inference
            requests through the pod worker.
          </p>
        )}

        {/* Jobs table */}
        {fetchStatus === "idle" && jobs.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Job ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead className="text-right">Est. sats</TableHead>
                  <TableHead className="text-right">Held</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.job_id}>
                    <TableCell
                      className="font-mono text-xs"
                      title={job.job_id}
                    >
                      {shortJobId(job.job_id)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(job.status)}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="font-mono text-xs max-w-[120px] truncate"
                      title={job.agent_did}
                    >
                      {shortDid(job.agent_did)}
                    </TableCell>
                    <TableCell className="text-xs max-w-[140px] truncate" title={job.endpoint}>
                      {job.endpoint}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {job.estimated_sats}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {job.held_sats}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {job.actual_sats ?? "--"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {fmtTs(job.created_at)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {fmtTs(job.completed_at)}
                    </TableCell>
                    <TableCell
                      className="text-xs text-destructive max-w-[180px] truncate"
                      title={job.error ?? undefined}
                    >
                      {job.error ?? "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm" onClick={fetchJobs}>
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}

export default AgentJobsDashboard;
