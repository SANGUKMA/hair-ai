import type { HairStyle } from '../types';
import data from './hairstyles.json';

// 실제 데이터는 hairstyles.json에 있다. 서버리스 함수(api/generate.ts)가
// 같은 파일을 런타임에 직접 읽으므로 클라이언트와 단일 원본을 공유한다.
export const hairstyles = data as HairStyle[];
