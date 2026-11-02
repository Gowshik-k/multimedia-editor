import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download,
  Trash2,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export default function ImageEditor() {
  const { imageState, updateImageState, exportImageFFmpeg } = useProject();

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Active toolbar panel tab
  const [activeTab, setActiveTab] = useState('adjust'); // 'adjust' | 'crop' | 'text' | 'layers'
  const [mobileView, setMobileView] = useState('canvas'); // 'canvas' | 'tools'
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Crop tool state
  const [aspectRatio, setAspectRatio] = useState('free');

  // Image element cached in memory
  const [imageObj, setImageObj] = useState(null);

  // Load image whenever imageSrc changes
  useEffect(() => {
    if (!imageState?.imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageState.imageSrc;
    img.onload = () => {
      setImageObj(img);
      if (!imageState.originalDimensions || imageState.originalDimensions.width !== img.naturalWidth) {
        updateImageState({
          originalDimensions: { width: img.naturalWidth, height: img.naturalHeight },
          crop: { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight, aspect: 'free' }
        }, 'Initialized image dimensions');
      }
    };
  }, [imageState?.imageSrc]);

  // Render canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const width = imageState?.crop?.width || imageObj.naturalWidth || 800;
    const height = imageState?.crop?.height || imageObj.naturalHeight || 600;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Apply filters
    const adj = imageState?.adjustments || {};
    const brightness = 1 + (adj.brightness || 0) / 100;
    const contrast = adj.contrast !== undefined ? adj.contrast : 1;
    const saturation = adj.saturation !== undefined ? adj.saturation : 1;
    const blur = adj.blur || 0;
    const grayscale = adj.grayscale || 0;
    const sepia = adj.sepia || 0;
    const invert = adj.invert || 0;

    ctx.filter = `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) blur(${blur}px) grayscale(${grayscale}%) sepia(${sepia}%) invert(${invert}%)`;

    // Draw cropped image
    const crop = imageState?.crop || { x: 0, y: 0, width: imageObj.naturalWidth, height: imageObj.naturalHeight };
    ctx.drawImage(
      imageObj,
      crop.x || 0,
      crop.y || 0,
      crop.width || imageObj.naturalWidth,
      crop.height || imageObj.naturalHeight,
      0,
      0,
      width,
      height
    );

    ctx.filter = 'none';

    // Vignette
    if (adj.vignette && adj.vignette > 0) {
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, Math.min(width, height) * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.7
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, `rgba(0,0,0,${adj.vignette / 100})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Text layers
    const layers = imageState?.layers || [];
    layers.forEach(layer => {
      if (layer.type === 'text') {
        ctx.font = `${layer.fontWeight || '600'} ${layer.fontSize || 32}px ${layer.fontFamily || 'Inter, sans-serif'}`;
        const metrics = ctx.measureText(layer.text || '');
        const textWidth = metrics.width;
        const textHeight = (layer.fontSize || 32);

        if (layer.backgroundColor && layer.backgroundColor !== 'transparent') {
          const padding = layer.padding || 8;
          ctx.fillStyle = layer.backgroundColor;
          ctx.beginPath();
          ctx.roundRect(
            layer.x - padding,
            layer.y - textHeight - padding / 2,
            textWidth + padding * 2,
            textHeight + padding * 1.5,
            layer.borderRadius || 4
          );
          ctx.fill();
        }

        if (layer.id === selectedLayerId) {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(
            layer.x - 6,
            layer.y - textHeight - 4,
            textWidth + 12,
            textHeight + 12
          );
          ctx.setLineDash([]);
        }

        ctx.fillStyle = layer.color || '#ffffff';
        ctx.fillText(layer.text || '', layer.x, layer.y);
      }
    });
  }, [imageObj, imageState, selectedLayerId]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleAdjustmentChange = (key, value) => {
    updateImageState(prev => ({
      ...prev,
      adjustments: {
        ...(prev.adjustments || {}),
        [key]: parseFloat(value)
      }
    }), `Adjusted ${key}`);
  };

  const handleAddText = () => {
    const newLayer = {
      id: 'layer-' + Date.now(),
      type: 'text',
      text: 'Headline Title',
      x: 100,
      y: 150,
      fontSize: 36,
      fontWeight: '600',
      fontFamily: 'Inter',
      color: '#ffffff',
      backgroundColor: '#0f172a',
      padding: 10,
      borderRadius: 4
    };
    updateImageState(prev => ({
      ...prev,
      layers: [...(prev.layers || []), newLayer]
    }), 'Added text layer');
    setSelectedLayerId(newLayer.id);
  };

  const handleUpdateSelectedLayer = (updates) => {
    if (!selectedLayerId) return;
    updateImageState(prev => ({
      ...prev,
      layers: (prev.layers || []).map(l => l.id === selectedLayerId ? { ...l, ...updates } : l)
    }), 'Updated text layer');
  };

  const handleDeleteLayer = (id) => {
    updateImageState(prev => ({
      ...prev,
      layers: (prev.layers || []).filter(l => l.id !== id)
    }), 'Deleted layer');
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  // Pointer position helper (handles both mouse and touch)
  const getCanvasCoords = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { mouseX: 0, mouseY: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (window.devicePixelRatio || 1) / rect.width;
    const scaleY = canvas.height / (window.devicePixelRatio || 1) / rect.height;
    return {
      mouseX: (clientX - rect.left) * scaleX,
      mouseY: (clientY - rect.top) * scaleY
    };
  };

  const startDrag = (clientX, clientY) => {
    const { mouseX, mouseY } = getCanvasCoords(clientX, clientY);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const layers = [...(imageState?.layers || [])].reverse();
    const ctx = canvas.getContext('2d');

    let hit = null;
    for (const layer of layers) {
      if (layer.type === 'text') {
        ctx.font = `${layer.fontWeight || '600'} ${layer.fontSize || 32}px ${layer.fontFamily || 'Inter, sans-serif'}`;
        const metrics = ctx.measureText(layer.text || '');
        const w = metrics.width + (layer.padding || 8) * 2;
        const h = (layer.fontSize || 32) + (layer.padding || 8) * 2;
        const x = layer.x - (layer.padding || 8);
        const y = layer.y - (layer.fontSize || 32);

        if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
          hit = layer;
          break;
        }
      }
    }

    if (hit) {
      setSelectedLayerId(hit.id);
      setIsDraggingLayer(true);
      setDragOffset({ x: mouseX - hit.x, y: mouseY - hit.y });
    } else {
      setSelectedLayerId(null);
    }
  };

  const moveDrag = (clientX, clientY) => {
    if (!isDraggingLayer || !selectedLayerId) return;
    const { mouseX, mouseY } = getCanvasCoords(clientX, clientY);
    handleUpdateSelectedLayer({
      x: Math.round(mouseX - dragOffset.x),
      y: Math.round(mouseY - dragOffset.y)
    });
  };

  const endDrag = () => {
    setIsDraggingLayer(false);
  };

  const applyCropPreset = (preset) => {
    setAspectRatio(preset);
    if (!imageObj) return;

    let targetW = imageObj.naturalWidth;
    let targetH = imageObj.naturalHeight;

    if (preset === '1:1') {
      const size = Math.min(targetW, targetH);
      targetW = size;
      targetH = size;
    } else if (preset === '16:9') {
      targetH = Math.round(targetW * (9 / 16));
    } else if (preset === '4:3') {
      targetH = Math.round(targetW * (3 / 4));
    } else if (preset === '9:16') {
      targetW = Math.round(targetH * (9 / 16));
    }

    updateImageState(prev => ({
      ...prev,
      crop: {
        x: Math.max(0, Math.round((imageObj.naturalWidth - targetW) / 2)),
        y: Math.max(0, Math.round((imageObj.naturalHeight - targetH) / 2)),
        width: targetW,
        height: targetH,
        aspect: preset
      }
    }), `Applied ${preset} crop`);
  };

  const handleClientDownload = (format = 'image/png') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `image_${Date.now()}.${format === 'image/jpeg' ? 'jpg' : 'png'}`;
    link.href = canvas.toDataURL(format, 0.95);
    link.click();
  };

  const selectedLayer = (imageState?.layers || []).find(l => l.id === selectedLayerId);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden select-none bg-neutral-100">
      {/* Mobile Top View Switcher (Visible on mobile only) */}
      <div className="flex md:hidden bg-white border-b border-neutral-200 p-1">
        <button
          onClick={() => setMobileView('canvas')}
          className={`flex-1 py-1.5 text-xs font-medium rounded ${
            mobileView === 'canvas' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
          }`}
        >
          Canvas View
        </button>
        <button
          onClick={() => setMobileView('tools')}
          className={`flex-1 py-1.5 text-xs font-medium rounded ${
            mobileView === 'tools' ? 'bg-neutral-900 text-white' : 'text-neutral-600'
          }`}
        >
          Tools & Adjustments
        </button>
      </div>

      {/* Control Panel (Left on Desktop, togglable on Mobile) */}
      <div
        className={`${
          mobileView === 'tools' ? 'flex' : 'hidden md:flex'
        } w-full md:w-80 bg-white border-r border-neutral-200 flex-col h-full z-10`}
      >
        {/* Panel Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-2 pt-1 text-xs">
          {[
            { id: 'adjust', label: 'Adjust' },
            { id: 'crop', label: 'Crop' },
            { id: 'text', label: 'Text' },
            { id: 'layers', label: 'Layers' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-center font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-neutral-900 text-neutral-900 font-semibold'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Tab 1: Adjustments */}
          {activeTab === 'adjust' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-neutral-200">
                <span className="font-semibold text-neutral-800 uppercase tracking-wider text-[11px]">
                  Color & Contrast
                </span>
                <button
                  onClick={() => updateImageState(prev => ({
                    ...prev,
                    adjustments: { brightness: 0, contrast: 1.0, saturation: 1.0, blur: 0, grayscale: 0, sepia: 0, invert: 0, vignette: 0 }
                  }), 'Reset adjustments')}
                  className="text-[10px] text-neutral-500 hover:text-neutral-900 flex items-center space-x-1 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {[
                { label: 'Brightness', key: 'brightness', min: -50, max: 50, step: 1, val: imageState?.adjustments?.brightness || 0, unit: '%' },
                { label: 'Contrast', key: 'contrast', min: 0.5, max: 2.0, step: 0.05, val: imageState?.adjustments?.contrast !== undefined ? imageState.adjustments.contrast : 1.0, unit: 'x' },
                { label: 'Saturation', key: 'saturation', min: 0.0, max: 2.5, step: 0.05, val: imageState?.adjustments?.saturation !== undefined ? imageState.adjustments.saturation : 1.0, unit: 'x' },
                { label: 'Vignette', key: 'vignette', min: 0, max: 80, step: 1, val: imageState?.adjustments?.vignette || 0, unit: '%' },
                { label: 'Blur', key: 'blur', min: 0, max: 20, step: 0.5, val: imageState?.adjustments?.blur || 0, unit: 'px' },
                { label: 'Grayscale', key: 'grayscale', min: 0, max: 100, step: 1, val: imageState?.adjustments?.grayscale || 0, unit: '%' },
                { label: 'Sepia', key: 'sepia', min: 0, max: 100, step: 1, val: imageState?.adjustments?.sepia || 0, unit: '%' }
              ].map(item => (
                <div key={item.key} className="space-y-1">
                  <div className="flex justify-between text-neutral-700 text-[11px]">
                    <span>{item.label}</span>
                    <span className="font-mono text-neutral-500">{item.val}{item.unit}</span>
                  </div>
                  <input
                    type="range"
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    value={item.val}
                    onChange={(e) => handleAdjustmentChange(item.key, e.target.value)}
                    className="w-full cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Crop */}
          {activeTab === 'crop' && (
            <div className="space-y-4">
              <div className="font-semibold text-neutral-800 uppercase tracking-wider text-[11px] pb-1 border-b border-neutral-200">
                Aspect Presets
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'free', label: 'Original' },
                  { id: '1:1', label: '1:1 Square' },
                  { id: '16:9', label: '16:9 Wide' },
                  { id: '4:3', label: '4:3 Standard' },
                  { id: '9:16', label: '9:16 Vertical' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => applyCropPreset(p.id)}
                    className={`py-2 px-1 text-center rounded-md border text-[11px] font-medium transition ${
                      imageState?.crop?.aspect === p.id
                        ? 'bg-neutral-900 border-neutral-900 text-white'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-neutral-200 space-y-2">
                <span className="text-neutral-600 text-[11px] block">Dimensions</span>
                <div className="grid grid-cols-2 gap-2 text-neutral-600 font-mono text-[11px]">
                  <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                    W: {Math.round(imageState?.crop?.width || imageObj?.naturalWidth || 0)}px
                  </div>
                  <div className="p-2 bg-neutral-50 rounded border border-neutral-200">
                    H: {Math.round(imageState?.crop?.height || imageObj?.naturalHeight || 0)}px
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Text */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <button
                onClick={handleAddText}
                className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium flex items-center justify-center space-x-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Text Overlay</span>
              </button>

              {selectedLayer ? (
                <div className="space-y-3 pt-2 border-t border-neutral-200">
                  <div className="font-semibold text-neutral-800 uppercase tracking-wider text-[11px]">
                    Edit Selected Text
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-neutral-600">Content</label>
                    <input
                      type="text"
                      value={selectedLayer.text || ''}
                      onChange={(e) => handleUpdateSelectedLayer({ text: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-neutral-600">
                      <span>Font Size</span>
                      <span className="font-mono">{selectedLayer.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="16"
                      max="96"
                      value={selectedLayer.fontSize || 32}
                      onChange={(e) => handleUpdateSelectedLayer({ fontSize: parseInt(e.target.value) })}
                      className="w-full cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-neutral-600 block mb-1">Text Color</label>
                      <input
                        type="color"
                        value={selectedLayer.color || '#ffffff'}
                        onChange={(e) => handleUpdateSelectedLayer({ color: e.target.value })}
                        className="w-full h-8 bg-neutral-50 border border-neutral-300 rounded cursor-pointer p-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-600 block mb-1">Background</label>
                      <input
                        type="color"
                        value={selectedLayer.backgroundColor?.startsWith('#') ? selectedLayer.backgroundColor : '#000000'}
                        onChange={(e) => handleUpdateSelectedLayer({ backgroundColor: e.target.value })}
                        className="w-full h-8 bg-neutral-50 border border-neutral-300 rounded cursor-pointer p-0.5"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteLayer(selectedLayer.id)}
                    className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs transition flex items-center justify-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Layer</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 text-neutral-400 text-[11px]">
                  Tap any text on the canvas to edit its properties.
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Layers */}
          {activeTab === 'layers' && (
            <div className="space-y-3">
              <div className="font-semibold text-neutral-800 uppercase tracking-wider text-[11px] pb-1 border-b border-neutral-200">
                Layer Stack
              </div>

              {(imageState?.layers || []).length === 0 ? (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  No text layers yet. Add one from the Text tab.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(imageState?.layers || []).map(layer => (
                    <div
                      key={layer.id}
                      onClick={() => setSelectedLayerId(layer.id)}
                      className={`p-2 rounded border flex items-center justify-between cursor-pointer transition ${
                        selectedLayerId === layer.id
                          ? 'bg-neutral-100 border-neutral-900 text-neutral-900 font-medium'
                          : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <span className="truncate">{layer.text || 'Text Layer'}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLayer(layer.id);
                        }}
                        className="text-neutral-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center Canvas Viewport */}
      <div
        ref={containerRef}
        className={`${
          mobileView === 'canvas' ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col items-center justify-center p-3 sm:p-6 overflow-auto relative bg-neutral-100 min-h-[300px]`}
      >
        <div className="relative shadow-md rounded-lg overflow-hidden border border-neutral-300/80 bg-white">
          <canvas
            ref={canvasRef}
            onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
            onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
            onMouseUp={endDrag}
            onTouchStart={(e) => {
              if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={(e) => {
              if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={endDrag}
            className="cursor-crosshair block max-w-full max-h-[60vh] md:max-h-[75vh] object-contain"
          />
        </div>

        {/* Floating Action Bar */}
        <div className="mt-4 bg-white/95 backdrop-blur border border-neutral-200 px-4 py-2 rounded-full shadow-md flex items-center space-x-3 text-xs">
          <button
            onClick={() => handleClientDownload('image/png')}
            className="flex items-center space-x-1.5 text-neutral-800 hover:text-neutral-950 font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
          <span className="text-neutral-300">|</span>
          <button
            onClick={exportImageFFmpeg}
            className="flex items-center space-x-1.5 text-neutral-800 hover:text-neutral-950 font-medium transition"
          >
            <span>FFmpeg Export</span>
          </button>
        </div>
      </div>
    </div>
  );
}
