import { forwardRef } from "react";
import { Link as RouterLink, type LinkProps } from "react-router-dom";
import { withTrailingSlash } from "@/lib/trailing-slash";

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, ...props }, ref) {
  return <RouterLink ref={ref} to={typeof to === "string" ? withTrailingSlash(to) : to} {...props} />;
});
