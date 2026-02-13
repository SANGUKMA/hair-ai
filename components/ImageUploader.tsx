import React, { useRef } from 'react';

interface ImageUploaderProps {
  label: string;
  description: string;
  imageSrc: string | null;
  onImageSelected: (base64: string) => void;
  isActive: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  description,
  imageSrc,
  onImageSelected,
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
    <div
      onClick={triggerUpload}
      className={`
        relative w-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border-2
        ${imageSrc ? 'border-transparent shadow-lg' : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'}
        ${isActive ? 'ring-4 ring-purple-100 border-purple-400' : ''}
      `}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {imageSrc ? (
        <div className="flex items-center gap-4 p-3">
          <img
            src={imageSrc}
            alt={label}
            className="w-16 h-20 object-cover rounded-xl shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 text-sm">{label}</p>
            <p className="text-[11px] text-purple-600 font-medium mt-1">탭하여 변경</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
          </div>
        </div>
      )}
    </div>
  );
};
