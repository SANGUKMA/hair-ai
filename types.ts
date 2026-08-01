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

export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'long' | 'diamond';

// 퍼스널 컬러 4계절 분류. 12세부 진단은 통제된 조명에서나 의미가 있어서,
// 폰으로 찍은 사진 한 장으로 판단하는 이 앱에서는 4분류까지만 다룬다.
export type PersonalColor = 'spring-warm' | 'summer-cool' | 'autumn-warm' | 'winter-cool';

export interface StyleRecommendation {
  styleId: string;
  reason: string;        // 이 스타일이 어울리는 이유 (한국어 한 문장)
}

export interface ColorRecommendation {
  colorId: string;
  reason: string;        // 이 컬러가 어울리는 이유 (한국어 한 문장)
}

export interface RecommendResult {
  faceShape: FaceShape | null;
  faceNote: string;      // 얼굴형/특징 요약 (한국어 한 문장)
  recommendations: StyleRecommendation[];
  personalColor: PersonalColor | null;
  colorNote: string;     // 퍼스널 컬러 진단 요약 (한국어 한 문장)
  colorRecommendations: ColorRecommendation[];
}
