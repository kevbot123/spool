"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSite } from "@/context/SiteContext";
import { UploadStep } from "@/components/admin/import-wizard/UploadStep";
import { MappingStep } from "@/components/admin/import-wizard/MappingStep";
import { ProgressStep } from "@/components/admin/import-wizard/ProgressStep";
import { CompletionStep } from "@/components/admin/import-wizard/CompletionStep";
import { CollectionConfig } from "@/types/cms";

interface ImportNewCollectionModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Refresh the sidebar after creating new collection */
  onCreated?: () => void;
}

/**
 * Wizard flow for: Create a new collection from CSV import.
 * Steps:
 * 1. Name + slug + CSV upload
 * 2. Field mapping (with ability to create fields)
 * 3. Progress
 * 4. Completion
 */
export const ImportNewCollectionModal: React.FC<ImportNewCollectionModalProps> = ({
  open,
  onOpenChange,
  onCreated,
}) => {
  const { currentSite } = useSite();
  const [step, setStep] = useState<"details" | "mapping" | "progress" | "complete">("details");

  // Collection details
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  // CSV data
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRow, setSampleRow] = useState<Record<string, any>>({});

  // Import result
  const [result, setResult] = useState<{ success: number; failed: number; errors: any[] } | null>(
    null,
  );

  // Auto-generate slug & pattern
  React.useEffect(() => {
    if (name) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  }, [name]);

  const handleFileParsed: Parameters<typeof UploadStep>[0]["onFileParsed"] = ({
    file,
    headers,
    sampleRow,
  }) => {
    setFile(file);
    setHeaders(headers);
    setSampleRow(sampleRow);
    setStep("mapping");
  };

  const handleSubmitMapping = async (mapping: Record<string, string>, updatedCollection?: CollectionConfig) => {
    if (!file || !currentSite) return;

    setStep("progress");

    try {
      // First, create collection if it hasn't been created yet (just once)
      if (!createdCollectionSlug.current) {
        const respCreate = await fetch(`/api/admin/collections?siteId=${currentSite.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            slug,
            fields: updatedCollection?.fields ?? [],
            siteId: currentSite.id,
          }),
        });
        if (!respCreate.ok) throw new Error("Failed to create collection");
        createdCollectionSlug.current = slug;
      }

      // Now perform import
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping", JSON.stringify(mapping));
      formData.append("siteId", currentSite.id);

      const respImport = await fetch(`/api/admin/content/${slug}/import`, {
        method: "POST",
        body: formData,
      });
      if (!respImport.ok) throw new Error("Import failed");
      const data = await respImport.json();
      setResult(data);
      setStep("complete");
      onCreated?.();
    } catch (err) {
      console.error(err);
      alert("Import failed");
      onOpenChange(false);
    }
  };

  const createdCollectionSlug = React.useRef<string | null>(null);

  // Reset state when modal is reopened
  React.useEffect(() => {
    if (!open) {
      setStep("details");
      setName("");
      setSlug("");
      setFile(null);
      setHeaders([]);
      setSampleRow({});
      setResult(null);
      createdCollectionSlug.current = null;
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[750px]">
        <DialogHeader className="pb-6">
          <DialogTitle>Create collection from CSV</DialogTitle>
        </DialogHeader>

        {step === "details" && (
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="col-name">Collection name</Label>
                <Input id="col-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>

            {/* CSV upload section */}
            <UploadStep onFileParsed={handleFileParsed} />
          </div>
        )}

        {step === "mapping" && (
          <MappingStep
            collection={{
              name,
              slug,
              fields: [],
              site_id: "temp", // placeholder until created
              contentPath: "", // not needed for import mapping
              // minimal required placeholder props for CollectionConfig type
              description: "",
            } as unknown as CollectionConfig}
            csvHeaders={headers}
            sampleRow={sampleRow}
            onBack={() => setStep("details")}
            onSubmit={(mapping, updatedCollection) => handleSubmitMapping(mapping, updatedCollection)}
          />
        )}
        {step === "progress" && <ProgressStep />}
        {step === "complete" && result && (
          <CompletionStep
            success={result.success}
            failed={result.failed}
            errors={result.errors}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
