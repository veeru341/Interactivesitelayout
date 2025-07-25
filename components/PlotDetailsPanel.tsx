
import React, { useState, useEffect } from 'react';
import { Layout, Status, Role, SvgOverlay } from '../types';
import { STATUS_COLORS } from '../constants';
import { CloseIcon, EditIcon, InfoIcon, ListIcon, SubdivideIcon, TagIcon, TrashIcon, UserIcon } from './icons';

interface PlotDetailsPanelProps {
  layout: Layout | null;
  onUpdate: (layout: Layout) => void;
  onDelete: (layoutId: number) => void;
  onClose: () => void;
  role: Role;
  onEnterEditor?: () => void;
  layouts?: Layout[];
  onLayoutSelect?: (layout: Layout) => void;
  onAddSvgOverlay?: (overlay: SvgOverlay) => void;
  mapCenter?: { lat: number; lng: number };
}

const PlotDetailsPanel: React.FC<PlotDetailsPanelProps> = ({
  layout,
  onUpdate,
  onDelete,
  onClose,
  role,
  onEnterEditor,
  layouts,
  onLayoutSelect,
  onAddSvgOverlay,
  mapCenter,
}: PlotDetailsPanelProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState<Omit<Layout, 'id' | 'latlngs' | 'plots'>>({
    name: '',
    vendorName: '',
    status: Status.Available,
  });

  // SVG upload state
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [svgPreview, setSvgPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (layout) {
      setFormData({
        name: layout.name,
        vendorName: layout.vendorName,
        status: layout.status,
      });
    }
  }, [layout]);

  useEffect(() => {
    if (!layout) {
      setHasChanges(false);
      return;
    }
    const changed =
      formData.name !== layout.name ||
      formData.vendorName !== layout.vendorName ||
      formData.status !== layout.status;
    setHasChanges(changed);
  }, [formData, layout]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as Status;
    setFormData(prev => ({ ...prev, status: newStatus }));
  };

  const handleSaveChanges = async () => {
    if (layout && hasChanges) {
      setIsSaving(true);
      // Simulate network latency for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      onUpdate({ ...layout, ...formData });
      setIsSaving(false);
    }
  };
  
  const statusColorClass = layout ? STATUS_COLORS[layout.status].replace('fill-', 'bg-') : '';

  const handleSvgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0] || null;
    setSvgFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text && text.includes('<svg')) {
          setSvgPreview(text);
        } else {
          setSvgPreview(null);
          setUploadError('File is not a valid SVG.');
        }
      };
      reader.readAsText(file);
    } else {
      setSvgPreview(null);
    }
  };

  const handleUploadSvgToMap = () => {
    if (svgPreview && onAddSvgOverlay) {
      // Use the current map center for the initial position
      const defaultPosition = mapCenter || { lat: 20.5937, lng: 78.9629 };
      onAddSvgOverlay({
        id: `svg-${Date.now()}`,
        svgContent: svgPreview,
        position: defaultPosition,
        scale: 1,
        rotation: 0,
      });
      setSvgFile(null);
      setSvgPreview(null);
      setUploadError(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {role === Role.Admin && (
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center space-x-3 mb-4">
            <ListIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            <h2 className="text-xl font-bold">All Layouts</h2>
          </div>
          {/* SVG Upload Section */}
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
            <label className="block text-sm font-medium mb-2">Upload SVG to Map</label>
            <input type="file" accept=".svg" onChange={handleSvgFileChange} className="mb-2" />
            {svgPreview && (
              <div className="mb-2 border rounded bg-white dark:bg-slate-800 p-2 max-h-32 overflow-auto">
                <div dangerouslySetInnerHTML={{ __html: svgPreview }} style={{ maxWidth: '100%', maxHeight: '100px' }} />
              </div>
            )}
            {uploadError && <div className="text-red-500 text-xs mb-2">{uploadError}</div>}
            <button
              className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-blue-300 disabled:cursor-not-allowed"
              disabled={!svgPreview}
              onClick={handleUploadSvgToMap}
            >
              Add SVG to Map
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {layouts && layouts.length > 0 ? (
              layouts.map(l => (
                <div key={l.id} className="group flex items-center justify-between rounded-lg">
                  <button
                    onClick={() => onLayoutSelect?.(l)}
                    className={`flex-grow text-left p-3 rounded-lg transition-colors text-sm font-medium ${
                      layout?.id === l.id
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {l.name}
                  </button>
                  <button
                    onClick={() => onDelete?.(l.id)}
                    className="p-2 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/50 dark:hover:text-red-400 transition-opacity ml-2 flex-shrink-0"
                    title="Delete Layout"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No layouts created yet.</p>
            )}
          </div>
        </div>
      )}

      <div className="flex-grow overflow-y-auto">
        {!layout ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500 dark:text-slate-400">
              <InfoIcon className="w-16 h-16 mb-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-lg font-semibold">No Layout Selected</h3>
              <p className="text-sm">Click on a layout on the map{role === Role.Admin && " or from the list above"} to view its details.</p>
          </div>
        ) : (
          <div className="p-6 h-full flex flex-col relative text-slate-800 dark:text-slate-200">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
              <CloseIcon className="w-6 h-6" />
            </button>
      
            <div className="flex items-center mb-6">
              <div className={`w-4 h-4 rounded-full mr-3 ${statusColorClass}`}></div>
              <h2 className="text-2xl font-bold">Layout Details</h2>
            </div>
      
            <div className="space-y-6 flex-grow">
              {/* Name */}
              <div className="flex items-start space-x-3">
                <TagIcon className="w-6 h-6 mt-1 text-slate-400"/>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-500 dark:text-slate-400">Layout Name</label>
                  {role === Role.Admin ? (
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  ) : (
                    <p className="text-lg font-semibold mt-1">{layout.name}</p>
                  )}
                </div>
              </div>
              
              {/* Vendor Name */}
              <div className="flex items-start space-x-3">
                <UserIcon className="w-6 h-6 mt-1 text-slate-400"/>
                <div>
                  <label htmlFor="vendorName" className="block text-sm font-medium text-slate-500 dark:text-slate-400">Vendor Name</label>
                  {role === Role.Admin ? (
                    <input
                      type="text"
                      id="vendorName"
                      name="vendorName"
                      value={formData.vendorName}
                      onChange={handleInputChange}
                      className="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  ) : (
                    <p className="text-lg mt-1">{layout.vendorName}</p>
                  )}
                </div>
              </div>
      
              {/* Status */}
               <div className="flex items-start space-x-3">
                <EditIcon className="w-6 h-6 mt-1 text-slate-400"/>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-slate-500 dark:text-slate-400">Status</label>
                  {role === Role.Admin ? (
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleStatusChange}
                      className="mt-1 block w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      {Object.values(Status).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <p className={`text-lg font-bold mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm ${statusColorClass.replace('bg-', 'text-').replace('-500', '-100')} ${statusColorClass}`}>{layout.status}</p>
                  )}
                </div>
              </div>
      
            </div>
      
            {role === Role.Admin && (
              <div className="flex-shrink-0 pt-4 space-y-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={onEnterEditor}
                  className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-colors transform active:scale-95"
                >
                  <SubdivideIcon className="w-5 h-5"/>
                  <span>Subdivide Layout</span>
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving || !hasChanges}
                  className={`
                    relative overflow-hidden w-full flex justify-center items-center text-white font-bold py-3 px-4 rounded-lg 
                    transition-colors transform 
                    ${isSaving ? 'cursor-wait bg-blue-600' : ''}
                    ${!isSaving && hasChanges ? 'bg-blue-600 hover:bg-blue-700 active:scale-95' : ''}
                    ${!isSaving && !hasChanges ? 'bg-blue-300 dark:bg-blue-700/60 cursor-not-allowed' : ''}
                  `}
                >
                  <span className={`${isSaving ? 'opacity-0' : 'opacity-100'}`}>
                    {hasChanges ? 'Save Changes' : 'Up to date'}
                  </span>
                  {isSaving && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="block absolute w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></span>
                      <span className="opacity-75">Saving...</span>
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlotDetailsPanel;