export interface Folder {
  id: string;
  name: string;
}

export interface Card {
  id: string;
  folderId: string;
  title: string;
  content: string;
  tags: string[];
  color: string;
  rotation: number;
  stickers: string[];
  isPinned: boolean;
  updatedAt: number;
  width?: number;
  height?: number;
  isMinimized?: boolean;
}

export const CARD_COLORS = ['#fff9c4', '#e1bee7', '#c8e6c9', '#bbdefb', '#ffccbc'];
export const CARD_COLORS_AI = ['#e1bee7', '#b2dfdb', '#ffecb3'];
export const CARD_PALETTE = ['#fff9c4', '#e1bee7', '#c8e6c9', '#bbdefb', '#ffccbc', '#ffffff', '#ffab91'];
