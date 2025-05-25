import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDrumstickBite,
  faKiwiBird,
  faCalendarAlt,
  faWarehouse,
  faBuilding,
  faStickyNote,
} from "@fortawesome/free-solid-svg-icons";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

type Props = {
  quantity: number;
  flockId: number | string;
  flockType: string;
  dateCreated: string;
  breed?: string;
  source?: string;
  housingType?: string;
  notes?: string;
};

type InfoItemProps = {
  label: string;
  value?: string | number;
  icon: IconDefinition;
  fullWidth?: boolean;
  isNote?: boolean;
};

const InfoItem: React.FC<InfoItemProps> = ({
  label,
  value,
  icon,
  fullWidth,
  isNote,
}) => (
  <div className={`${fullWidth ? "sm:col-span-2" : ""} group`}>
    <div className="flex items-center text-xs text-dark dark:text-light mb-1">
      <FontAwesomeIcon icon={icon} className="w-3 h-3 mr-2 text-blue-200" />
      {label}
    </div>
    {isNote ? (
      <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
        {value || "N/A"}
      </p>
    ) : (
      <p
        className="text-md font-semibold text-gray-800 dark:text-white"
        title={String(value || "N/A")}
      >
        {value || "N/A"}
      </p>
    )}
  </div>
);

const PoultryOverviewCard = ({
  quantity,
  flockType,
  dateCreated,
  breed,
  source,
  housingType,
  notes,
}: Props) => {
  const [flockAge, setFlockAge] = useState<string>("Calculating...");

  useEffect(() => {
    if (dateCreated) {
      try {
        const createdDate = new Date(dateCreated);
        if (isNaN(createdDate.getTime())) {
          setFlockAge("Invalid Date");
          return;
        }

        const currentDate = new Date();

        let years = currentDate.getFullYear() - createdDate.getFullYear();
        let months = currentDate.getMonth() - createdDate.getMonth();
        let days = currentDate.getDate() - createdDate.getDate();

        if (days < 0) {
          months--;
          const lastMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            0
          );
          days += lastMonth.getDate();
        }

        if (months < 0) {
          years--;
          months += 12;
        }

        let ageString = "";
        if (years > 0) {
          ageString += `${years} year${years > 1 ? "s" : ""}`;
        }
        if (months > 0) {
          if (ageString) ageString += ", ";
          ageString += `${months} month${months > 1 ? "s" : ""}`;
        }
        if (days > 0 || (years === 0 && months === 0)) {
          if (ageString && !(years === 0 && months === 0 && days > 0))
            ageString += ", ";
          if (years === 0 && months === 0 && days === 0) {
            ageString = "Stocked Today";
          } else if (years === 0 && months === 0 && days > 0) {
            ageString = `${days} day${days > 1 ? "s" : ""}`;
          } else if (ageString || days > 0) {
            if (ageString && days > 0) ageString += ", ";
            if (days > 0) ageString += `${days} day${days > 1 ? "s" : ""}`;
          }
        }

        if (!ageString && days === 0 && months === 0 && years === 0) {
          ageString = "0 days";
        }

        setFlockAge(ageString || "N/A");
      } catch (error) {
        console.error("Error calculating flock age:", error);
        setFlockAge("Error");
      }
    } else {
      setFlockAge("N/A");
    }
  }, [dateCreated]);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Flock Overview
        </h2>
      </div>

      <div className="text-center border-b border-gray-500 dark:border-gray-700 pb-4 mb-4">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Total Birds
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {quantity !== undefined && quantity !== null
            ? quantity.toLocaleString()
            : "N/A"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 flex-grow">
        <InfoItem label="Flock Type" value={flockType} icon={faDrumstickBite} />
        <InfoItem label="Flock Age" value={flockAge} icon={faCalendarAlt} />
        <InfoItem label="Breed" value={breed} icon={faKiwiBird} />
        <InfoItem label="Housing Type" value={housingType} icon={faWarehouse} />
        <InfoItem label="Source" value={source} icon={faBuilding} fullWidth />
        {notes && (
          <InfoItem
            label="Notes"
            value={notes}
            icon={faStickyNote}
            fullWidth
            isNote
          />
        )}
      </div>
    </div>
  );
};

export default PoultryOverviewCard;
