const multer = require('multer');
const Papa = require('papaparse');
const fs = require('fs').promises;
const path = require('path');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

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

    // Read the uploaded CSV file
    const fileContent = await fs.readFile(req.file.path, 'utf-8');

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

    // Store dataset in memory or database (for now, we'll store in a JSON file)
    const datasetPath = path.join(__dirname, '../../uploads', `dataset-${userId}.json`);
    await fs.writeFile(datasetPath, JSON.stringify(normalizedData, null, 2));

    // Clean up uploaded CSV
    await fs.unlink(req.file.path);

    res.status(200).json({
      success: true,
      message: 'Dataset uploaded successfully',
      data: {
        rowCount: normalizedData.length,
        sampleData: normalizedData.slice(0, 10)
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

    const datasetPath = path.join(__dirname, '../../uploads', `dataset-${userId}.json`);

    try {
      const fileContent = await fs.readFile(datasetPath, 'utf-8');
      const dataset = JSON.parse(fileContent);

      res.status(200).json({
        success: true,
        message: 'Dataset retrieved successfully',
        data: dataset
      });
    } catch (error) {
      // No custom dataset found, return default
      res.status(404).json({
        success: false,
        message: 'No custom dataset found'
      });
    }
  } catch (error) {
    console.error('Error in getDataset:', error);
    next(error);
  }
};

module.exports = {
  upload,
  uploadDataset,
  getDataset
};
