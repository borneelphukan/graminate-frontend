import React from "react";

type BusinessCardProps = {
  businessName: string;
  stars: number;
  address: string;
  open: boolean;
  price: number;
};

const renderStars = (rating: number): string[] => {
  const roundedRating = Math.round(rating);
  const fullStars = roundedRating;
  const emptyStars = 5 - fullStars;
  return [...Array(fullStars).fill("★"), ...Array(emptyStars).fill("☆")];
};

const BusinessCard = ({
  businessName,
  stars,
  address,
  open,
  price,
}: BusinessCardProps) => {
  return (
    <div className="max-w-md flex shadow-md bg-white hover:bg-gray-50 focus:bg-gray-50 p-3 my-0.5 overflow-y-auto">
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-semibold text-dark">
            {businessName}
          </h2>
          <div className="flex items-center">
            <div className="flex text-yellow-200">
              {renderStars(stars).map((star, index) => (
                <span key={index}>{star}</span>
              ))}
            </div>
            <span className="text-sm text-dark ml-1">
              ({stars.toFixed(1)})
            </span>
          </div>
          <p className="text-dark text-sm">{address}</p>
          <p className="text-dark text-sm">
            Selling Price: <span className="font-bold">₹{price}/kg</span>
          </p>
          <div className="text-sm font-medium">
            {open ? (
              <span className="text-green-200">Open</span>
            ) : (
              <span className="text-red-200">Closed</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessCard;
