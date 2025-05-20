import type { PriceCard } from "@/types/card-props";

const classNames = (...classes: string[]) => classes.filter(Boolean).join(" ");

const PriceCard = ({
  label,
  description,
  price,
  priceSuffix,
  points,
  href,
  popular = false,
  isSelected,
  onClick,
}: PriceCard) => {
  return (
    <div
      onClick={onClick}
      className={classNames(
        isSelected ? "ring-2 ring-green-600" : "ring-gray-400",
        "transform cursor-pointer rounded-3xl p-8 transition-transform duration-200 hover:scale-105 xl:p-10"
      )}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      }}
    >
      <div className="flex items-center justify-between gap-x-4">
        <h2 className="text-lg leading-8 font-semibold text-gray-600">
          {label}
        </h2>
        {popular && (
          <span className="rounded-full bg-blue-500 px-2.5 py-1 text-xs leading-5 font-semibold text-white">
            Most Popular
          </span>
        )}
      </div>
      <p className="mt-4 text-sm leading-6 text-gray-300">{description}</p>
      <p className="mt-6 flex items-baseline gap-x-1">
        <span className="text-4xl font-semibold tracking-tight text-black">
          {price}
        </span>
        <span className="text-sm leading-6 font-semibold text-gray-300">
          {priceSuffix}
        </span>
      </p>
      <a
        href={href}
        className={classNames(
          isSelected
            ? "bg-green-600 text-white shadow-sm hover:bg-green-800"
            : "bg-gray-400 text-black hover:bg-gray-300 focus-visible:outline-white",
          "mt-6 block rounded-md px-3 py-2 text-center text-sm leading-6 font-semibold focus-visible:outline focus-visible:outline-offset-2"
        )}
      >
        Buy Plan
      </a>
      <ul
        role="list"
        className="mt-8 space-y-3 text-sm leading-6 text-gray-300 xl:mt-10"
      >
        {points.map((point, index) => (
          <li key={index} className="flex gap-x-3">
            <span className="text-gray-100">✔</span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PriceCard;
