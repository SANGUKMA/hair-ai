// 회원 코드를 발급한다.
//   node generate-member-codes.mjs 50
// 결과는 member-codes.local (gitignore 대상)에 저장된다. 저장소가 공개이므로
// 생성된 코드는 절대 커밋하지 말 것. Vercel 환경변수 MEMBER_CODES로만 넣는다.
import { randomInt } from 'crypto';
import { writeFile } from 'fs/promises';

// 헷갈리는 글자(0/O, 1/I/L)는 뺐다. 전화나 종이로 불러주는 상황을 고려한 것.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const OUT_FILE = 'member-codes.local';

const count = Number(process.argv[2]) || 20;
if (!Number.isInteger(count) || count < 1 || count > 2000) {
  console.error('발급 수량은 1~2000 사이의 정수여야 합니다.');
  process.exit(1);
}

const block = (n) =>
  Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

const codes = new Set();
while (codes.size < count) codes.add(`HF-${block(4)}-${block(4)}`);

const list = [...codes];
await writeFile(
  OUT_FILE,
  [
    '# HairFit AI 회원 코드',
    '# 이 파일은 커밋하지 마세요. 코드와 회원 이름의 연결은 별도 명단에서 관리하세요.',
    '',
    '## 회원에게 나눠줄 코드',
    ...list.map((c, i) => `${String(i + 1).padStart(3, ' ')}. ${c}`),
    '',
    '## Vercel 환경변수 MEMBER_CODES 에 넣을 값 (아래 한 줄 전체)',
    list.join(','),
    '',
  ].join('\n'),
  'utf8'
);

console.log(`${list.length}개 발급 완료 -> ${OUT_FILE}`);
console.log('이 파일을 열어 코드를 배포하고, 마지막 줄을 MEMBER_CODES 환경변수에 넣으세요.');
