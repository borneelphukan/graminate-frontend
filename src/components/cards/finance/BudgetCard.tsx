import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type BudgetCardProps = {
  title: string;
  value: number;
  date: Date;
  icon: IconDefinition;
  bgColor: string;
  iconValueColor: string;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

const BudgetCard = ({
  title,
  value,
  date,
  icon,
  bgColor,
  iconValueColor,
}: BudgetCardProps) => {
  const formattedDate = date.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className={`${bgColor} p-6 rounded-lg shadow-sm transition-shadow duration-300 ease-in-out flex flex-col`}
    >
      <div className="flex items-center mb-2 gap-2">
        <FontAwesomeIcon
          icon={icon}
          className={`${iconValueColor} text-2xl opacity-80`}
        />
        <h3 className="text-sm font-medium text-dark dark:text-light uppercase">
          {title}
        </h3>
      </div>
      <p className={`mt-1 text-3xl font-semibold ${iconValueColor}`}>
        {formatCurrency(value)}
      </p>
      <p className="mt-auto pt-2 text-xs text-dark dark:text-light opacity-90">
        {formattedDate}
      </p>
    </div>
  );
};

export default BudgetCard;
