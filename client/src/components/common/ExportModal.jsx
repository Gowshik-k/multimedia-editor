import React, { useState } from 'react';
import { X, Download, Loader2, Check } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export default function ExportModal({ isOpen, onClose }) {
  const {
    currentProject,
    activeModule,
    renderAudioFFmpeg,
    renderVideoFFmpeg,
    exportImageFFmpeg,
    isProcessing,
    processingStatus
  } = useProject();

  const [exportUrl, setExportUrl] = useState(null);
  const [exportFilename, setExportFilename] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleExport = async () => {
    setErrorMsg('');
    setExportUrl(null);
    try {
      let res = null;
      if (activeModule === 'image') {
        res = await exportImageFFmpeg();
      } else if (activeModule === 'audio') {
        res = await renderAudioFFmpeg({});
      } else {
        res = await renderVideoFFmpeg();
      }
      setExportUrl(res.url);
      setExportFilename(res.filename);
    } catch (err) {
      setErrorMsg(err.message || 'Processing failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <span className="font-semibold text-sm text-neutral-900">
            Export {activeModule.charAt(0).toUpperCase() + activeModule.slice(1)}
          </span>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 p-1 rounded hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1">
            <div className="text-neutral-900 font-medium">Server FFmpeg Processing</div>
            <div className="text-[11px] text-neutral-500">
              High-quality media encoding and export rendered cleanly on the backend.
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          {exportUrl && (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-800 font-medium">
                <Check className="w-4 h-4" />
                <span>Export generated successfully</span>
              </div>
              <a
                href={exportUrl}
                download={exportFilename}
                className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium flex items-center justify-center space-x-2 transition shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download {exportFilename}</span>
              </a>
            </div>
          )}

          {!exportUrl && (
            <button
              onClick={handleExport}
              disabled={isProcessing}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium flex items-center justify-center space-x-2 shadow-xs transition"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{processingStatus || 'Rendering...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Start FFmpeg Export</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
