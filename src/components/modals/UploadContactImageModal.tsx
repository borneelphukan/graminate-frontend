import React, { useState, useRef, ChangeEvent, useEffect } from "react";
import Button from "@/components/ui/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";

interface UploadContactImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (file: File) => void;
  avatarInitials: string;
  currentProfileImageUrl?: string | null;
  firstName?: string;
  lastName?: string;
}

const UploadContactImageModal = ({
  isOpen,
  onClose,
  onConfirm,
  avatarInitials,
  currentProfileImageUrl,
  firstName = "",
  lastName = "",
}: UploadContactImageModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [isOpen]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onConfirm(selectedFile);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md animate-scaleIn">
        <div className="bg-green-200 text-white p-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-xl font-semibold">Upload a photo</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <FontAwesomeIcon className="w-5 h-5" icon={faXmark} />
          </button>
        </div>

        <div className="p-6 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 sm:gap-8">
          <div className="relative w-36 h-36 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt="Preview"
                fill
                className="object-cover"
              />
            ) : currentProfileImageUrl ? (
              <Image
                src={currentProfileImageUrl}
                alt="Current Avatar"
                fill
                className="object-cover"
              />
            ) : firstName || lastName ? (
              <Image
                src={`https://eu.ui-avatars.com/api/?name=${encodeURIComponent(
                  firstName
                )}+${encodeURIComponent(lastName)}&size=250`}
                alt="Avatar from name"
                width={144}
                height={144}
                className="rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="text-white text-5xl font-semibold">
                {avatarInitials}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center sm:items-start">
            <button
              onClick={handleChooseFileClick}
              className="cursor-pointer bg-green-200 text-white px-3 py-1 rounded text-sm text-center w-fit hover:bg-green-100" // Consider theming this button
            >
              Choose file
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/gif"
              className="hidden"
            />
            <p className="text-xs text-dark dark:text-light mt-2">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-400 dark:border-gray-700 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          <Button text="Cancel" onClick={onClose} style="secondary" />
          <Button
            text="Confirm"
            onClick={handleConfirm}
            isDisabled={!selectedFile}
            style="primary"
          />
        </div>
      </div>
    </div>
  );
};

export default UploadContactImageModal;
