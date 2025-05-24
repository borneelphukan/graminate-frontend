import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSyringe,
  faCalendarCheck,
  faNotesMedical,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import Loader from "@/components/ui/Loader";

type VeterinaryCardProps = {
  birdsVaccinated: number | null;
  totalBirdsInvolvedInRecord: number | null;
  nextAppointmentDate: string | null; // This will now receive the latest *future* appointment
  onManageClick: () => void;
  loading: boolean;
};

type MetricItemProps = {
  icon: IconDefinition;
  value: string | React.ReactNode;
  label: string;
};

const MetricItem = ({ icon, value, label }: MetricItemProps) => (
  <div className="flex flex-col items-center justify-center text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-1 shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
    <FontAwesomeIcon
      icon={icon}
      className="h-6 w-6 text-blue-200 dark:text-blue-300 mb-2"
      aria-hidden="true"
    />
    <p className="text-lg font-semibold text-gray-900 dark:text-white">
      {value}
    </p>
    <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
  </div>
);

const VeterinaryCard = ({
  birdsVaccinated,
  totalBirdsInvolvedInRecord,
  nextAppointmentDate,
  onManageClick,
  loading,
}: VeterinaryCardProps) => {
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "N/A";

    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const vaccinatedDisplayValue =
    birdsVaccinated === null || totalBirdsInvolvedInRecord === null
      ? "N/A"
      : `${birdsVaccinated} / ${totalBirdsInvolvedInRecord}`;

  return (
    <div className="relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Veterinary Status
        </h2>
      </div>

      {loading ? (
        <div className="flex-grow flex justify-center items-center py-8">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 flex-grow">
          <MetricItem
            icon={faSyringe}
            value={vaccinatedDisplayValue}
            label="Birds Vaccinated (Latest)"
          />
          <MetricItem
            icon={faCalendarCheck}
            value={formatDate(nextAppointmentDate)}
            label="Next Visit"
          />
          <div
            onClick={!loading ? onManageClick : undefined}
            className={`sm:col-span-2 ${
              !loading ? "cursor-pointer" : "cursor-not-allowed"
            }`}
          >
            <MetricItem
              icon={faNotesMedical}
              value={"Log & View Data"}
              label="Manage Health Records"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VeterinaryCard;
