// 지난 결과를 기기에 남겨둔다. 서버로 보내지 않으므로 얼굴 사진이 밖으로 나가지 않는다.
// 카카오톡 인앱 브라우저나 시크릿 모드에서는 localStorage가 막혀 있을 수 있어서,
// 저장이 실패해도 앱은 그대로 동작해야 한다(utils/accessCode.ts와 같은 방침).

const STORAGE_KEY = 'hairfit-history';
const MAX_ENTRIES = 12;
const THUMB_SIZE = 256;

export interface HistoryEntry {
  id: string;
  savedAt: number;
  thumbnail: string;
  styleId: string;
  styleName: string;
  colorId: string | null;
  colorName: string | null;
}

const read = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(e => e && e.id && e.thumbnail) : [];
  } catch {
    return [];
  }
};

// 용량이 차면 오래된 것부터 버리고 다시 시도한다. 저장이 끝내 안 되면 조용히 포기한다 —
// 기록을 못 남기는 것 때문에 결과 화면이 깨지면 안 된다.
const write = (entries: HistoryEntry[]): HistoryEntry[] => {
  let candidate = entries.slice(0, MAX_ENTRIES);
  while (candidate.length) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(candidate));
      return candidate;
    } catch {
      candidate = candidate.slice(0, candidate.length - 1);
    }
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  return [];
};

export const loadHistory = (): HistoryEntry[] => read();

export const clearHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
};

export const removeHistoryEntry = (id: string): HistoryEntry[] =>
  write(read().filter(e => e.id !== id));

// 결과 이미지 그대로는 1MB가 넘어 몇 개만 넣어도 저장 용량이 찬다. 작게 줄여서 담는다.
const makeThumbnail = (dataUrl: string): Promise<string> =>
  new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const side = Math.min(img.width, img.height);
      canvas.width = THUMB_SIZE;
      canvas.height = THUMB_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }
      ctx.drawImage(
        img,
        (img.width - side) / 2,
        (img.height - side) / 2,
        side,
        side,
        0,
        0,
        THUMB_SIZE,
        THUMB_SIZE
      );
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve('');
    img.src = dataUrl;
  });

export const addHistoryEntry = async (input: {
  resultImage: string;
  styleId: string;
  styleName: string;
  colorId: string | null;
  colorName: string | null;
}): Promise<HistoryEntry[]> => {
  const thumbnail = await makeThumbnail(input.resultImage);
  if (!thumbnail) return read();

  const entry: HistoryEntry = {
    id: `${Date.now()}-${input.styleId}`,
    savedAt: Date.now(),
    thumbnail,
    styleId: input.styleId,
    styleName: input.styleName,
    colorId: input.colorId,
    colorName: input.colorName,
  };

  return write([entry, ...read()]);
};
