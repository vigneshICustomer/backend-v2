import { Request, Response } from "express";
import { EnrichTemplateService } from "../../services/EnrichTemplateService";
import catchAsync from "../../utils/catchAsync";
import logger from "@/utils/logger";

/**
 * Enrich Template Controllers
 * Handle HTTP requests for enrich template operations
 */

/**
 * Delete template (exact copy from enrichTemplate_controller.js)
 * POST /enrichTemplate/deleteTemplate
 */
export const deleteTemplate = catchAsync(
  async (req: Request, res: Response) => {
    const { recordID } = req.body;

    try {
      const result = await EnrichTemplateService.deleteTemplate(recordID);
      res.status(200).json(result);
    } catch (error) {
      logger.error(
        `Error at enrichTemplateController :: deleteTemplate() :: ${error}`
      );
      res.status(500).json({ message: "Error deleting data" });
    }
  }
);
