import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { CameraCapture } from './components/CameraCapture';
import { ResultViewer } from './components/ResultViewer';
import { ColorSelector } from './components/ColorSelector';
import { AdBanner } from './components/AdBanner';
import { generateHairstyle } from './services/geminiService';
import { AppStep, Gender, StyleCategory, HairStyle, HairColor } from './types';
import { hairstyles } from './data/hairstyles';
import { hairColors } from './data/hairColors';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.HOME);
  const [showCamera, setShowCamera] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<HairStyle | null>(null);
  const [styleImage, setStyleImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [stylistComment, setStylistComment] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<HairColor | null>(
    hairColors.find(c => c.id === 'natural') || null
  );
  const [error, setError] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender>('female');
  const [styleCategory, setStyleCategory] = useState<StyleCategory>('cut');

  const filtered = hairstyles.filter(s => s.gender === gender && s.category === styleCategory);

  const handleStyleClick = async (style: HairStyle) => {
    setSelectedStyle(style);
    try {
      const res = await fetch(style.imagePath);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setStyleImage(reader.result as string);
      };
      reader.readAsDataURL(blob);
    } catch {
      setStyleImage(null);
    }
  };

  const handleGenerate = async () => {
    if (!userImage || !styleImage) return;
    setStep(AppStep.PROCESSING);
    setError(null);
    try {
      const styleInfo = selectedStyle ? {
        name: selectedStyle.name,
        nameKo: selectedStyle.nameKo,
        description: selectedStyle.description,
        tags: selectedStyle.tags,
        gender: selectedStyle.gender,
      } : undefined;
      const colorInfo = (selectedColor && selectedColor.id !== 'natural') ? {
        name: selectedColor.name,
        nameKo: selectedColor.nameKo,
        description: selectedColor.description,
      } : undefined;
      const result = await generateHairstyle(userImage, styleImage, styleInfo, colorInfo);
      setResultImage(result.image);
      setStylistComment(result.comment);
      setStep(AppStep.RESULT);
    } catch (err) {
      console.error(err);
      setError("헤어스타일 생성에 실패했습니다. 얼굴이 잘 보이는 사진으로 다시 시도해주세요.");
      setStep(AppStep.HOME);
    }
  };

  const handleReset = useCallback(() => {
    setStep(AppStep.HOME);
    setResultImage(null);
    setStylistComment('');
    setUserImage(null);
    setStyleImage(null);
    setSelectedStyle(null);
    setSelectedColor(hairColors.find(c => c.id === 'natural') || null);
    setError(null);
  }, []);

  const handleSave = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `hairfit-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isReady = userImage && styleImage;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {showCamera && (
        <CameraCapture
          onCapture={(base64) => {
            setUserImage(base64);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
      <Header />

      <main className="flex-1 max-w-lg w-full mx-auto p-4 pb-28 flex flex-col">
        {step === AppStep.HOME && (
          <div className="flex flex-col animate-fade-in">
            {/* Step 1: User Photo */}
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-700 mb-2 ml-1 uppercase tracking-wider">Step 1. 내 사진 업로드</p>
              <ImageUploader
                label="내 사진"
                description="얼굴이 잘 보이는 정면 사진"
                imageSrc={userImage}
                onImageSelected={setUserImage}
                onCameraClick={() => setShowCamera(true)}
                isActive={!userImage}
              />
            </div>

            {/* Step 2: Style Selection - always visible */}
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-700 mb-3 ml-1 uppercase tracking-wider">Step 2. 헤어스타일 선택</p>

              {/* Gender Tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                <button
                  onClick={() => { setGender('female'); setStyleCategory('cut'); setSelectedStyle(null); setStyleImage(null); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    gender === 'female'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  여성 스타일
                </button>
                <button
                  onClick={() => { setGender('male'); setStyleCategory('cut'); setSelectedStyle(null); setStyleImage(null); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    gender === 'male'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  남성 스타일
                </button>
              </div>

              {/* Cut / Perm Sub-tabs */}
              <div className="flex gap-2 mb-4 ml-1">
                <button
                  onClick={() => { setStyleCategory('cut'); setSelectedStyle(null); setStyleImage(null); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    styleCategory === 'cut'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                  }`}
                >
                  컷
                </button>
                <button
                  onClick={() => { setStyleCategory('perm'); setSelectedStyle(null); setStyleImage(null); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    styleCategory === 'perm'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                  }`}
                >
                  펌
                </button>
              </div>

              {/* Style Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                {filtered.map(style => (
                  <button
                    key={style.id}
                    onClick={() => handleStyleClick(style)}
                    className={`group relative rounded-2xl overflow-hidden text-left focus:outline-none transition-all duration-200 ${
                      selectedStyle?.id === style.id
                        ? 'ring-3 ring-purple-500 ring-offset-2 scale-[0.97]'
                        : 'hover:scale-[1.03]'
                    }`}
                  >
                    <div className="aspect-[3/4] overflow-hidden bg-gray-200">
                      <img
                        src={style.imagePath}
                        alt={style.nameKo}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    {selectedStyle?.id === style.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <h3 className="text-white font-bold text-[11px] leading-tight">{style.nameKo}</h3>
                      <p className="text-white/70 text-[9px] mt-0.5 leading-snug line-clamp-1">{style.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Hair Color Selection */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3 ml-1">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Step 3. 염색 컬러 선택
                </p>
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  <span className="text-[10px]">C</span>-클리어
                </span>
                <span className="text-[10px] font-normal text-gray-400 normal-case">(선택사항)</span>
              </div>
              <ColorSelector
                selectedColor={selectedColor}
                onColorSelected={setSelectedColor}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg mb-4 text-center border border-red-100">
                {error}
              </div>
            )}

            {/* Ad Banner */}
            <AdBanner />

            {/* Fixed bottom button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent z-20">
              <div className="max-w-lg mx-auto">
                <button
                  onClick={handleGenerate}
                  disabled={!isReady}
                  className={`
                    w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-300
                    ${isReady
                      ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-purple-200 hover:shadow-purple-300 hover:scale-[1.02]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                  `}
                >
                  {!userImage ? '사진을 업로드하세요' : !styleImage ? '스타일을 선택하세요' : '헤어스타일 시뮬레이션'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === AppStep.PROCESSING && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-pulse">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">✂️</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">스타일 적용 중...</h3>
            <p className="text-gray-500 text-sm max-w-xs">
              AI가 얼굴 특징을 분석하고 새로운 헤어스타일을 적용하고 있습니다. 약 10-15초 정도 소요됩니다.
            </p>
          </div>
        )}

        {step === AppStep.RESULT && resultImage && userImage && (
          <div className="flex flex-col animate-fade-in">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">새로운 스타일</h2>
              <p className="text-xs text-gray-500">슬라이드하여 Before & After 비교</p>
              {selectedColor && selectedColor.id !== 'natural' && (
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                    C-클리어
                  </span>
                  <span className="text-xs text-gray-500">{selectedColor.nameKo} 적용</span>
                </div>
              )}
            </div>
            <ResultViewer
              originalImage={userImage}
              generatedImage={resultImage}
              stylistComment={stylistComment}
              onSave={handleSave}
              onReset={handleReset}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
