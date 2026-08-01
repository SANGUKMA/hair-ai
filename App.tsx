import React, { useState, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { CameraCapture } from './components/CameraCapture';
import { ResultViewer } from './components/ResultViewer';
import { ColorSelector } from './components/ColorSelector';
import { AdBanner } from './components/AdBanner';
import { StyleRecommendation } from './components/StyleRecommendation';
import { ColorRecommendation } from './components/ColorRecommendation';
import { AccessGate } from './components/AccessGate';
import { InstallHint } from './components/InstallHint';
import { AccessDeniedError, generateHairstyle, recommendStyles } from './services/geminiService';
import { getAccessCode } from './utils/accessCode';
import {
  AppStep,
  Gender,
  StyleCategory,
  HairStyle,
  HairColor,
  RecommendResult,
  StyleAdjustments,
  NO_ADJUSTMENTS,
  sameAdjustments,
  ConsultAnswers,
  NO_CONSULT,
  sameConsult,
} from './types';
import { ConsultQuestions } from './components/ConsultQuestions';
import { hairstyles } from './data/hairstyles';
import { hairColors } from './data/hairColors';

const App: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState(() => Boolean(getAccessCode()));
  const [step, setStep] = useState<AppStep>(AppStep.HOME);
  const [showCamera, setShowCamera] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<HairStyle | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [stylistComment, setStylistComment] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<HairColor | null>(
    hairColors.find(c => c.id === 'natural') || null
  );
  const [error, setError] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender>('female');
  const [styleCategory, setStyleCategory] = useState<StyleCategory>('cut');
  const [colorCategory, setColorCategory] = useState<string>('natural');

  // 결과 화면에서 만지는 값(adjustments)과 지금 보이는 결과를 만든 값(applied)을 따로 둔다.
  // 칩을 누르는 건 공짜고, 생성은 버튼을 눌렀을 때 한 번만 일어난다.
  const [adjustments, setAdjustments] = useState<StyleAdjustments>(NO_ADJUSTMENTS);
  const [appliedAdjustments, setAppliedAdjustments] = useState<StyleAdjustments>(NO_ADJUSTMENTS);
  const [identityWarning, setIdentityWarning] = useState(false);

  // 상담 답변도 같은 방식이다. 고치는 건 공짜고, 다시 추천받을지는 회원이 정한다.
  const [consult, setConsult] = useState<ConsultAnswers>(NO_CONSULT);
  const [appliedConsult, setAppliedConsult] = useState<ConsultAnswers>(NO_CONSULT);

  const [recommendation, setRecommendation] = useState<RecommendResult | null>(null);
  const [isRecommending, setIsRecommending] = useState(false);
  // 성별을 오갈 때 같은 사진으로 반복 호출하지 않도록 성별별 결과를 캐시한다.
  const recommendCache = useRef<Map<Gender, RecommendResult>>(new Map());

  const filtered = hairstyles.filter(s => s.gender === gender && s.category === styleCategory);
  const recommendedIds = new Set(recommendation?.recommendations.map(r => r.styleId));
  const recommendedColorIds = new Set(recommendation?.colorRecommendations?.map(r => r.colorId));

  // 상담 답변은 인자로 받는다. 클로저로 잡으면 방금 바꾼 답변 대신 이전 값이 나간다.
  const requestRecommendation = useCallback(
    async (image: string, target: Gender, answers: ConsultAnswers) => {
    const cached = recommendCache.current.get(target);
    if (cached) {
      setRecommendation(cached);
      return;
    }
    setIsRecommending(true);
    setRecommendation(null);
    try {
      const result = await recommendStyles(image, target, answers);
      recommendCache.current.set(target, result);
      setRecommendation(result);
      setAppliedConsult(answers);
    } catch (err) {
      // 추천은 부가 기능이라 실패해도 스타일을 직접 고르면 된다. 화면을 막지 않는다.
      // 다만 코드가 거부됐다면 더 진행할 수 없으므로 입력 화면으로 되돌린다.
      if (err instanceof AccessDeniedError) setIsUnlocked(false);
      console.error('추천 실패:', err);
    } finally {
      setIsRecommending(false);
    }
    },
    []
  );

  const handleUserImage = (image: string) => {
    recommendCache.current.clear();
    setUserImage(image);
    requestRecommendation(image, gender, consult);
  };

  const handleGenderChange = (next: Gender) => {
    setGender(next);
    setStyleCategory('cut');
    setSelectedStyle(null);
    if (userImage) requestRecommendation(userImage, next, consult);
  };

  // 답변이 바뀌면 성별별로 캐시해 둔 이전 추천은 전부 무효다.
  const handleRerecommend = () => {
    if (!userImage) return;
    recommendCache.current.clear();
    requestRecommendation(userImage, gender, consult);
  };

  // 추천 카드에서 고른 스타일이 아래 그리드에도 보이도록 카테고리 탭을 맞춰준다.
  const handleRecommendedStyle = (style: HairStyle) => {
    setSelectedStyle(style);
    setStyleCategory(style.category);
  };

  // 컬러도 마찬가지다. 추천 카드에서 고른 색이 아래 그리드에서 선택된 채로 보여야 한다.
  const handleRecommendedColor = (color: HairColor) => {
    setSelectedColor(color);
    setColorCategory(color.category);
  };

  const handleGenerate = async () => {
    if (!userImage || !selectedStyle) return;
    setStep(AppStep.PROCESSING);
    setError(null);
    try {
      const result = await generateHairstyle(
        userImage,
        selectedStyle.id,
        selectedColor?.id,
        recommendation,
        adjustments
      );
      setResultImage(result.image);
      setStylistComment(result.comment);
      setIdentityWarning(Boolean(result.identityWarning));
      setAppliedAdjustments(adjustments);
      setStep(AppStep.RESULT);
    } catch (err) {
      console.error(err);
      if (err instanceof AccessDeniedError) {
        setIsUnlocked(false);
        return;
      }
      // 한도 초과처럼 서버가 이유를 알려준 경우엔 그 문구를 그대로 보여준다.
      setError(
        err instanceof Error && err.message
          ? err.message
          : '헤어스타일 생성에 실패했습니다. 얼굴이 잘 보이는 사진으로 다시 시도해주세요.'
      );
      // 다시 만들기가 실패한 경우엔 보고 있던 결과를 그대로 두고 그 화면에 머문다.
      // 홈으로 밀어내면 멀쩡한 결과가 사라진 것처럼 보인다.
      setStep(resultImage ? AppStep.RESULT : AppStep.HOME);
    }
  };

  // 사진과 진단은 그대로 두고 스타일만 다시 고른다. 추천을 다시 부르지 않으므로
  // 하루 사용 횟수는 생성 1회만 쓴다.
  const handleChangeStyle = useCallback(() => {
    setStep(AppStep.HOME);
    setResultImage(null);
    setStylistComment('');
    setIdentityWarning(false);
    setSelectedStyle(null);
    setAdjustments(NO_ADJUSTMENTS);
    setAppliedAdjustments(NO_ADJUSTMENTS);
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    setStep(AppStep.HOME);
    setResultImage(null);
    setStylistComment('');
    setIdentityWarning(false);
    setUserImage(null);
    setSelectedStyle(null);
    setAdjustments(NO_ADJUSTMENTS);
    setAppliedAdjustments(NO_ADJUSTMENTS);
    setSelectedColor(hairColors.find(c => c.id === 'natural') || null);
    setColorCategory('natural');
    setError(null);
    setRecommendation(null);
    recommendCache.current.clear();
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

  const isReady = userImage && selectedStyle;

  if (!isUnlocked) {
    return (
      <>
        <InstallHint />
        <AccessGate onUnlocked={() => setIsUnlocked(true)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <InstallHint />
      {showCamera && (
        <CameraCapture
          onCapture={(base64) => {
            handleUserImage(base64);
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
                onImageSelected={handleUserImage}
                onCameraClick={() => setShowCamera(true)}
                isActive={!userImage}
              />
              <div className="mt-3">
                <ConsultQuestions answers={consult} onChange={setConsult} />
              </div>
            </div>

            {/* Step 2: Style Selection - always visible */}
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-700 mb-3 ml-1 uppercase tracking-wider">Step 2. 헤어스타일 선택</p>

              {/* AI recommendation, shown once a photo is available */}
              <StyleRecommendation
                result={recommendation}
                styles={hairstyles}
                isLoading={isRecommending}
                selectedStyleId={selectedStyle?.id}
                onStyleSelected={handleRecommendedStyle}
                consultChanged={!sameConsult(consult, appliedConsult)}
                onRerecommend={handleRerecommend}
              />

              {/* Gender Tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                <button
                  onClick={() => handleGenderChange('female')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    gender === 'female'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  여성 스타일
                </button>
                <button
                  onClick={() => handleGenderChange('male')}
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
                  onClick={() => { setStyleCategory('cut'); setSelectedStyle(null); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    styleCategory === 'cut'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                  }`}
                >
                  컷
                </button>
                <button
                  onClick={() => { setStyleCategory('perm'); setSelectedStyle(null); }}
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
                    onClick={() => setSelectedStyle(style)}
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
                    {recommendedIds.has(style.id) && (
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
                        추천
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
              <ColorRecommendation
                result={recommendation}
                colors={hairColors}
                isLoading={isRecommending}
                selectedColorId={selectedColor?.id}
                onColorSelected={handleRecommendedColor}
              />

              <ColorSelector
                selectedColor={selectedColor}
                onColorSelected={setSelectedColor}
                activeCategory={colorCategory}
                onCategoryChange={setColorCategory}
                recommendedIds={recommendedColorIds}
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
                  {!userImage ? '사진을 업로드하세요' : !selectedStyle ? '스타일을 선택하세요' : '헤어스타일 시뮬레이션'}
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
              AI가 얼굴 특징을 분석하고 새로운 헤어스타일을 적용하고 있습니다. 약 20초 정도 소요됩니다.
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
            {error && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg mb-4 text-center border border-red-100">
                {error}
              </div>
            )}
            <ResultViewer
              originalImage={userImage}
              generatedImage={resultImage}
              stylistComment={stylistComment}
              identityWarning={identityWarning}
              adjustments={adjustments}
              onAdjustmentsChange={setAdjustments}
              showCurl={selectedStyle?.category === 'perm'}
              isDirty={!sameAdjustments(adjustments, appliedAdjustments)}
              onRegenerate={handleGenerate}
              onChangeStyle={handleChangeStyle}
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
