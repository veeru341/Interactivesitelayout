import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DrawingTool, DrawingPoint, Shape } from '../types';
import { PencilIcon, SquareIcon, RectangleIcon, EraserIcon, RoadIcon, TreeIcon, SelectIcon, SaveIcon, ClearIcon } from './icons';

interface DrawingToolsPanelProps {
  onSave?: (layoutData: { shapes: Shape[]; drawingPoints: DrawingPoint[] }) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const DrawingToolsPanel: React.FC<DrawingToolsPanelProps> = ({ 
  onSave, 
  isVisible,
  onToggleVisibility
}) => {
  const [currentTool, setCurrentTool] = useState<DrawingTool>(DrawingTool.Select);
  const [drawingPoints, setDrawingPoints] = useState<DrawingPoint[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

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
          x: x - 25,
          y: y - 25,
          width: 50,
          height: 50,
          rotation: 0,
          color: '#3b82f6',
          isSelected: false
        };
        setShapes(prev => [...prev, square]);
        break;
      
      case DrawingTool.Rectangle:
        const rectangle: Shape = {
          id: generateId(),
          type: 'rectangle',
          x: x - 40,
          y: y - 20,
          width: 80,
          height: 40,
          rotation: 0,
          color: '#10b981',
          isSelected: false
        };
        setShapes(prev => [...prev, rectangle]);
        break;
      
      case DrawingTool.Road:
        const road: Shape = {
          id: generateId(),
          type: 'road',
          x: x - 50,
          y: y - 8,
          width: 100,
          height: 16,
          rotation: 0,
          color: '#6b7280',
          isSelected: false
        };
        setShapes(prev => [...prev, road]);
        break;
      
      case DrawingTool.Tree:
        const tree: Shape = {
          id: generateId(),
          type: 'tree',
          x: x - 15,
          y: y - 20,
          width: 30,
          height: 40,
          rotation: 0,
          color: '#059669',
          isSelected: false
        };
        setShapes(prev => [...prev, tree]);
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

  const handleMouseDown = (e: React.MouseEvent, shapeId: string, isResize = false) => {
    if (currentTool !== DrawingTool.Select) return;
    
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    if (isResize) {
      setIsResizing(true);
      setResizeStart({ x, y, width: shape.width, height: shape.height });
    } else {
      setIsDragging(true);
      setDragStart({ x: x - shape.x, y: y - shape.y });
    }
    
    setSelectedShapeId(shapeId);
    setShapes(prev => prev.map(s => ({ ...s, isSelected: s.id === shapeId })));
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && dragStart && selectedShapeId) {
      const newX = x - dragStart.x;
      const newY = y - dragStart.y;
      
      setShapes(prev => prev.map(shape => 
        shape.id === selectedShapeId 
          ? { ...shape, x: Math.max(0, newX), y: Math.max(0, newY) }
          : shape
      ));
    }

    if (isResizing && resizeStart && selectedShapeId) {
      const deltaX = x - resizeStart.x;
      const deltaY = y - resizeStart.y;
      const newWidth = Math.max(20, resizeStart.width + deltaX);
      const newHeight = Math.max(20, resizeStart.height + deltaY);
      
      setShapes(prev => prev.map(shape => 
        shape.id === selectedShapeId 
          ? { ...shape, width: newWidth, height: newHeight }
          : shape
      ));
    }
  }, [isDragging, isResizing, dragStart, resizeStart, selectedShapeId]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setDragStart(null);
    setResizeStart(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleEraser = () => {
    if (selectedShapeId) {
      setShapes(prev => prev.filter(shape => shape.id !== selectedShapeId));
      setSelectedShapeId(null);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ shapes, drawingPoints });
    }
  };

  const handleClear = () => {
    setDrawingPoints([]);
    setShapes([]);
    setSelectedShapeId(null);
  };

  const renderShape = (shape: Shape) => {
    const isSelected = shape.id === selectedShapeId;
    
    const baseStyle = {
      position: 'absolute' as const,
      left: shape.x,
      top: shape.y,
      width: shape.width,
      height: shape.height,
      cursor: currentTool === DrawingTool.Select ? 'move' : 'default',
      transform: `rotate(${shape.rotation}deg)`,
      border: isSelected ? '2px solid #3b82f6' : '1px solid #374151',
      userSelect: 'none' as const,
    };

    switch (shape.type) {
      case 'square':
      case 'rectangle':
        return (
          <div
            key={shape.id}
            style={{
              ...baseStyle,
              backgroundColor: shape.color,
            }}
            onMouseDown={(e) => handleMouseDown(e, shape.id)}
          >
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  right: -4,
                  bottom: -4,
                  width: 8,
                  height: 8,
                  backgroundColor: '#3b82f6',
                  cursor: 'nw-resize',
                  border: '1px solid white',
                }}
                onMouseDown={(e) => handleMouseDown(e, shape.id, true)}
              />
            )}
          </div>
        );
      
      case 'road':
        return (
          <div
            key={shape.id}
            style={{
              ...baseStyle,
              backgroundColor: shape.color,
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, #ffffff 8px, #ffffff 12px)',
            }}
            onMouseDown={(e) => handleMouseDown(e, shape.id)}
          >
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  right: -4,
                  bottom: -4,
                  width: 8,
                  height: 8,
                  backgroundColor: '#3b82f6',
                  cursor: 'nw-resize',
                  border: '1px solid white',
                }}
                onMouseDown={(e) => handleMouseDown(e, shape.id, true)}
              />
            )}
          </div>
        );
      
      case 'tree':
        return (
          <div
            key={shape.id}
            style={{
              ...baseStyle,
              cursor: currentTool === DrawingTool.Select ? 'move' : 'default',
            }}
            onMouseDown={(e) => handleMouseDown(e, shape.id)}
          >
            {/* Tree crown */}
            <div
              style={{
                width: '100%',
                height: '70%',
                backgroundColor: '#059669',
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                position: 'relative',
              }}
            />
            {/* Tree trunk */}
            <div
              style={{
                width: '25%',
                height: '30%',
                backgroundColor: '#92400e',
                margin: '0 auto',
                position: 'relative',
                top: '-5px',
              }}
            />
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  right: -4,
                  bottom: -4,
                  width: 8,
                  height: 8,
                  backgroundColor: '#3b82f6',
                  cursor: 'nw-resize',
                  border: '1px solid white',
                }}
                onMouseDown={(e) => handleMouseDown(e, shape.id, true)}
              />
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  const ToolButton = ({ tool, icon, label, isActive }: { 
    tool: DrawingTool; 
    icon: React.ReactNode; 
    label: string;
    isActive?: boolean;
  }) => (
    <button
      onClick={() => setCurrentTool(tool)}
      className={`flex items-center space-x-2 p-3 rounded-lg transition-all duration-200 ${
        currentTool === tool || isActive
          ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-md hover:shadow-lg'
      }`}
      title={label}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed top-20 left-4 z-[1000] bg-blue-600 text-white p-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        title="Show Drawing Tools"
      >
        <PencilIcon className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed top-20 left-4 z-[1000] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-4 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Drawing Tools</h3>
        <button
          onClick={onToggleVisibility}
          className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <ToolButton tool={DrawingTool.Select} icon={<SelectIcon className="w-5 h-5" />} label="Select" />
        <ToolButton tool={DrawingTool.Pencil} icon={<PencilIcon className="w-5 h-5" />} label="Pencil" />
        <ToolButton tool={DrawingTool.Square} icon={<SquareIcon className="w-5 h-5" />} label="Sub-Flat" />
        <ToolButton tool={DrawingTool.Rectangle} icon={<RectangleIcon className="w-5 h-5" />} label="Rectangle" />
        <ToolButton tool={DrawingTool.Road} icon={<RoadIcon className="w-5 h-5" />} label="Road" />
        <ToolButton tool={DrawingTool.Tree} icon={<TreeIcon className="w-5 h-5" />} label="Tree" />
      </div>

      {/* Canvas */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Drawing Canvas</h4>
        <div
          ref={canvasRef}
          className="w-full h-48 bg-slate-100 dark:bg-slate-600 relative cursor-crosshair border-2 border-dashed border-slate-300 dark:border-slate-500 rounded-lg overflow-hidden"
          onClick={handleCanvasClick}
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
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
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
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}

          {/* Shapes */}
          {shapes.map(renderShape)}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {selectedShapeId && currentTool === DrawingTool.Eraser && (
          <button
            onClick={handleEraser}
            className="w-full bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center space-x-2"
          >
            <EraserIcon className="w-4 h-4" />
            <span>Delete Selected</span>
          </button>
        )}
        
        <div className="flex space-x-2">
          <button
            onClick={handleClear}
            className="flex-1 bg-gray-600 text-white p-2 rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center space-x-1"
          >
            <ClearIcon className="w-4 h-4" />
            <span>Clear</span>
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-1"
          >
            <SaveIcon className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Instructions:</strong> Select a tool and click on the canvas to create elements. 
          Use Select tool to move and resize shapes. Roads and trees can be placed for layout planning.
        </p>
      </div>
    </div>
  );
};

export default DrawingToolsPanel;