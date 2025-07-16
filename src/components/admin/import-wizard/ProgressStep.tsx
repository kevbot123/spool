"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProgressStepProps {
  message?: string;
}

export const ProgressStep: React.FC<ProgressStepProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <Loader2 className="animate-spin h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {message || "Import in progress. Please wait..."}
      </p>
    </div>
  );
};
