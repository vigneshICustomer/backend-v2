import axios from 'axios';
import ApiError from '../utils/ApiError';

/**
 * Champion Service
 * Handles champion tracking operations - exact copy from original backend
 */
export class ChampionService {
  /**
   * Get picklist values (exact copy of getPicklistValues from championTracking_controller.js)
   */
  static async getPicklistValues(userEmail: string, organizationDomain: string, object: string): Promise<any> {
    let email = userEmail;

    // Exact logic from original - override email for specific domains
    if (organizationDomain === "reltio.com" || organizationDomain === "zillasecurity.com" || organizationDomain === "icustomer.ai" || organizationDomain === "b2c.com") {
      email = 'ravi@icustomer.ai';
    }

    try {
      const config = {
        method: "POST",
        url: `https://puthukmcheiyc3fo5d7ajjf7be0irmok.lambda-url.us-east-1.on.aws/salesforce-object-column-label`,
        params: {
          email,
          object,
        },
        headers: {
          accept: "application/json",
          token: "Vr7pXhLbR6wA3yZuQ2eF",
          "Content-Type": "application/json",
        },
        timeout: 30000,
      };

      const response = await axios.request(config);
      
      return { responseData: response?.data };
    } catch (error) {
      console.error(error);
      throw ApiError.internal("Server down, please try after sometime");
    }
  }
}
