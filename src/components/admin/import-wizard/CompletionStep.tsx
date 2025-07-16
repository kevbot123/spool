"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface CompletionStepProps {
  success: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
  onClose: () => void;
}

export const CompletionStep: React.FC<CompletionStepProps> = ({ success, failed, errors, onClose }) => {
  const hasErrors = failed > 0;

  const handleDownloadCsv = () => {
    const header = "row,message\n";
    const rows = errors.map((e) => `${e.row},"${e.message.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import_errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 py-6 items-center text-center">
      <h3 className="text-lg font-medium">
        Import complete: {success} succeeded{hasErrors ? `, ${failed} failed` : ""}
      </h3>
      {hasErrors && (
        <>
          <p className="text-sm text-muted-foreground max-w-sm">
            Some rows failed to import. You can download a CSV of error messages below.
          </p>
          <Button size="sm" variant="outline" onClick={handleDownloadCsv}>
            Download error CSV
          </Button>
        </>
      )}
      <Button className="mt-4" onClick={onClose}>
        Done
      </Button>
    </div>
  );
};
