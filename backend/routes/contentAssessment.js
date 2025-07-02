import express from 'express';
import { ContentAssessmentService } from '../services/contentAssessment.js';
import FlaggedContent from '../models/FlaggedContent.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const assessContentSchema = Joi.object({
  content: Joi.string().required().min(1).max(10000),
  contentType: Joi.string().valid('mood_entry', 'daily_activity', 'journal_entry', 'comment', 'other').default('other'),
  userId: Joi.string().required(),
  userEmail: Joi.string().email().required()
});

const updateFlaggedContentSchema = Joi.object({
  status: Joi.string().valid('pending', 'reviewed', 'resolved', 'false_positive').required(),
  adminNotes: Joi.string().max(1000).optional(),
  reviewedBy: Joi.string().required()
});

// Assess content and flag if necessary
router.post('/assess', async (req, res) => {
  try {
    const { error, value } = assessContentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { content, contentType, userId, userEmail } = value;

    // Assess content using LLM
    const assessment = await ContentAssessmentService.assessContent(content, contentType);

    // If content is flagged, save to database
    if (assessment.isFlagged) {
      const flaggedContent = new FlaggedContent({
        userId,
        userEmail,
        contentType,
        originalContent: content,
        flaggedReason: assessment.reason || 'other',
        confidence: assessment.confidence,
        severity: assessment.severity,
        explanation: assessment.explanation
      });

      await flaggedContent.save();

      // Check if escalation is needed
      const shouldEscalate = ContentAssessmentService.shouldEscalate(assessment);

      return res.json({
        success: true,
        flagged: true,
        assessment,
        flaggedContentId: flaggedContent._id,
        shouldEscalate,
        message: 'Content flagged for admin review'
      });
    }

    return res.json({
      success: true,
      flagged: false,
      assessment,
      message: 'Content passed assessment'
    });

  } catch (error) {
    console.error('Content assessment error:', error);
    res.status(500).json({ error: 'Internal server error during content assessment' });
  }
});

// Get all flagged content (admin only)
router.get('/flagged', async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const skip = (page - 1) * limit;
    
    const flaggedContent = await FlaggedContent.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await FlaggedContent.countDocuments(filter);

    res.json({
      success: true,
      data: flaggedContent,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get flagged content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get flagged content by ID
router.get('/flagged/:id', async (req, res) => {
  try {
    const flaggedContent = await FlaggedContent.findById(req.params.id);
    
    if (!flaggedContent) {
      return res.status(404).json({ error: 'Flagged content not found' });
    }

    res.json({
      success: true,
      data: flaggedContent
    });

  } catch (error) {
    console.error('Get flagged content by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update flagged content status (admin only)
router.put('/flagged/:id', async (req, res) => {
  try {
    const { error, value } = updateFlaggedContentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { status, adminNotes, reviewedBy } = value;

    const flaggedContent = await FlaggedContent.findById(req.params.id);
    
    if (!flaggedContent) {
      return res.status(404).json({ error: 'Flagged content not found' });
    }

    flaggedContent.status = status;
    flaggedContent.adminNotes = adminNotes || flaggedContent.adminNotes;
    flaggedContent.reviewedBy = reviewedBy;
    flaggedContent.reviewedAt = new Date();

    await flaggedContent.save();

    res.json({
      success: true,
      data: flaggedContent,
      message: 'Flagged content updated successfully'
    });

  } catch (error) {
    console.error('Update flagged content error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get flagged content statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await FlaggedContent.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          critical: {
            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
          },
          high: {
            $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
          }
        }
      }
    ]);

    const severityStats = await FlaggedContent.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    const reasonStats = await FlaggedContent.aggregate([
      {
        $group: {
          _id: '$flaggedReason',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || { total: 0, pending: 0, critical: 0, high: 0 },
        severity: severityStats,
        reasons: reasonStats
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch assess multiple content items
router.post('/assess/batch', async (req, res) => {
  try {
    const { contentArray, contentType, userId, userEmail } = req.body;

    if (!Array.isArray(contentArray) || contentArray.length === 0) {
      return res.status(400).json({ error: 'Content array is required and must not be empty' });
    }

    if (contentArray.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 items can be assessed at once' });
    }

    const assessments = await ContentAssessmentService.batchAssessContent(contentArray, contentType);
    const flaggedItems = [];

    // Save flagged content to database
    for (const item of assessments) {
      if (item.assessment.isFlagged) {
        const flaggedContent = new FlaggedContent({
          userId,
          userEmail,
          contentType,
          originalContent: item.content,
          flaggedReason: item.assessment.reason || 'other',
          confidence: item.assessment.confidence,
          severity: item.assessment.severity,
          explanation: item.assessment.explanation
        });

        await flaggedContent.save();
        flaggedItems.push({
          content: item.content,
          assessment: item.assessment,
          flaggedContentId: flaggedContent._id
        });
      }
    }

    res.json({
      success: true,
      assessments,
      flaggedItems,
      totalFlagged: flaggedItems.length
    });

  } catch (error) {
    console.error('Batch assessment error:', error);
    res.status(500).json({ error: 'Internal server error during batch assessment' });
  }
});

export default router; 