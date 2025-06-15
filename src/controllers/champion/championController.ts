import { Request, Response } from 'express';
import { ChampionService } from '../../services/ChampionService';
import catchAsync from '../../utils/catchAsync';
import { AuthenticatedRequest } from '../../types/api';

/**
 * Champion Controllers
 * Handle HTTP requests for champion tracking operations
 */

/**
 * Get picklist values (exact copy from championTracking_controller.js)
 * POST /champion/getPicklistValues
 */
export const getPicklistValues = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { email, organization_domain } = req.user || {};
  const { object } = req.body;
  
  console.log(req.user);

  try {
    const result = await ChampionService.getPicklistValues(email || '', organization_domain || '', object);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      error: error,
      message: "Server down, please try after sometime",
    });
  }
});
