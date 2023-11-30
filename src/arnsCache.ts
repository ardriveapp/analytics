import { formatObserverHealthCheckUrl, retryFetch } from "./utilities";
import axios from "axios";

export async function fetchJoinedGateways(
  url: string
): Promise<{ [address: string]: any }> {
  try {
    // Fetch data from the URL
    const response = await retryFetch(url);
    const data = JSON.parse(response.data);

    // Check if data contains 'gateways' and it's an object
    if (!data.gateways || typeof data.gateways !== "object") {
      throw new Error("Invalid data format: Expected gateways object");
    }
    // Process and return the gateways
    return data.gateways;
  } catch (error) {
    console.error("Error fetching or processing gateways:", error);
    throw error; // Rethrow the error to be handled by the caller
  }
}

export async function getObserverUptime(gateway: any): Promise<number> {
  try {
    // Fetch data from the URL
    const observerHealthCheckUrl = formatObserverHealthCheckUrl(gateway);
    const response = await axios.get(observerHealthCheckUrl);
    const data = response.data;

    // Check if data contains 'uptime' and it's an number
    if (!data.uptime || typeof data.uptime !== "number") {
      throw new Error("Invalid data format: Expected gateways object");
    }
    // Process and return the uptime
    return data.uptime;
  } catch (error) {
    // console.error("Error fetching or processing observer url:", error);
    return 0;
  }
}
