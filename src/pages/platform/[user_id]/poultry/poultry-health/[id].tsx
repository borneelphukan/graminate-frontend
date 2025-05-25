import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import PlatformLayout from "@/layout/PlatformLayout";
import Button from "@/components/ui/Button";
import axiosInstance from "@/lib/utils/axiosInstance";
import Loader from "@/components/ui/Loader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStethoscope,
  faUserMd,
  faFileMedical,
  faNotesMedical,
  faSyringe,
  faCapsules,
  faCommentDots,
  faCalendarCheck,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import jsPDF from "jspdf";

interface PoultryHealthRecord {
  poultry_health_id: number;
  user_id: number;
  flock_id: number;
  veterinary_name?: string;
  total_birds: number;
  birds_vaccinated: number;
  vaccines_given?: string[];
  symptoms?: string[];
  medicine_approved?: string[];
  remarks?: string;
  next_appointment?: string;
  created_at: string;
}

interface FlockData {
  flock_id: number;
  flock_name: string;
  flock_type: string;
  user: {
    business_name?: string;
    first_name: string;
    last_name: string;
  };
}

const HealthRecordDetailPage = () => {
  const router = useRouter();
  const {
    user_id: queryUserId,
    flock_id: queryFlockIdFromUrl,
    id: queryRecordIdFromUrl,
  } = router.query;

  const parsedUserId = Array.isArray(queryUserId)
    ? queryUserId[0]
    : queryUserId;
  const parsedRecordId = Array.isArray(queryRecordIdFromUrl)
    ? queryRecordIdFromUrl[0]
    : queryRecordIdFromUrl;
  const parsedFlockIdFromUrl = Array.isArray(queryFlockIdFromUrl)
    ? queryFlockIdFromUrl[0]
    : queryFlockIdFromUrl;

  const [record, setRecord] = useState<PoultryHealthRecord | null>(null);
  const [flockData, setFlockData] = useState<FlockData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecordDetails = useCallback(async () => {
    if (!parsedRecordId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const recordResponse = await axiosInstance.get<PoultryHealthRecord>(
        `/poultry-health/record/${parsedRecordId}`
      );
      setRecord(recordResponse.data);

      if (recordResponse.data && recordResponse.data.flock_id) {
        const flockResponse = await axiosInstance.get<FlockData>(
          `/flock/${recordResponse.data.flock_id}?includeUser=true`
        );
        setFlockData(flockResponse.data);
      } else {
        setFlockData(null);
      }
    } catch (error) {
      console.error("Error fetching health record details:", error);
      setRecord(null);
      setFlockData(null);
    } finally {
      setLoading(false);
    }
  }, [parsedRecordId]);

  useEffect(() => {
    fetchRecordDetails();
  }, [fetchRecordDetails]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatArray = (arr?: string[]) => {
    if (!arr || arr.length === 0) return "N/A";
    return arr.join(", ");
  };

  const generatePDF = () => {
    if (!record || !flockData) return;

    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - 2 * margin;
    let yPos = margin;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const clinicName =
      flockData.user?.business_name ||
      `${flockData.user?.first_name} ${flockData.user?.last_name}'s Farm`;
    doc.text(clinicName, pageWidth / 2, yPos, { align: "center" });
    yPos += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Poultry Health Record", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    const addSection = (title: string, value?: string | string[]) => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(title, margin, yPos);
      yPos += 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      let textToPrint = "N/A";
      if (Array.isArray(value)) {
        textToPrint = value.length > 0 ? value.join(", ") : "N/A";
      } else if (value !== undefined && value !== null) {
        // Check for undefined/null before toString
        textToPrint = String(value);
      }

      const splitText = doc.splitTextToSize(textToPrint, usableWidth);
      doc.text(splitText, margin, yPos);
      yPos += splitText.length * 5 + 5;
      if (yPos > doc.internal.pageSize.getHeight() - margin - 10) {
        // Added buffer
        doc.addPage();
        yPos = margin;
      }
    };

    addSection("Record ID:", `#${record.poultry_health_id}`);
    addSection("Date Logged:", formatDate(record.created_at));
    addSection("Flock Name:", flockData.flock_name);
    addSection("Flock Type:", flockData.flock_type);
    yPos += 5;
    doc.setLineWidth(0.2);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    if (record.veterinary_name) {
      addSection("Veterinarian:", record.veterinary_name);
    }
    addSection("Total Birds in Record:", record.total_birds.toString());
    addSection("Birds Vaccinated:", record.birds_vaccinated.toString());

    if (record.vaccines_given && record.vaccines_given.length > 0) {
      addSection("Vaccines Given:", record.vaccines_given);
    }
    if (record.symptoms && record.symptoms.length > 0) {
      addSection("Symptoms Observed:", record.symptoms);
    }
    if (record.medicine_approved && record.medicine_approved.length > 0) {
      addSection("Medicine Approved:", record.medicine_approved);
    }
    if (record.remarks) {
      addSection("Remarks:", record.remarks);
    }
    if (record.next_appointment) {
      addSection("Next Appointment:", formatDate(record.next_appointment));
    }

    yPos += 10;
    if (yPos > doc.internal.pageSize.getHeight() - margin - 5) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("This is an auto-generated health record.", margin, yPos);

    doc.save(
      `poultry_health_record_${
        record.poultry_health_id
      }_${flockData.flock_name.replace(/\s+/g, "_")}.pdf`
    );
  };

  if (loading) {
    return (
      <PlatformLayout>
        <div className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-150px)]">
          <Loader />
        </div>
      </PlatformLayout>
    );
  }

  if (!record) {
    const backFlockId =
      parsedFlockIdFromUrl || (flockData ? flockData.flock_id : "");
    return (
      <PlatformLayout>
        <div className="container mx-auto p-4 text-center">
          <h1 className="text-xl font-semibold text-red-500">
            Record Not Found
          </h1>
          <Button
            text="Go Back to Health Records"
            onClick={() => {
              if (parsedUserId && backFlockId) {
                router.push(
                  `/platform/${parsedUserId}/poultry/poultry-health?flock_id=${backFlockId}`
                );
              } else if (parsedUserId) {
                router.push(`/platform/${parsedUserId}/poultry`);
              }
            }}
            style="secondary"
          />
        </div>
      </PlatformLayout>
    );
  }

  const pageTitle = `Health Record #${record.poultry_health_id} - ${
    flockData?.flock_name || "Flock"
  }`;

  const DetailItem = ({
    icon,
    label,
    value,
  }: {
    icon: IconDefinition;
    label: string;
    value?: string | number | string[];
  }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-dark flex items-center">
        <FontAwesomeIcon icon={icon} className="mr-3 w-5 h-5 text-blue-500" />
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">
        {Array.isArray(value)
          ? formatArray(value)
          : value !== undefined && value !== null
          ? String(value)
          : "N/A"}
      </dd>
    </div>
  );

  return (
    <PlatformLayout>
      <Head>
        <title>Graminate | {pageTitle}</title>
      </Head>
      <div className="min-h-screen container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex justify-between items-center">
            <Button
              text="Back"
              arrow="left"
              onClick={() => {
                const flockIdForBack = parsedFlockIdFromUrl || record.flock_id;
                if (parsedUserId && flockIdForBack) {
                  router.push(
                    `/platform/${parsedUserId}/poultry/poultry-health?flock_id=${flockIdForBack}`
                  );
                }
              }}
              style="ghost"
            />
            <Button text="Download PDF" onClick={generatePDF} style="primary" />
          </div>

          <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-500">
              <div className="flex flex-col sm:flex-row justify-between items-start">
                <div>
                  <p className="text-lg text-dark">Poultry Health Record</p>
                </div>
                <div className="mt-2 sm:mt-0 text-sm text-dark text-right">
                  <p>
                    <strong>Record ID:</strong> #{record.poultry_health_id}
                  </p>
                  <p>
                    <strong>Date:</strong> {formatDate(record.created_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-dark mb-3 border-b pb-2">
                <FontAwesomeIcon
                  icon={faStethoscope}
                  className="mr-2 text-green-500"
                />
                Flock Information
              </h3>
              <dl className="divide-y divide-gray-500">
                <DetailItem
                  icon={faFileMedical}
                  label="Flock Name"
                  value={flockData?.flock_name}
                />
                <DetailItem
                  icon={faFileMedical}
                  label="Flock Type"
                  value={flockData?.flock_type}
                />
              </dl>

              <h3 className="text-lg text-dark font-semibold mt-6 mb-3 border-b pb-2">
                <FontAwesomeIcon
                  icon={faUserMd}
                  className="mr-2 text-purple-500"
                />
                Veterinary Details
              </h3>
              <dl className="divide-y divide-gray-500 ">
                {record.veterinary_name && (
                  <DetailItem
                    icon={faUserMd}
                    label="Veterinarian"
                    value={record.veterinary_name}
                  />
                )}
                <DetailItem
                  icon={faNotesMedical}
                  label="Total Birds (in this record)"
                  value={record.total_birds}
                />
                <DetailItem
                  icon={faSyringe}
                  label="Birds Vaccinated"
                  value={record.birds_vaccinated}
                />
                {record.vaccines_given && record.vaccines_given.length > 0 && (
                  <DetailItem
                    icon={faSyringe}
                    label="Vaccines Given"
                    value={record.vaccines_given}
                  />
                )}
                {record.symptoms && record.symptoms.length > 0 && (
                  <DetailItem
                    icon={faStethoscope}
                    label="Symptoms Observed"
                    value={record.symptoms}
                  />
                )}
                {record.medicine_approved &&
                  record.medicine_approved.length > 0 && (
                    <DetailItem
                      icon={faCapsules}
                      label="Medicine Approved"
                      value={record.medicine_approved}
                    />
                  )}
              </dl>

              {record.remarks && (
                <>
                  <h3 className="text-lg font-semibold text-dark mt-6 mb-3 border-b pb-2">
                    <FontAwesomeIcon
                      icon={faCommentDots}
                      className="mr-2 text-yellow-500"
                    />
                    Remarks
                  </h3>
                  <p className="text-sm text-dark whitespace-pre-wrap">
                    {record.remarks}
                  </p>
                </>
              )}

              {record.next_appointment && (
                <>
                  <h3 className="text-lg font-semibold text-dark mt-6 mb-3 border-b pb-2">
                    <FontAwesomeIcon
                      icon={faCalendarCheck}
                      className="mr-2 text-red-500"
                    />
                    Next Appointment
                  </h3>
                  <p className="text-sm text-gray-700">
                    {formatDate(record.next_appointment)}
                  </p>
                </>
              )}
            </div>
            <div className="px-6 py-4 bg-white border-t border-gray-500 text-xs text-dark text-center">
              This is an auto-generated health record. Please consult with your
              veterinarian for any health concerns.
            </div>
          </div>
        </div>
      </div>
    </PlatformLayout>
  );
};

export default HealthRecordDetailPage;
