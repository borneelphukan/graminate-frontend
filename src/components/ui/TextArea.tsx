type Props = {
  label?: string;
  isDisabled?: boolean;
  type?: "disabled" | "";
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
};

const TextArea = ({
  label = "",
  isDisabled = false,
  type = "",
  placeholder = "",
  value,
  onChange,
}: Props) => {
  const getFieldClass = () => {
    switch (type) {
      case "disabled":
        return "border border-gray-400 opacity-50 text-gray-100 placeholder-gray-300 text-sm rounded-md block w-full p-2.5 focus:outline-none focus:ring-1 focus:ring-red-200";
      default:
        return "border border-gray-400 dark:border-gray-200 text-dark dark:text-light placeholder-gray-300 text-sm rounded-md block w-full p-2.5 focus:outline-none focus:ring-1 focus:ring-green-200 dark:bg-gray-700";
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor="textarea"
          className="block mb-1 text-sm font-medium text-gray-200 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-start">
        <textarea
          id="textarea"
          className={`${getFieldClass()} py-2 px-4 rounded`}
          disabled={isDisabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        ></textarea>
      </div>
    </div>
  );
};

export default TextArea;
