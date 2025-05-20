import axios from "axios";
import { fetchWeatherApi } from "openmeteo";

type Address = {
  types: string[];
  long_name: string;
  short_name: string;
}

export async function getWeather(latitude: number, longitude: number) {
  const params = {
    latitude,
    longitude,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "rain",
      "showers",
      "snowfall",
      "cloud_cover",
      "pressure_msl",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ],
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "dew_point_2m",
      "precipitation_probability",
      "precipitation",
      "rain",
      "snowfall",
      "weather_code",
      "cloud_cover",
      "evapotranspiration",
      "wind_speed_10m",
      "wind_direction_10m",
      "soil_temperature_0cm",
      "soil_temperature_6cm",
      "soil_temperature_18cm",
      "soil_temperature_54cm",
      "soil_moisture_0_to_1cm",
      "soil_moisture_1_to_3cm",
      "soil_moisture_3_to_9cm",
      "soil_moisture_9_to_27cm",
      "soil_moisture_27_to_81cm",
      "uv_index",
    ],
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "daylight_duration",
      "sunshine_duration",
      "uv_index_max",
      "precipitation_sum",
      "rain_sum",
      "showers_sum",
      "snowfall_sum",
      "precipitation_hours",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "wind_gusts_10m_max",
      "wind_direction_10m_dominant",
      "et0_fao_evapotranspiration",
    ],
    timezone: "auto",
  };

  try {
    const responses = await fetchWeatherApi(
      "https://api.open-meteo.com/v1/forecast",
      params
    );

    const response = responses[0];

    const utcOffsetSeconds = response.utcOffsetSeconds();
    const current = response.current()!;
    const hourly = response.hourly()!;
    const daily = response.daily()!;

    const range = (start: number, stop: number, step: number) =>
      Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

    const weatherData = {
      current: {
        time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
        temperature2m: current.variables(0)?.value(),
        relativeHumidity2m: current.variables(1)?.value(),
        apparentTemperature: current.variables(2)?.value(),
        isDay: current.variables(3)?.value(),
        precipitation: current.variables(4)?.value(),
        rain: current.variables(5)?.value(),
        showers: current.variables(6)?.value(),
        snowfall: current.variables(7)?.value(),
        cloudCover: current.variables(8)?.value(),
        pressureMsl: current.variables(9)?.value(),
        surfacePressure: current.variables(10)?.value(),
        windSpeed10m: current.variables(11)?.value(),
        windDirection10m: current.variables(12)?.value(),
        windGusts10m: current.variables(13)?.value(),
      },
      hourly: {
        time: range(
          Number(hourly.time()),
          Number(hourly.timeEnd()),
          hourly.interval()
        ).map((t) => new Date((t + utcOffsetSeconds) * 1000)),
        temperature2m: hourly.variables(0)?.valuesArray() ?? [],
        relativeHumidity2m: hourly.variables(1)?.valuesArray() ?? [],
        dewPoint2m: hourly.variables(2)?.valuesArray() ?? [],
        precipitationProbability: hourly.variables(3)?.valuesArray() ?? [],
        precipitation: hourly.variables(4)?.valuesArray() ?? [],
        rain: hourly.variables(5)?.valuesArray() ?? [],
        snowfall: hourly.variables(6)?.valuesArray() ?? [],
        weatherCode: hourly.variables(7)?.valuesArray() ?? [],
        cloudCover: hourly.variables(8)?.valuesArray() ?? [],
        evapotranspiration: hourly.variables(9)?.valuesArray() ?? [],
        windSpeed10m: hourly.variables(10)?.valuesArray() ?? [],
        windDirection10m: hourly.variables(11)?.valuesArray() ?? [],
        soilTemperature0cm: hourly.variables(12)?.valuesArray() ?? [],
        soilTemperature6cm: hourly.variables(13)?.valuesArray() ?? [],
        soilTemperature18cm: hourly.variables(14)?.valuesArray() ?? [],
        soilTemperature54cm: hourly.variables(15)?.valuesArray() ?? [],
        soilMoisture0To1cm: hourly.variables(16)?.valuesArray() ?? [],
        soilMoisture1To3cm: hourly.variables(17)?.valuesArray() ?? [],
        soilMoisture3To9cm: hourly.variables(18)?.valuesArray() ?? [],
        soilMoisture9To27cm: hourly.variables(19)?.valuesArray() ?? [],
        soilMoisture27To81cm: hourly.variables(20)?.valuesArray() ?? [],
        uvIndexHourly: hourly.variables(21)?.valuesArray() ?? [],
      },
      daily: {
        time: range(
          Number(daily.time()),
          Number(daily.timeEnd()),
          daily.interval()
        ).map((t) => new Date((t + utcOffsetSeconds) * 1000)),
        temperature2mMax: daily.variables(0)?.valuesArray() ?? [],
        temperature2mMin: daily.variables(1)?.valuesArray() ?? [],
        daylightDuration: daily.variables(2)?.valuesArray() ?? [],
        sunshineDuration: daily.variables(3)?.valuesArray() ?? [],
        uvIndexMax: daily.variables(4)?.valuesArray() ?? [],
        precipitationSum: daily.variables(5)?.valuesArray() ?? [],
        rainSum: daily.variables(6)?.valuesArray() ?? [],
        showersSum: daily.variables(7)?.valuesArray() ?? [],
        snowfallSum: daily.variables(8)?.valuesArray() ?? [],
        precipitationHours: daily.variables(9)?.valuesArray() ?? [],
        precipitationProbabilityMax: daily.variables(10)?.valuesArray() ?? [],
        windSpeed10mMax: daily.variables(11)?.valuesArray() ?? [],
        windGusts10mMax: daily.variables(12)?.valuesArray() ?? [],
        windDirection10mDominant: daily.variables(13)?.valuesArray() ?? [],
        et0FaoEvapotranspiration: daily.variables(14)?.valuesArray() ?? [],
      },
    };

    return weatherData;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw new Error("Failed to fetch weather data");
  }
}

export async function fetchCityName(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      throw new Error("Google Maps API key is missing.");
    }

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          latlng: `${latitude},${longitude}`,
          key: apiKey,
        },
      }
    );

    const data = response.data;
    const cityComponent = data.results[0]?.address_components.find(
      (component: Address) => component.types.includes("locality")
    );

    return cityComponent?.long_name || "Your Location";
  } catch (err: unknown) {
    let errorMessage = "Unknown error";

    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      typeof err.response === "object" &&
      err.response !== null &&
      "data" in err.response &&
      typeof err.response.data === "object" &&
      err.response.data !== null &&
      "error_message" in err.response.data
    ) {
      errorMessage = String(err.response.data.error_message);
    }

    console.error(errorMessage);
    return "Unknown city";
  }
}
