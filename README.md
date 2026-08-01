# HairFit AI

회원 전용 헤어 시뮬레이션. 사진 한 장으로 얼굴형·모발·퍼스널 컬러를 진단하고, 어울리는
스타일과 염색 컬러를 추천한 뒤, 바뀐 모습을 실제로 만들어 보여준다.

- 모바일 우선 PWA(홈 화면 설치 지원)
- 회원 코드로 접근 제한, Vercel 서버리스 함수 경유
- 이미지 생성·분석은 Gemini API

## 로컬 실행

```bash
npm install
cp .env.local.example .env.local   # 없으면 아래 표를 보고 직접 만든다
npm run dev                        # http://localhost:3000
npm run typecheck                  # tsc --noEmit
npm run build
```

`.env.local`은 커밋되지 않는다. dev 서버는 `vite.config.ts`의 미들웨어로 `/api/generate`를
배포와 동일하게 태우므로, 로컬에서도 실제 API가 호출된다(비용이 나간다).

## 환경변수

Vercel 프로젝트 설정과 `.env.local`에 같은 이름으로 넣는다. 전부 **서버 전용**이며 클라이언트
번들에는 절대 주입되지 않는다.

| 이름 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `GEMINI_API_KEY` | ✅ | — | Gemini API 키 |
| `MEMBER_CODES` | ✅ | — | 쉼표로 구분한 회원 코드 목록. 비어 있으면 **모든 요청을 거부한다** |
| `GEMINI_IMAGE_MODEL` | | `gemini-2.5-flash-image` | 헤어 생성 모델 |
| `GEMINI_TEXT_MODEL` | | `gemini-3.6-flash` | 진단·추천 모델 |
| `IDENTITY_MODEL` | | `gemini-3.1-pro-preview` | 동일인 판정 모델. flash 계열은 같은 성별·연령대의 다른 얼굴을 통과시키므로 낮추지 말 것 |
| `IDENTITY_CHECK` | | (켜짐) | `off`로 두면 동일인 검증을 건너뛴다. 세션당 약 30% 비용과 8초를 아끼는 대신 품질 하한이 사라진다 |
| `RETOUCH_LEVEL` | | `medium` | 피부 보정 강도: `subtle` / `medium` / `strong` |
| `STUDIO_BACKGROUND` | | (켜짐) | 결과 사진의 배경을 깔끔한 스튜디오 배경으로 교체한다. `off`면 회원이 찍은 배경을 그대로 살린다 |
| `DAILY_LIMIT_PER_CODE` | | `20` | 코드별 하루 **생성** 횟수 |
| `DAILY_RECOMMEND_LIMIT` | | 생성 한도 × 2 | 코드별 하루 추천 횟수. 추천은 사진을 올리면 자동으로 돌기 때문에 생성과 따로 센다 |

### 살롱 정보

**원장님이 앱에서 직접 입력한다.** 헤더의 톱니 아이콘 → "우리 살롱 정보"에서 살롱 이름·전화·
카카오 채널을 넣으면 그 기기에 저장되고, 그 기기에서 만드는 모든 리포트에 들어간다. 회원 코드와
같은 방침으로 서버에는 보내지 않는다. 원장님마다 살롱이 다르기 때문에 이렇게 둔다.

아래 환경변수는 **기본값**이다. 한 살롱 전용으로 배포한다면 이 값을 넣어두면 원장님이 아무것도
입력하지 않아도 리포트에 살롱 이름이 들어간다. 앱에서 입력한 값이 항상 우선한다.

**`VITE_` 로 시작하는 값은 위 표와 달리 클라이언트 번들에 포함된다** — 리포트에 찍혀 공유되는
것이 목적인 공개 정보만 넣을 것.

| 이름 | 기본값 | 설명 |
|---|---|---|
| `VITE_SALON_NAME` | `HairFit AI` | 살롱 이름. 리포트 맨 위와 꼬리말에 들어간다 |
| `VITE_SALON_PHONE` | (없음) | 전화번호 |
| `VITE_SALON_KAKAO` | (없음) | 카카오톡 채널 아이디나 주소 |
| `VITE_SALON_TAGLINE` | `회원 전용 헤어 시뮬레이션` | 꼬리말 한 줄 소개 |

전화번호와 카카오는 넣은 것만 가운뎃점으로 이어 붙는다. 값을 바꾸면 **다시 빌드해야**
반영된다(런타임이 아니라 빌드 시점에 들어간다).

## 회원 코드

코드는 저장소에 두지 않는다. 이 저장소는 공개라 커밋하면 그대로 유출된다.

```bash
node generate-member-codes.mjs      # 코드와 회원 명단을 만든다
```

- 서버는 "유효한 코드 집합"만 알고 **누구의 코드인지는 모른다.** 코드↔회원 매핑은 운영자가
  `member-codes.local.csv`로 따로 보관한다(서버에 개인정보를 두지 않기 위함).
- 비교할 때 하이픈·공백·대소문자를 무시한다. 전화로 불러주거나 종이에서 옮겨 적는 상황을
  가정한 것이다.
- 사용량은 `[usage] code=...` 로그로만 남고, 어느 회원인지는 운영자의 명단에서만 확인된다.

## 배포

`master`에 푸시하면 Vercel이 배포한다. `vercel.json`이 두 가지를 한다.

- `maxDuration: 60` — 생성 20초 + 동일인 검증 10초라 기본 타임아웃으로는 부족하다.
- `includeFiles` — 스타일 이미지와 스타일·컬러 데이터를 함수 번들에 넣는다. 함수가 런타임에
  파일로 읽기 때문이다.

> **`api/generate.ts`에는 상대경로 '값' import를 두지 말 것.** `package.json`이 `"type": "module"`
> 이라 배포된 함수는 ESM으로 로드되고, ESM은 확장자 없는 상대경로를 해석하지 못해 모듈 로딩
> 단계에서 통째로 죽는다(`FUNCTION_INVOCATION_FAILED`). 로컬에서는 재현되지 않는다.
> `import type`은 컴파일 시 제거되므로 안전하다.

## 보조 스크립트

```bash
node generate-icons.mjs         # PWA 아이콘 세트
node generate-og-image.mjs      # 링크 공유용 미리보기 이미지
node generate-style-images.mjs  # 스타일 참조 이미지
```

## 구조

```
api/generate.ts     서버리스 함수 하나. 추천·생성·코드확인을 action으로 분기
services/           클라이언트에서 /api/generate 호출
components/         화면
data/               스타일·컬러 카탈로그(JSON)와 한국어 라벨
utils/              이미지 축소, 회원 코드 보관, 고객 리포트 렌더링
```

리포트 이미지는 캔버스로 **브라우저에서** 그린다. 얼굴 사진과 진단이 서버를 거치지 않는다.
