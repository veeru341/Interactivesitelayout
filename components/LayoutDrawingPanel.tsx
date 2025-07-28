import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DrawingTool, DrawingPoint, Shape } from '../types';
import { PencilIcon, SquareIcon, RectangleIcon, EraserIcon, SelectIcon, SaveIcon, ClearIcon } from './icons';

interface LayoutDrawingPanelProps {
  backgroundImage?: string;
  onSave: (layout: { shapes: Shape[]; drawingPoints: DrawingPoint[] }) => void;
  onClose: () => void;
  isVisible: boolean;
}

const LayoutDrawingPanel: React.FC<LayoutDrawingPanelProps> = ({ 
  backgroundImage, 
  onSave, 
  onClose, 
  isVisible 
}) => {
  const [currentTool, setCurrentTool] = useState<DrawingTool>(DrawingTool.Select);
  const [drawingPoints, setDrawingPoints] = useState<DrawingPoint[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    switch (currentTool) {
      case DrawingTool.Pencil:
        const newPoint: DrawingPoint = { x, y, id: generateId() };
        setDrawingPoints(prev => [...prev, newPoint]);
        break;
      
      case DrawingTool.Square:
        const square: Shape = {
          id: generateId(),
          type: 'square',
          x,
          y,
          width: 40,
          height: 40,
          rotation: 0,
          color: '#6b7280',
          isSelected: false
        };
        setShapes(prev => [...prev, square]);
        break;
      
      case DrawingTool.Rectangle:
        const rectangle: Shape = {
          id: generateId(),
          type: 'rectangle',
          x,
          y,
          width: 80,
          height: 40,
          rotation: 0,
          color: '#6b7280',
          isSelected: false
        };
        setShapes(prev => [...prev, rectangle]);
        break;
      
      case DrawingTool.Select:
        const clickedShape = shapes.find(shape => 
          x >= shape.x && x <= shape.x + shape.width &&
          y >= shape.y && y <= shape.y + shape.height
        );
        setSelectedShapeId(clickedShape?.id || null);
        setShapes(prev => prev.map(shape => ({
          ...shape,
          isSelected: shape.id === clickedShape?.id
        })));
        break;
    }
  };

  const handleMouseDown = (e: React.MouseEvent, shapeId: string) => {
    if (currentTool !== DrawingTool.Select) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x, y });
    setSelectedShapeId(shapeId);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStart || !selectedShapeId || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    
    setShapes(prev => prev.map(shape => 
      shape.id === selectedShapeId 
        ? { ...shape, x: shape.x + deltaX, y: shape.y + deltaY }
        : shape
    ));
    
    setDragStart({ x, y });
  }, [isDragging, dragStart, selectedShapeId]);

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove]);

  const handleSave = () => {
    onSave({
      shapes,
      drawingPoints
    });
  };

  const handleClear = () => {
    setDrawingPoints([]);
    setShapes([]);
    setSelectedShapeId(null);
  };

  const handleEraser = (shapeId: string) => {
    setShapes(prev => prev.filter(shape => shape.id !== shapeId));
    setSelectedShapeId(null);
  };

  const renderShape = (shape: Shape) => {
    const isSelected = shape.id === selectedShapeId;
    
    switch (shape.type) {
      case 'square':
      case 'rectangle':
        return (
          <div
            key={shape.id}
            style={{
              position: 'absolute',
              left: shape.x,
              top: shape.y,
              width: shape.width,
              height: shape.height,
              backgroundColor: shape.color,
              border: isSelected ? '2px solid #3b82f6' : '1px solid #374151',
              cursor: currentTool === DrawingTool.Select ? 'move' : 'default',
              transform: `rotate(${shape.rotation}deg)`,
            }}
            onMouseDown={(e) => handleMouseDown(e, shape.id)}
          />
        );
      
      default:
        return null;
    }
  };

  const ToolButton = ({ tool, icon, label }: { tool: DrawingTool; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => setCurrentTool(tool)}
      className={`flex items-center space-x-2 p-2 rounded ${
        currentTool === tool 
          ? 'bg-blue-600 text-white' 
          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
      }`}
      title={label}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  );

  if (!isVisible) return null;

  return (
    <div className="w-full h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Layout Drawing</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Drawing Tools */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Drawing Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          <ToolButton tool={DrawingTool.Select} icon={<SelectIcon className="w-4 h-4" />} label="Select" />
          <ToolButton tool={DrawingTool.Pencil} icon={<PencilIcon className="w-4 h-4" />} label="Pencil" />
          <ToolButton tool={DrawingTool.Square} icon={<SquareIcon className="w-4 h-4" />} label="Square" />
          <ToolButton tool={DrawingTool.Rectangle} icon={<RectangleIcon className="w-4 h-4" />} label="Rectangle" />
        </div>
      </div>

      {/* Canvas */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Drawing Canvas</h3>
        <div className="relative">
          <div
            ref={canvasRef}
            className="w-full h-64 bg-slate-300 dark:bg-slate-600 relative cursor-crosshair border border-slate-400 rounded"
            onClick={handleCanvasClick}
            style={{
              backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
          >
            {/* Drawing Points */}
            {drawingPoints.map((point) => (
              <div
                key={point.id}
                style={{
                  position: 'absolute',
                  left: point.x - 3,
                  top: point.y - 3,
                  width: 6,
                  height: 6,
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%',
                  border: '2px solid white',
                }}
              />
            ))}

            {/* Drawing Lines */}
            {drawingPoints.length > 1 && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                <polyline
                  points={drawingPoints.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
              </svg>
            )}

            {/* Shapes */}
            {shapes.map(renderShape)}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
        {selectedShapeId && (
          <button
            onClick={() => handleEraser(selectedShapeId)}
            className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700"
          >
            Delete Selected Shape
          </button>
        )}
        
        <div className="flex space-x-2">
          <button
            onClick={handleClear}
            className="flex-1 bg-gray-600 text-white p-2 rounded hover:bg-gray-700"
          >
            <ClearIcon className="w-4 h-4 inline mr-1" />
            Clear All
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700"
          >
            <SaveIcon className="w-4 h-4 inline mr-1" />
            Save Layout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayoutDrawingPanel; 