"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSite } from '@/context/SiteContext';
import { CollectionConfig } from '@/types/cms';
import { UploadStep } from './import-wizard/UploadStep';
import { ProgressStep } from './import-wizard/ProgressStep';
import { CompletionStep } from './import-wizard/CompletionStep';
import { MappingStep } from './import-wizard/MappingStep';

interface ImportItemsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collection: CollectionConfig;
  /** Refresh the page after a successful import */
  onImported?: () => void;
}

export const ImportItemsModal: React.FC<ImportItemsModalProps> = ({
  open,
  onOpenChange,
  collection,
  onImported,
}) => {
  const { currentSite } = useSite();
  type Step = 'upload' | 'mapping' | 'progress' | 'complete';
  const [step, setStep] = React.useState<Step>('upload');
  const [file, setFile] = React.useState<File | null>(null);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [sampleRow, setSampleRow] = React.useState<Record<string, any>>({});

  const handleFileParsed: Parameters<typeof UploadStep>[0]['onFileParsed'] = ({
    file,
    headers,
    sampleRow,
  }) => {
    setFile(file);
    setHeaders(headers);
    setSampleRow(sampleRow);
    setStep('mapping');
  };

  const handleSubmitMapping = async (mapping: Record<string, string>) => {
    if (!file) return;

    setStep('progress');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    if (currentSite?.id) {
      formData.append('siteId', currentSite.id);
    }

    try {
      const resp = await fetch(`/api/admin/content/${collection.slug}/import`, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) throw new Error('Import failed');

      const data = await resp.json();
      setResult(data);
      // Immediately notify parent so it can refresh list without waiting for modal close
      if (data.success > 0) {
        onImported?.();
      }
      setStep('complete');
    } catch (err) {
      console.error(err);
      alert('Failed to start import.');
    }
  };

  const [result, setResult] = React.useState<{ success: number; failed: number; errors: any[] } | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import items into {collection.name}</DialogTitle>
        </DialogHeader>

        {step === 'upload' && <UploadStep onFileParsed={handleFileParsed} />}
        {step === 'mapping' && (
          <MappingStep
            collection={collection}
            csvHeaders={headers}
            sampleRow={sampleRow}
            onBack={() => setStep('upload')}
            onSubmit={handleSubmitMapping}
          />
        )}
        {step === 'progress' && <ProgressStep />}
        {step === 'complete' && result && (
          <CompletionStep
            success={result.success}
            failed={result.failed}
            errors={result.errors}
            onClose={() => {
              onOpenChange(false);
              if (result.success > 0) onImported?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
