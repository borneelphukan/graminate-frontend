import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import TextField from "@/components/ui/TextField";
import Button from "@/components/ui/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { SidebarProp } from "@/types/card-props";
import { useAnimatePanel, useClickOutside } from "@/hooks/forms";
import axiosInstance from "@/lib/utils/axiosInstance";

interface VeterinaryFormProps extends SidebarProp {
  flockId: number;
}

type HealthRecordData = {
  veterinaryName: string;
  totalBirds: string;
  birdsVaccinated: string;
  vaccinesGiven: string;
  symptoms: string;
  medicineApproved: string;
  remarks: string;
  nextAppointment: string;
};

type HealthFormErrors = {
  veterinaryName?: string;
  totalBirds?: string;
  birdsVaccinated?: string;
  vaccinesGiven?: string;
  symptoms?: string;
  medicineApproved?: string;
  remarks?: string;
  nextAppointment?: string;
};

interface HealthRecordPayload {
  user_id: number;
  flock_id: number;
  total_birds: number;
  birds_vaccinated: number;
  veterinary_name?: string;
  vaccines_given?: string[];
  symptoms?: string[];
  medicine_approved?: string[];
  remarks?: string;
  next_appointment?: string;
}

const VeterinaryForm = ({
  onClose,
  formTitle,
  flockId,
}: VeterinaryFormProps) => {
  const router = useRouter();
  const { user_id: queryUserId } = router.query;
  const parsedUserId = Array.isArray(queryUserId)
    ? queryUserId[0]
    : queryUserId;

  const [animate, setAnimate] = useState(false);
  const [healthRecord, setHealthRecord] = useState<HealthRecordData>({
    veterinaryName: "",
    totalBirds: "",
    birdsVaccinated: "",
    vaccinesGiven: "",
    symptoms: "",
    medicineApproved: "",
    remarks: "",
    nextAppointment: "",
  });
  const [healthErrors, setHealthErrors] = useState<HealthFormErrors>({});

  const panelRef = useRef<HTMLDivElement>(null);
  useAnimatePanel(setAnimate);

  const handleCloseAnimation = useCallback(() => {
    setAnimate(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  const handleClose = useCallback(() => {
    handleCloseAnimation();
  }, [handleCloseAnimation]);

  useClickOutside(panelRef, handleClose);

  const validateForm = (): boolean => {
    const errors: HealthFormErrors = {};
    let isValid = true;

    if (!healthRecord.totalBirds.trim()) {
      errors.totalBirds = "Total Birds is required.";
      isValid = false;
    } else if (isNaN(Number(healthRecord.totalBirds))) {
      errors.totalBirds = "Total Birds must be a valid number.";
      isValid = false;
    } else if (Number(healthRecord.totalBirds) < 0) {
      errors.totalBirds = "Total Birds cannot be negative.";
      isValid = false;
    }

    if (!healthRecord.birdsVaccinated.trim()) {
      errors.birdsVaccinated = "Birds Vaccinated is required.";
      isValid = false;
    } else if (isNaN(Number(healthRecord.birdsVaccinated))) {
      errors.birdsVaccinated = "Birds Vaccinated must be a valid number.";
      isValid = false;
    } else if (Number(healthRecord.birdsVaccinated) < 0) {
      errors.birdsVaccinated = "Birds Vaccinated cannot be negative.";
      isValid = false;
    } else if (
      Number(healthRecord.birdsVaccinated) > Number(healthRecord.totalBirds)
    ) {
      errors.birdsVaccinated = "Birds Vaccinated cannot exceed Total Birds.";
      isValid = false;
    }

    if (
      healthRecord.nextAppointment &&
      isNaN(new Date(healthRecord.nextAppointment).getTime())
    ) {
      errors.nextAppointment = "Invalid date format for Next Appointment.";
      isValid = false;
    }

    setHealthErrors(errors);
    return isValid;
  };

  const handleSubmitHealthRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!parsedUserId) {
      alert("User ID is missing. Cannot log health data.");
      return;
    }
    if (!flockId) {
      alert("Flock ID is missing. Cannot log health data.");
      return;
    }

    const parseStringToArray = (str: string) =>
      str
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");

    const payload: HealthRecordPayload = {
      user_id: Number(parsedUserId),
      flock_id: Number(flockId),
      total_birds: Number(healthRecord.totalBirds),
      birds_vaccinated: Number(healthRecord.birdsVaccinated),
    };

    if (healthRecord.veterinaryName.trim())
      payload.veterinary_name = healthRecord.veterinaryName;
    if (healthRecord.vaccinesGiven.trim())
      payload.vaccines_given = parseStringToArray(healthRecord.vaccinesGiven);
    if (healthRecord.symptoms.trim())
      payload.symptoms = parseStringToArray(healthRecord.symptoms);
    if (healthRecord.medicineApproved.trim())
      payload.medicine_approved = parseStringToArray(
        healthRecord.medicineApproved
      );
    if (healthRecord.remarks.trim()) payload.remarks = healthRecord.remarks;
    if (healthRecord.nextAppointment.trim())
      payload.next_appointment = healthRecord.nextAppointment;

    await axiosInstance.post(`/poultry-health/add`, payload);
    setHealthRecord({
      veterinaryName: "",
      totalBirds: "",
      birdsVaccinated: "",
      vaccinesGiven: "",
      symptoms: "",
      medicineApproved: "",
      remarks: "",
      nextAppointment: "",
    });
    setHealthErrors({});
    handleClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm">
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-light dark:bg-gray-800 shadow-lg dark:border-l border-gray-700 overflow-y-auto"
        style={{
          transform: animate ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms ease-out",
        }}
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-dark dark:text-light">
              {formTitle || "Log New Health Data"}
            </h2>
            <button
              className="text-gray-400 hover:text-dark dark:text-light dark:hover:text-gray-300 transition-colors"
              onClick={handleClose}
              aria-label="Close panel"
            >
              <FontAwesomeIcon icon={faXmark} className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto pr-2 -mr-2 custom-scrollbar">
            <form
              className="flex flex-col gap-4 w-full"
              onSubmit={handleSubmitHealthRecord}
              noValidate
            >
              <TextField
                label="Veterinary Name (Optional)"
                placeholder="e.g. Dr. Smith"
                value={healthRecord.veterinaryName}
                onChange={(val: string) => {
                  setHealthRecord({ ...healthRecord, veterinaryName: val });
                  setHealthErrors({
                    ...healthErrors,
                    veterinaryName: undefined,
                  });
                }}
                type={healthErrors.veterinaryName ? "error" : ""}
                errorMessage={healthErrors.veterinaryName}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  number
                  label="Total Birds Involved"
                  placeholder="e.g. 100"
                  value={healthRecord.totalBirds}
                  onChange={(val: string) => {
                    setHealthRecord({ ...healthRecord, totalBirds: val });
                    setHealthErrors({ ...healthErrors, totalBirds: undefined });
                  }}
                  type={healthErrors.totalBirds ? "error" : ""}
                  errorMessage={healthErrors.totalBirds}
                />
                <TextField
                  number
                  label="Birds Vaccinated"
                  placeholder="e.g. 95"
                  value={healthRecord.birdsVaccinated}
                  onChange={(val: string) => {
                    setHealthRecord({ ...healthRecord, birdsVaccinated: val });
                    setHealthErrors({
                      ...healthErrors,
                      birdsVaccinated: undefined,
                    });
                  }}
                  type={healthErrors.birdsVaccinated ? "error" : ""}
                  errorMessage={healthErrors.birdsVaccinated}
                />
              </div>

              <TextField
                label="Vaccines Given (Optional, comma-separated)"
                placeholder="e.g. NDV, IBV"
                value={healthRecord.vaccinesGiven}
                onChange={(val: string) => {
                  setHealthRecord({ ...healthRecord, vaccinesGiven: val });
                  setHealthErrors({
                    ...healthErrors,
                    vaccinesGiven: undefined,
                  });
                }}
                type={healthErrors.vaccinesGiven ? "error" : ""}
                errorMessage={healthErrors.vaccinesGiven}
              />
              <TextField
                label="Symptoms Observed (Optional, comma-separated)"
                placeholder="e.g. Coughing, Sneezing"
                value={healthRecord.symptoms}
                onChange={(val: string) => {
                  setHealthRecord({ ...healthRecord, symptoms: val });
                  setHealthErrors({ ...healthErrors, symptoms: undefined });
                }}
                type={healthErrors.symptoms ? "error" : ""}
                errorMessage={healthErrors.symptoms}
              />
              <TextField
                label="Medicine Approved (Optional, comma-separated)"
                placeholder="e.g. Antibiotic X, Vitamin Y"
                value={healthRecord.medicineApproved}
                onChange={(val: string) => {
                  setHealthRecord({ ...healthRecord, medicineApproved: val });
                  setHealthErrors({
                    ...healthErrors,
                    medicineApproved: undefined,
                  });
                }}
                type={healthErrors.medicineApproved ? "error" : ""}
                errorMessage={healthErrors.medicineApproved}
              />
              <TextField
                label="Remarks (Optional)"
                placeholder="Additional notes or observations"
                value={healthRecord.remarks}
                onChange={(val: string) => {
                  setHealthRecord({ ...healthRecord, remarks: val });
                  setHealthErrors({ ...healthErrors, remarks: undefined });
                }}
                type={healthErrors.remarks ? "error" : ""}
                errorMessage={healthErrors.remarks}
              />
              <TextField
                calendar
                label="Next Appointment Date (Optional)"
                value={healthRecord.nextAppointment}
                onChange={(val: string) => {
                  setHealthRecord({ ...healthRecord, nextAppointment: val });
                  setHealthErrors({
                    ...healthErrors,
                    nextAppointment: undefined,
                  });
                }}
                errorMessage={healthErrors.nextAppointment}
              />

              <div className="flex justify-end gap-3 mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button text="Cancel" style="secondary" onClick={handleClose} />
                <Button text="Save Record" style="primary" type="submit" />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VeterinaryForm;
