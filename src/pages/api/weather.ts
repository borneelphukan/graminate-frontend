import { NextApiRequest, NextApiResponse } from "next";
import { getWeather } from "@/lib/utils/loadWeather";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res
      .status(400)
      .json({ error: "Latitude and Longitude are required" });
  }

  try {
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error("Invalid latitude or longitude");
    }

    const weatherData = await getWeather(latitude, longitude);
    return res.status(200).json(weatherData);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return res.status(500).json({ error: "Failed to fetch weather data" });
  }
}
