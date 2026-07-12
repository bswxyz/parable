"use client";

import * as React from "react";
import { ThemeProvider as NextThemes } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemes>) {
  return <NextThemes {...props}>{children}</NextThemes>;
}
