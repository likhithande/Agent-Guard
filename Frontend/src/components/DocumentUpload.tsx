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
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Upload Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500"></div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">Document Ingestion</h2>
          <p className="text-slate-500 text-lg">Securely upload financial documents for AI-powered analysis</p>
        </div>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative group border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ease-in-out ${dragActive
            ? 'border-blue-500 bg-blue-50/50 scale-[1.02]'
            : 'border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-slate-50'
            }`}
        >
          <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] rounded-2xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-20 h-20 mb-6 rounded-full flex items-center justify-center transition-colors duration-300 ${dragActive ? 'bg-blue-100 text-blue-600' : 'bg-white shadow-sm border border-slate-200 text-slate-400 group-hover:text-blue-500 group-hover:border-blue-200'}`}>
              <Upload className={`w-10 h-10 ${dragActive ? 'animate-bounce' : ''}`} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Drag and drop your files here
            </h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Supports PDF, CSV, PNG, JPG, and Excel files. Maximum file size is 50MB per document.
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
              className="inline-flex items-center justify-center px-8 py-3.5 bg-slate-900 text-white font-medium rounded-xl cursor-pointer hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              Browse Files
            </label>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-10 space-y-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Selected Files ({files.length})</h3>
              <button onClick={() => setFiles([])} className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors">Clear all</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2.5 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-colors ml-2"
                    disabled={uploading}
                    title="Remove file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-6">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full sm:w-auto sm:min-w-[300px] mx-auto px-8 py-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
              >
                {uploading ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    Processing Documents...
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6" />
                    Start AI Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Features Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow group">
          <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <FileText className="w-7 h-7 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Smart Extraction</h3>
          <p className="text-slate-600 leading-relaxed">
            AI automatically extracts structured data from unstructured documents including invoices, receipts, and reports with high accuracy.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow group">
          <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <CheckCircle className="w-7 h-7 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Anomaly Detection</h3>
          <p className="text-slate-600 leading-relaxed">
            Advanced algorithms flag duplicates, outliers, policy violations, and suspicious financial patterns automatically in real-time.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow group">
          <div className="w-14 h-14 bg-cyan-50 border border-cyan-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Table className="w-7 h-7 text-cyan-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Audit Reports</h3>
          <p className="text-slate-600 leading-relaxed">
            Generate comprehensive, explainable reports that auditors can trust with full traceability back to original source documents.
          </p>
        </div>
      </div>
    </div>
  );
}
