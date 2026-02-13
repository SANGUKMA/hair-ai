import React, { useRef, useState, useEffect, useCallback } from 'react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    // Stop existing stream
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 640 },
          height: { ideal: 480 },
          zoom: { ideal: 1 } as any,
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch {
      setError('카메라에 접근할 수 없습니다. 브라우저 권한을 확인해주세요.');
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleFlip = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    startCamera(next);
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center crop to square
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;

    // Mirror for front camera
    if (facingMode === 'user') {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    const base64 = canvas.toDataURL('image/jpeg', 0.9);

    // Stop camera
    stream?.getTracks().forEach(t => t.stop());
    onCapture(base64);
  };

  const handleClose = () => {
    stream?.getTracks().forEach(t => t.stop());
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
            <p className="absolute bottom-4 left-0 right-0 text-center text-white/60 text-xs">
              얼굴을 가이드 안에 맞춰주세요
            </p>
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
    </div>
  );
};
