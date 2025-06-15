import { Request, Response } from 'express';
import { EnrichTemplateService } from '../../services/EnrichTemplateService';
import catchAsync from '../../utils/catchAsync';

/**
 * Enrich Template Controllers
 * Handle HTTP requests for enrich template operations
 */

/**
 * Delete template (exact copy from enrichTemplate_controller.js)
 * POST /enrichTemplate/deleteTemplate
 */
export const deleteTemplate = catchAsync(async (req: Request, res: Response) => {
  const { recordID } = req.body;

  try {
    const result = await EnrichTemplateService.deleteTemplate(recordID);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Error deleting data" });
  }
});
