import React, { useRef } from 'react';

interface ImageUploaderProps {
  label: string;
  description: string;
  imageSrc: string | null;
  onImageSelected: (base64: string) => void;
  onCameraClick?: () => void;
  isActive: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  description,
  imageSrc,
  onImageSelected,
  onCameraClick,
  isActive
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onImageSelected(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {imageSrc ? (
        <div
          className={`
            relative w-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border-2 border-transparent shadow-lg
            ${isActive ? 'ring-4 ring-purple-100 border-purple-400' : ''}
          `}
        >
          <div className="flex items-center gap-4 p-3">
            <img
              src={imageSrc}
              alt={label}
              className="w-16 h-20 object-cover rounded-xl shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 text-sm">{label}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={triggerUpload}
                  className="text-[11px] text-purple-600 font-medium bg-purple-50 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  앨범에서 변경
                </button>
                {onCameraClick && (
                  <button
                    onClick={onCameraClick}
                    className="text-[11px] text-purple-600 font-medium bg-purple-50 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    다시 촬영
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-2.5">
          {/* Album upload button */}
          <button
            onClick={triggerUpload}
            className={`
              flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed transition-all duration-300
              ${isActive ? 'border-purple-400 bg-purple-50 ring-4 ring-purple-100' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
            `}
          >
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">앨범</h3>
              <p className="text-[11px] text-gray-500">{description}</p>
            </div>
          </button>

          {/* Camera button */}
          {onCameraClick && (
            <button
              onClick={onCameraClick}
              className={`
                flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed transition-all duration-300
                ${isActive ? 'border-purple-400 bg-purple-50 ring-4 ring-purple-100' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
              `}
            >
              <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900">촬영</h3>
                <p className="text-[11px] text-gray-500">셀카로 바로 찍기</p>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
