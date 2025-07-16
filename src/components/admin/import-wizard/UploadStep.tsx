import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';

export interface UploadStepProps {
  onFileParsed: (params: { file: File; headers: string[]; sampleRow: Record<string, any> }) => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({ onFileParsed }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const parseFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      preview: 2, // Only need first row for header inspection / sample values
      complete: (results) => {
        const headers = results.meta.fields || [];
        const sampleRow = (results.data && results.data[0]) || {};
        onFileParsed({ file, headers, sampleRow });
      },
      error: (err) => {
        alert(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'text/csv') {
      parseFile(file);
    } else {
      alert('Please drop a valid CSV file.');
    }
  };

  return (
    <div
      className={`flex flex-col gap-4 items-center py-8 border-2 border-dashed rounded-lg transition-colors ${
        isDragging ? 'border-primary bg-muted' : 'border-transparent'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button variant="outline" onClick={() => inputRef.current?.click()}>
        Select CSV File
      </Button>
      <p className="text-sm text-muted-foreground">or drag and drop it here</p>
    </div>
  );
};
