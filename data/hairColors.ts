import type { HairColor } from '../types';
import data from './hairColors.json';

// 실제 데이터는 hairColors.json에 있다. api/generate.ts와 단일 원본을 공유한다.
export const hairColors = data as HairColor[];

export const colorCategories = [
  { id: 'natural', label: '내추럴' },
  { id: 'brown', label: '브라운' },
  { id: 'ash', label: '애쉬' },
  { id: 'vivid', label: '비비드' },
  { id: 'highlight', label: '하이라이트' },
] as const;
