import React, { useState, useEffect } from "react";
import BusinessCard from "../cards/BusinessCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import RadioButton from "../ui/Radio";

type View = "distributor" | "exporter" | "factories";

type Business = {
  name: string;
  stars: number;
  address: string;
  open: boolean;
  price: number;
};

type Props = {
  activeView: View;
};

const businessData: Record<View, Business[]> = {
  distributor: [
    {
      name: "Kirti Tea Trading",
      stars: 4.1,
      address: "Tinsukia, Assam",
      open: true,
      price: 56,
    },
    {
      name: "Om Adishakti Pvt Ltd",
      stars: 2.9,
      address: "Kolkata, West Bengal",
      open: false,
      price: 25,
    },
    {
      name: "Basundhara Tea",
      stars: 4.3,
      address: "Sonitpur, Assam",
      open: false,
      price: 45,
    },
    {
      name: "Assamica Agro",
      stars: 4.9,
      address: "Assam, India",
      open: false,
      price: 65,
    },
  ],
  exporter: [
    {
      name: "Assam Company India Ltd.",
      stars: 4.2,
      address: "Guwahati, Assam",
      open: true,
      price: 23,
    },
    {
      name: "Halmari Tea",
      stars: 4.5,
      address: "Dibrugarh, Assam",
      open: false,
      price: 56,
    },
    {
      name: "McLeod Russel India Ltd.",
      stars: 2.8,
      address: "Kolkata, West Bengal",
      open: false,
      price: 45,
    },
    {
      name: "Goodricke Group Limited",
      stars: 3.8,
      address: "Kolkata, West Bengal",
      open: false,
      price: 87,
    },
  ],
  factories: [
    {
      name: "Halmari Tea Factory",
      stars: 4.7,
      address: "Dibrugarh, Assam",
      open: true,
      price: 69,
    },
    {
      name: "Damayanti Tea Industries",
      stars: 4.6,
      address: "Assam, India",
      open: false,

      price: 84,
    },
    {
      name: "Chota Tingrai Tea Estate",
      stars: 4.4,
      address: "Tinsukia, Assam",
      open: false,
      price: 15,
    },
    {
      name: "Nefaa Tea",
      stars: 4.6,
      address: "Upper Assam, India",
      open: false,
      price: 98,
    },
  ],
};

const FinderBar = ({ activeView }: Props) => {
  const [sortedData, setSortedData] = useState<Business[]>([]);
  const [sortOption, setSortOption] = useState<
    "relevance" | "rating" | "price"
  >("relevance");
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const handleSort = (option: "relevance" | "rating" | "price") => {
    setSortOption(option);
    setShowDropdown(false);
  };

  useEffect(() => {
    const data = [...businessData[activeView]];
    if (sortOption === "rating") {
      data.sort((a, b) => b.stars - a.stars);
    } else if (sortOption === "price") {
      data.sort((a, b) => b.price - a.price);
    } else if (sortOption === "relevance") {
      data.sort((a, b) => {
        if (a.price === b.price) {
          return b.stars - a.stars;
        }
        return a.price - b.price;
      });
    }
    setSortedData(data);
  }, [activeView, sortOption]);

  return (
    <div className="container w-96 text-gray-800 m-2 border-gray-400 min-h-screen">
      <div className="flex items-center rounded-t-md bg-green-200 px-2">
        <div className="text-lg font-semibold text-gray-500 p-2 flex-grow">
          {activeView === "distributor" && "Distributor"}
          {activeView === "exporter" && "Exporter"}
          {activeView === "factories" && "Factories"}
        </div>
        <div className="relative">
          <button
            className="flex items-center gap-2 text-gray-500 rounded-lg px-3"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
              />
            </svg>
            Sort
            {showDropdown ? (
              <FontAwesomeIcon icon={faChevronUp} className="w-4 h-4" />
            ) : (
              <FontAwesomeIcon icon={faChevronDown} className="w-4 h-4" />
            )}
          </button>
          {showDropdown && (
            <div className="absolute right-0 w-60 bg-white dark:bg-gray-800 rounded shadow-md mt-1 z-10">
              <label className="block px-4 py-2">
                <RadioButton
                  id="sort-relevance"
                  name="sort"
                  label="Relevance"
                  value="relevance"
                  checked={sortOption === "relevance"}
                  onChange={() => handleSort("relevance")}
                  className="mr-4"
                />
              </label>
              <label className="block px-4 py-2">
                <RadioButton
                  id="sort-rating"
                  name="sort"
                  label="Rating"
                  value="rating"
                  checked={sortOption === "rating"}
                  onChange={() => handleSort("rating")}
                />
              </label>
              <label className="block px-4 py-2">
                <RadioButton
                  id="sort-price"
                  name="sort"
                  label="Price"
                  value="price"
                  checked={sortOption === "price"}
                  onChange={() => handleSort("price")}
                  className="mr-4"
                />
              </label>
            </div>
          )}
        </div>
      </div>
      <div className="overflow-y-auto max-h-[calc(100vh-4rem)]">
        <ul>
          {sortedData.map((business, index) => (
            <li key={index}>
              <BusinessCard
                businessName={business.name}
                stars={business.stars}
                address={business.address}
                open={business.open}
                price={business.price}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FinderBar;
