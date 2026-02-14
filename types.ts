export enum AppStep {
  HOME = 'HOME',
  SELECT_STYLE = 'SELECT_STYLE',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT'
}

export type Gender = 'female' | 'male';

export type StyleCategory = 'cut' | 'perm';

export interface HairStyle {
  id: string;
  name: string;
  nameKo: string;
  description: string;
  gender: Gender;
  category: StyleCategory;
  imagePath: string;
  tags: string[];
}

export interface HairColor {
  id: string;
  name: string;
  nameKo: string;
  colorHex: string;        // 메인 색상 (UI 표시용)
  colorHexSecond?: string;  // 그라데이션 두 번째 색상 (선택)
  description: string;      // AI에 전달할 색상 상세 설명
  category: 'natural' | 'brown' | 'ash' | 'vivid' | 'highlight';
}

export interface GeneratedImageResult {
  originalImage: string;
  generatedImage: string;
}
