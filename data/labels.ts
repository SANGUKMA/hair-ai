import type {
  CrownVolume,
  FaceShape,
  Formality,
  HairDensity,
  HairTexture,
  HairThickness,
  LengthPlan,
  PersonalColor,
  StylingTime,
} from '../types';

// 진단 결과를 화면과 리포트가 같은 말로 부르도록 한곳에 모은다.
// 여기서 갈라지면 화면에는 "봄 웜톤", 리포트에는 다른 말이 찍히게 된다.

export const FACE_SHAPE_LABEL: Record<FaceShape, string> = {
  oval: '계란형',
  round: '둥근형',
  square: '각진형',
  heart: '하트형',
  long: '긴 얼굴형',
  diamond: '다이아몬드형',
};

export const PERSONAL_COLOR_LABEL: Record<PersonalColor, string> = {
  'spring-warm': '봄 웜톤',
  'summer-cool': '여름 쿨톤',
  'autumn-warm': '가을 웜톤',
  'winter-cool': '겨울 쿨톤',
};

export const HAIR_THICKNESS_LABEL: Record<HairThickness, string> = {
  fine: '가는 모발',
  medium: '보통 굵기',
  thick: '굵은 모발',
};

export const HAIR_DENSITY_LABEL: Record<HairDensity, string> = {
  sparse: '숱 적은 편',
  medium: '숱 보통',
  dense: '숱 많은 편',
};

export const HAIR_TEXTURE_LABEL: Record<HairTexture, string> = {
  straight: '직모',
  wavy: '반곱슬',
  curly: '곱슬',
};

export const CROWN_VOLUME_LABEL: Record<CrownVolume, string> = {
  flat: '정수리 볼륨 낮음',
  medium: '정수리 볼륨 보통',
  full: '정수리 볼륨 좋음',
};

// 상담 답변. 'any'는 리포트에 적지 않으므로 라벨도 두지 않는다.
export const STYLING_TIME_LABEL: Record<Exclude<StylingTime, 'any'>, string> = {
  quick: '아침 손질 5분 이내',
  some: '아침 손질 10분 정도',
};

export const LENGTH_PLAN_LABEL: Record<Exclude<LengthPlan, 'any'>, string> = {
  growing: '머리를 기르는 중',
  shorter: '짧아져도 괜찮음',
};

export const FORMALITY_LABEL: Record<Exclude<Formality, 'any'>, string> = {
  tidy: '단정한 분위기 필요',
  free: '자유로운 분위기',
};
