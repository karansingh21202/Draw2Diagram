import React from 'react';

// FIX: Define and export all necessary types for the application.
export interface Point {
  x: number;
  y: number;
}

export type Tool = 'select' | 'pen' | 'line' | 'rectangle' | 'circle' | 'pan' | 'eraser' | 'text';

export interface ElementStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize?: number;
}

interface BaseElement {
  id: number;
  style: ElementStyle;
  isMap?: boolean;
}

export interface PenElement extends BaseElement {
  type: 'pen';
  points: Point[];
}
export interface LineElement extends BaseElement {
  type: 'line';
  points: Point[];
  startElementId?: number | null;
  endElementId?: number | null;
}
export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  points: Point[];
}
export interface CircleElement extends BaseElement {
  type: 'circle';
  points: Point[];
}
export interface PathElement extends BaseElement {
    type: 'path';
    points: Point[]; // Usually empty for path type
    pathData: string;
    bounds: { minX: number, minY: number, maxX: number, maxY: number };
}
export interface TextElement extends BaseElement {
    type: 'text';
    points: Point[];
    text: string;
}
export interface RasterElement extends BaseElement {
    type: 'raster';
    imageUrl: string;
    bounds: { minX: number, minY: number, maxX: number, maxY: number };
    sourceStrokeColor: string;
}

export type Element = PenElement | LineElement | RectangleElement | CircleElement | PathElement | TextElement | RasterElement;


export interface ChatMessage {
  sender: 'user' | 'ai';
  type: 'text' | 'code';
  text: string;
  language?: string;
}

export type Domain = 'general' | 'flowchart' | 'circuit' | 'cloud' | 'uml' | 'map';

export type MapDetailLevel = 'low' | 'medium' | 'high';

export type Theme = 'light' | 'dark';

export type GenerationMode = 'chat' | 'code' | 'image';

export type ImageGenerationStyle = 'match' | 'generate';