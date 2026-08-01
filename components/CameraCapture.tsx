import React, { useRef, useState, useEffect, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

// 역광이나 어두운 곳에서 찍은 사진은 시뮬레이션 품질을 떨어뜨리고 퍼스널 컬러 진단도
// 흔든다. 찍은 뒤에 결과를 보고 알아차리는 것보다 찍기 전에 알려주는 편이 낫다.
type Lighting = 'unknown' | 'good' | 'dark' | 'backlit' | 'blown';

const LIGHTING_HINT: Record<Exclude<Lighting, 'unknown'>, { text: string; tone: string }> = {
  good: { text: '조명이 좋아요', tone: 'bg-emerald-500/90' },
  dark: { text: '얼굴이 어두워요. 밝은 곳으로 가주세요', tone: 'bg-amber-500/90' },
  backlit: { text: '역광이에요. 창을 등지지 말고 마주보세요', tone: 'bg-amber-500/90' },
  blown: { text: '빛이 너무 강해요. 조금 그늘로 옮겨주세요', tone: 'bg-amber-500/90' },
};

const SAMPLE_SIZE = 64;

// utils/image.ts의 MAX_DIMENSION과 같은 값. 업로드와 촬영이 같은 크기로 서버에 가야 한다.
const MAX_CAPTURE_SIZE = 1024;

// 가운데 절반을 얼굴(가이드 타원 안쪽), 바깥 테두리를 배경으로 보고 판정한다.
// RGBA 픽셀 배열만 받는 순수 함수라 브라우저 없이도 검증할 수 있다.
export const classifyLighting = (data: Uint8ClampedArray | number[], size: number): Lighting => {
  const lo = size / 4;
  const hi = (size * 3) / 4;
  let faceSum = 0;
  let faceCount = 0;
  let backSum = 0;
  let backCount = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (x >= lo && x < hi && y >= lo && y < hi) {
        faceSum += luma;
        faceCount += 1;
      } else {
        backSum += luma;
        backCount += 1;
      }
    }
  }

  const face = faceSum / faceCount;
  const back = backSum / backCount;

  // 임계값은 실제 인물 사진으로 재서 맞춘 값이다(0~255 기준).
  // 역광 판정은 "배경이 밝다"가 아니라 "얼굴이 어둡다"에서 나와야 한다. 흰 배경
  // 스튜디오 사진은 배경이 얼굴보다 훨씬 밝지만 얼굴은 잘 나와 있어 경고할 이유가 없다.
  // 그래서 얼굴이 충분히 밝으면(110 이상) 배경 차이와 무관하게 통과시킨다.
  if (face < 70) return 'dark';
  if (face > 225) return 'blown';
  if (face < 110 && back - face > 60) return 'backlit';
  return 'good';
};

// 64x64로 줄여서 읽으므로 0.5초마다 돌려도 부담이 없다.
const readLighting = (video: HTMLVideoElement, canvas: HTMLCanvasElement): Lighting => {
  if (!video.videoWidth || !video.videoHeight) return 'unknown';
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return 'unknown';

  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  ctx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  return classifyLighting(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data, SAMPLE_SIZE);
};

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // 조명 측정용. 촬영용 캔버스는 찍는 순간 크기가 바뀌므로 따로 둔다.
  const sampleRef = useRef<HTMLCanvasElement>(null);
  const [lighting, setLighting] = useState<Lighting>('unknown');
  // 스트림은 렌더에 쓰이지 않고, startCamera가 항상 최신 값을 봐야 하므로 ref로 관리한다.
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    stopCamera();
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        // zoom은 표준 MediaTrackConstraints에는 없지만, 모바일 브라우저에서
        // 기본 확대 상태로 열리는 것을 막아준다.
        video: {
          facingMode: facing,
          // 얼굴을 편집하는 작업이라 화질이 곧 결과 품질이다. 카메라가 줄 수 있는 만큼
          // 크게 받고, 저장할 때 업로드 경로와 같은 상한으로 줄인다.
          width: { ideal: 1440 },
          height: { ideal: 1440 },
          zoom: { ideal: 1 },
        } as MediaTrackConstraints,
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch {
      setError('카메라에 접근할 수 없습니다. 브라우저 권한을 확인해주세요.');
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera(facingMode);
    return stopCamera;
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const video = videoRef.current;
      const canvas = sampleRef.current;
      if (!video || !canvas || !streamRef.current) return;
      setLighting(readLighting(video, canvas));
    }, 500);
    return () => clearInterval(id);
  }, []);

  const handleFlip = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    setLighting('unknown');
    startCamera(next);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // 원본에서 정사각형으로 잘라내되, 저장 크기는 utils/image.ts의 업로드 상한과 맞춘다.
    // 여기만 작으면 직접 찍은 사진이 갤러리에서 고른 사진보다 나쁜 결과를 받게 된다.
    const source = Math.min(video.videoWidth, video.videoHeight);
    const size = Math.min(source, MAX_CAPTURE_SIZE);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center crop to square
    const sx = (video.videoWidth - source) / 2;
    const sy = (video.videoHeight - source) / 2;

    // Mirror for front camera
    if (facingMode === 'user') {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, sx, sy, source, source, 0, 0, size, size);
    const base64 = canvas.toDataURL('image/jpeg', 0.9);

    stopCamera();
    onCapture(base64);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10">
        <button onClick={handleClose} className="text-white p-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p className="text-white text-sm font-semibold">셀카 촬영</p>
        <button onClick={handleFlip} className="text-white p-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
          </svg>
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {error ? (
          <div className="text-white text-center p-8">
            <p className="text-lg mb-2">{error}</p>
            <button onClick={handleClose} className="text-purple-400 underline text-sm">돌아가기</button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
              style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}}
            />
            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-72 border-2 border-white/40 rounded-[50%]" />
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 px-6">
              {lighting !== 'unknown' && (
                <span
                  className={`${LIGHTING_HINT[lighting].tone} text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg text-center`}
                >
                  {LIGHTING_HINT[lighting].text}
                </span>
              )}
              <p className="text-center text-white/60 text-xs">얼굴을 가이드 안에 맞춰주세요</p>
            </div>
          </>
        )}
      </div>

      {/* Capture button */}
      {!error && (
        <div className="flex items-center justify-center py-6 bg-black/80">
          <button
            onClick={handleCapture}
            className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
            style={{ width: 72, height: 72 }}
          >
            <div className="w-14 h-14 rounded-full bg-white" style={{ width: 56, height: 56 }} />
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={sampleRef} className="hidden" />
    </div>
  );
};
