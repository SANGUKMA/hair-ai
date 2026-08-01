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

// 모발·두상 특성. 근거가 정면 사진 한 장뿐이라 여기서 읽어낼 수 있는 것만 다룬다.
// 뒤통수 납작함은 미용에서 중요하지만 정면에서는 보이지 않아 제외했다 — 물으면 지어낸다.
export type HairThickness = 'fine' | 'medium' | 'thick';   // 한 가닥의 굵기
export type HairDensity = 'sparse' | 'medium' | 'dense';   // 숱(모량)
export type HairTexture = 'straight' | 'wavy' | 'curly';   // 곱슬기
export type CrownVolume = 'flat' | 'medium' | 'full';      // 정수리 볼륨

// 추천 단계에서 진단한 값을 생성 단계로 그대로 넘겨 시뮬레이션에 반영한다.
export interface HairDiagnosis {
  faceShape: FaceShape | null;
  hairThickness: HairThickness | null;
  hairDensity: HairDensity | null;
  hairTexture: HairTexture | null;
  crownVolume: CrownVolume | null;
}

export interface StyleRecommendation {
  styleId: string;
  reason: string;        // 이 스타일이 어울리는 이유 (한국어 한 문장)
}

// 사진에 나오지 않는 정보. 아무리 잘 어울려도 아침에 손질할 시간이 없으면 못 쓰는
// 커트이고, 기르는 중인 사람에게 짧은 머리를 권하면 추천 자체가 무의미하다.
// 기본값은 전부 'any'라, 답하지 않으면 지금까지와 똑같이 동작한다.
export type StylingTime = 'quick' | 'some' | 'any';
export type LengthPlan = 'growing' | 'shorter' | 'any';
export type Formality = 'tidy' | 'free' | 'any';

export interface ConsultAnswers {
  stylingTime: StylingTime;
  lengthPlan: LengthPlan;
  formality: Formality;
}

export const NO_CONSULT: ConsultAnswers = {
  stylingTime: 'any',
  lengthPlan: 'any',
  formality: 'any',
};

export const sameConsult = (a: ConsultAnswers, b: ConsultAnswers): boolean =>
  a.stylingTime === b.stylingTime && a.lengthPlan === b.lengthPlan && a.formality === b.formality;

export type FringeAdjustment = 'keep' | 'add' | 'remove';

// 결과를 보고 누르는 미세조정. 자유 입력이 아니라 고정된 축으로 받는다 —
// 프롬프트에 임의 문장이 섞이지 않고, 같은 버튼을 두 번 눌러 강도를 올릴 수 있다.
export interface StyleAdjustments {
  length: number;   // -2..2, 음수가 짧게
  volume: number;   // -2..2, 양수가 볼륨 많게
  curl: number;     // -2..2, 펌에만 적용
  fringe: FringeAdjustment;
}

export const ADJUSTMENT_LIMIT = 2;

export const NO_ADJUSTMENTS: StyleAdjustments = {
  length: 0,
  volume: 0,
  curl: 0,
  fringe: 'keep',
};

export const isAdjusted = (a: StyleAdjustments): boolean =>
  a.length !== 0 || a.volume !== 0 || a.curl !== 0 || a.fringe !== 'keep';

export const sameAdjustments = (a: StyleAdjustments, b: StyleAdjustments): boolean =>
  a.length === b.length && a.volume === b.volume && a.curl === b.curl && a.fringe === b.fringe;

export interface ColorRecommendation {
  colorId: string;
  reason: string;        // 이 컬러가 어울리는 이유 (한국어 한 문장)
}

export interface RecommendResult extends HairDiagnosis {
  faceNote: string;      // 얼굴형/특징 요약 (한국어 한 문장)
  hairNote: string;      // 모발/두상 소견 (한국어 한 문장)
  recommendations: StyleRecommendation[];
  personalColor: PersonalColor | null;
  colorNote: string;     // 퍼스널 컬러 진단 요약 (한국어 한 문장)
  colorRecommendations: ColorRecommendation[];
}
