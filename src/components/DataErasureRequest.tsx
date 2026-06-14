/**
 * DataErasureRequest -- GDPR Article 17 "Right to Erasure" UI.
 *
 * Renders a form where users can request deletion of all personal data
 * associated with their email address. A confirmation dialog prevents
 * accidental submissions.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { requestDataErasure, type ErasureReport } from "@/lib/gdpr-erasure";
import { EMAIL_REGEX } from "@/lib/utils";

export function DataErasureRequest() {
  const [email, setEmail] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<ErasureReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequestClick = () => {
    setError(null);
    setReport(null);

    if (!email.trim() || !EMAIL_REGEX.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmErasure = async () => {
    setIsConfirmOpen(false);
    setIsSubmitting(true);
    setError(null);
    setReport(null);

    try {
      const result = await requestDataErasure(email);
      setReport(result);

      if (!result.success) {
        setError(
          "Some data could not be deleted. Please contact us at info@dreamlab-ai.com for manual processing.",
        );
      } else {
        setEmail("");
      }
    } catch {
      setError(
        "An unexpected error occurred. Please contact us at info@dreamlab-ai.com to request data erasure manually.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          aria-label="Email address for data erasure request"
          className="flex-1"
        />
        <Button
          variant="destructive"
          onClick={handleRequestClick}
          disabled={isSubmitting || !email.trim()}
        >
          {isSubmitting ? "Deleting..." : "Delete My Data"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {report?.success && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 text-sm space-y-1">
          <p className="font-medium text-green-700 dark:text-green-400">
            Data erasure complete
          </p>
          <p>
            All personal data associated with{" "}
            <strong>{report.email}</strong> has been deleted.
          </p>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground">
            {report.results.map((r) => (
              <li key={r.table}>
                {r.table}: {r.deleted} record{r.deleted !== 1 ? "s" : ""} removed
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            Completed at {new Date(report.timestamp).toLocaleString()}
          </p>
        </div>
      )}

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm data deletion</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all personal data associated with{" "}
              <strong>{email}</strong> from our systems, including contact
              submissions and email subscriptions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmErasure}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete my data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DataErasureRequest;
