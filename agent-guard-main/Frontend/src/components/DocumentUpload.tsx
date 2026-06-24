import { useState, useCallback } from 'react';
import { Upload, File, FileText, Image, Table, X, CheckCircle, Loader } from 'lucide-react';
import type { Document } from '@/types';

interface DocumentUploadProps {
  onDocumentsUploaded: (files: File[]) => void;
}

export function DocumentUpload({ onDocumentsUploaded }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(file =>
      file.type.includes('pdf') ||
      file.type.includes('image') ||
      file.type.includes('csv') ||
      file.type.includes('spreadsheet')
    );

    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (files.length === 0) return;

    setUploading(true);

    // Pass the actual files to the parent component for processing
    onDocumentsUploaded(files);
    setFiles([]);
    setUploading(false);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-6 h-6 text-red-600" />;
    if (type.includes('image')) return <Image className="w-6 h-6 text-blue-600" />;
    if (type.includes('csv') || type.includes('spreadsheet')) return <Table className="w-6 h-6 text-green-600" />;
    return <File className="w-6 h-6 text-slate-600" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-6">
          <h2 className="text-slate-900 mb-2">Document Ingestion</h2>
          <p className="text-slate-600">Upload financial documents for AI-powered analysis</p>
        </div>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
            }`}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-blue-600' : 'text-slate-400'}`} />
          <p className="text-slate-700 mb-2">
            Drag and drop your files here, or click to browse
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Supports PDF, CSV, PNG, JPG, and Excel files
          </p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".pdf,.csv,.png,.jpg,.jpeg,.xlsx,.xls"
            onChange={handleFileInput}
          />
          <label
            htmlFor="file-upload"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
          >
            Select Files
          </label>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-slate-900">Selected Files ({files.length})</h3>
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 truncate">{file.name}</p>
                    <p className="text-sm text-slate-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                  disabled={uploading}
                  title="Remove file"
                  aria-label="Remove file"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            ))}

            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Processing Documents...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload & Analyze
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Features Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-slate-900 mb-2">Smart Extraction</h3>
          <p className="text-sm text-slate-600">
            AI automatically extracts structured data from unstructured documents including invoices, receipts, and reports.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-slate-900 mb-2">Anomaly Detection</h3>
          <p className="text-sm text-slate-600">
            Advanced algorithms flag duplicates, outliers, policy violations, and suspicious patterns automatically.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Table className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-slate-900 mb-2">Audit Reports</h3>
          <p className="text-sm text-slate-600">
            Generate comprehensive, explainable reports that auditors can trust with full traceability and reasoning.
          </p>
        </div>
      </div>
    </div>
  );
}
