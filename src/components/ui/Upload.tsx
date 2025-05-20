import { faCloudArrowUp, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";

type Props = {
  label: string;
  onFileSelect?: (file: File | null) => void;
};

const Upload = ({ label, onFileSelect }: Props) => {
  const [file, setFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      const selectedFile = files[0];

      // Only allow PDF files
      if (selectedFile.type !== "application/pdf") {
        alert("Only PDF files are allowed!");
        event.target.value = "";
        return;
      }

      setFileName(selectedFile.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setFile(e.target.result as string);
          if (onFileSelect) onFileSelect(selectedFile);
        }
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFileName("");
    if (onFileSelect) onFileSelect(null);
  };

  return (
    <div className="w-full">
      {/* Label */}
      <label className="block mb-1 text-base font-medium text-gray-200 dark:text-gray-300">
        {label}
      </label>

      {/* Upload Box */}
      <label className="flex justify-center w-full h-24 px-4 transition bg-light border-2 border-gray-400 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
        <span className="flex items-center space-x-2">
          <FontAwesomeIcon
            icon={faCloudArrowUp}
            className="size-6 text-gray-300"
          />

          <span className="font-medium text-gray-600">
            Drag your PDF file here or{" "}
            <span className="text-green-200 font-bold">browse</span>
          </span>
        </span>
        <input
          type="file"
          name="file_upload"
          className="hidden"
          accept="application/pdf"
          onChange={handleChange}
        />
      </label>

      {/* Display Selected File */}
      {file && (
        <div className="flex items-center justify-start w-full mt-2 p-3 border border-gray-400 rounded-md relative">
          <span className="ml-4">📄 {fileName}</span>

          {/* Remove File Button */}
          <button
            className="absolute right-0 p-1 m-3 bg-red-400 rounded-full"
            aria-label="remove file"
            onClick={removeFile}
          >
            <FontAwesomeIcon icon={faXmark} className="size-6 text-red-200" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Upload;
