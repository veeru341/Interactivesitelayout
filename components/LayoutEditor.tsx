import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DrawingTool, DrawingPoint, Shape } from '../types';
import { PencilIcon, SquareIcon, RectangleIcon, EraserIcon, RoadIcon, TreeIcon, SelectIcon } from './icons';

interface CompactLayoutEditorProps {
  backgroundImage?: string;
  onSave?: (layoutData: { shapes: Shape[]; drawingPoints: DrawingPoint[] }) => void;
  onClose: () => void;
}

const CompactLayoutEditor: React.FC<CompactLayoutEditorProps> = ({ backgroundImage, onSave, onClose }) => {
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
          width: 30,
          height: 30,
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
          width: 50,
          height: 25,
          rotation: 0,
          color: '#6b7280',
          isSelected: false
        };
        setShapes(prev => [...prev, rectangle]);
        break;
      
      case DrawingTool.Road:
        const road: Shape = {
          id: generateId(),
          type: 'road',
          x,
          y,
          width: 60,
          height: 12,
          rotation: 0,
          color: '#374151',
          isSelected: false
        };
        setShapes(prev => [...prev, road]);
        break;
      
      case DrawingTool.Tree:
        const tree: Shape = {
          id: generateId(),
          type: 'tree',
          x,
          y,
          width: 20,
          height: 25,
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

  const handleEraser = (shapeId: string) => {
    setShapes(prev => prev.filter(shape => shape.id !== shapeId));
    setSelectedShapeId(null);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({ shapes, drawingPoints });
    }
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
      
      case 'road':
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
              border: isSelected ? '2px solid #3b82f6' : '1px solid #1f2937',
              cursor: currentTool === DrawingTool.Select ? 'move' : 'default',
              transform: `rotate(${shape.rotation}deg)`,
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 3px, #6b7280 3px, #6b7280 6px)',
            }}
            onMouseDown={(e) => handleMouseDown(e, shape.id)}
          />
        );
      
      case 'tree':
        return (
          <div
            key={shape.id}
            style={{
              position: 'absolute',
              left: shape.x,
              top: shape.y,
              width: shape.width,
              height: shape.height,
              cursor: currentTool === DrawingTool.Select ? 'move' : 'default',
              transform: `rotate(${shape.rotation}deg)`,
            }}
            onMouseDown={(e) => handleMouseDown(e, shape.id)}
          >
            <div
              style={{
                width: '100%',
                height: '60%',
                backgroundColor: '#059669',
                borderRadius: '50% 50% 0 0',
                border: isSelected ? '2px solid #3b82f6' : 'none',
              }}
            />
            <div
              style={{
                width: '20%',
                height: '40%',
                backgroundColor: '#92400e',
                margin: '0 auto',
                border: isSelected ? '2px solid #3b82f6' : 'none',
              }}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  const ToolButton = ({ tool, icon, label }: { tool: DrawingTool; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => setCurrentTool(tool)}
      className={`flex items-center space-x-1 p-1 rounded text-xs ${
        currentTool === tool 
          ? 'bg-blue-600 text-white' 
          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
      }`}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Tools */}
      <div className="grid grid-cols-3 gap-1">
        <ToolButton tool={DrawingTool.Select} icon={<SelectIcon className="w-3 h-3" />} label="Select" />
        <ToolButton tool={DrawingTool.Pencil} icon={<PencilIcon className="w-3 h-3" />} label="Pencil" />
        <ToolButton tool={DrawingTool.Square} icon={<SquareIcon className="w-3 h-3" />} label="Square" />
        <ToolButton tool={DrawingTool.Rectangle} icon={<RectangleIcon className="w-3 h-3" />} label="Rect" />
        <ToolButton tool={DrawingTool.Road} icon={<RoadIcon className="w-3 h-3" />} label="Road" />
        <ToolButton tool={DrawingTool.Tree} icon={<TreeIcon className="w-3 h-3" />} label="Tree" />
          </div>

      {/* Canvas */}
      <div className="relative">
        <div
          ref={canvasRef}
          className="w-full h-32 bg-slate-300 dark:bg-slate-600 relative cursor-crosshair border border-slate-400"
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
                left: point.x - 2,
                top: point.y - 2,
                width: 4,
                height: 4,
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                border: '1px solid white',
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
                strokeWidth="1"
              />
            </svg>
          )}

          {/* Shapes */}
          {shapes.map(renderShape)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        {selectedShapeId && (
          <button
            onClick={() => handleEraser(selectedShapeId)}
            className="flex-1 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
          >
            Delete
          </button>
        )}
        <button
          onClick={handleSave}
          className="flex-1 bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700"
        >
          Close
              </button>
            </div>
    </div>
  );
};

export default CompactLayoutEditor;