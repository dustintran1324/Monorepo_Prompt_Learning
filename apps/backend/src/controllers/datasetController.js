const multer = require('multer');
const Papa = require('papaparse');
const Dataset = require('../models/Dataset');

// Configure multer for memory storage (no file system needed)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const uploadDataset = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Read the uploaded CSV from memory buffer
    const fileContent = req.file.buffer.toString('utf-8');

    // Parse CSV
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase()
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Error parsing CSV',
        errors: parseResult.errors
      });
    }

    const data = parseResult.data;

    // Validate required columns
    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty'
      });
    }

    const firstRow = data[0];
    const hasText = 'text' in firstRow || 'tweet_text' in firstRow;
    const hasLabel = 'label' in firstRow || 'class_label' in firstRow;
    const hasId = 'id' in firstRow || 'tweet_id' in firstRow;

    if (!hasText || !hasLabel || !hasId) {
      return res.status(400).json({
        success: false,
        message: 'CSV must contain columns: text (or tweet_text), label (or class_label), and id (or tweet_id)',
        foundColumns: Object.keys(firstRow)
      });
    }

    // Normalize column names
    const normalizedData = data.map((row, index) => ({
      id: row.id || row.tweet_id || index,
      text: row.text || row.tweet_text,
      label: row.label || row.class_label
    }));

    // Get unique labels for metadata
    const uniqueLabels = [...new Set(normalizedData.map(row => row.label))];

    // Store dataset in MongoDB (upsert - update if exists, create if not)
    await Dataset.findOneAndUpdate(
      { userId },
      {
        userId,
        samples: normalizedData,
        metadata: {
          rowCount: normalizedData.length,
          originalFilename: req.file.originalname,
          labels: uniqueLabels
        }
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Dataset uploaded successfully',
      data: {
        rowCount: normalizedData.length,
        labels: uniqueLabels,
        sampleData: normalizedData.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Error in uploadDataset:', error);
    next(error);
  }
};

const getDataset = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const dataset = await Dataset.findOne({ userId });

    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: 'No custom dataset found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Dataset retrieved successfully',
      data: dataset.samples,
      metadata: dataset.metadata
    });
  } catch (error) {
    console.error('Error in getDataset:', error);
    next(error);
  }
};

const deleteDataset = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = await Dataset.findOneAndDelete({ userId });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No dataset found to delete'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Dataset deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteDataset:', error);
    next(error);
  }
};

module.exports = {
  upload,
  uploadDataset,
  getDataset,
  deleteDataset
};
