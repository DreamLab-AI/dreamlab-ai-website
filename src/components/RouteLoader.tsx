import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading component shown while route chunks are being loaded
 */
export const RouteLoader = () => {
  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-12 space-y-4">
      <div className="w-full max-w-2xl space-y-4">
        <Skeleton className="h-12 w-3/4 mx-auto" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-5/6" />
        <Skeleton className="h-48 w-full mt-8" />
      </div>
    </div>
  );
};