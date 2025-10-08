const express = require('express');
const { upload, uploadDataset, getDataset } = require('../controllers/datasetController');
const { validateUserIdParam } = require('../middleware/validation');

const router = express.Router();

router.post('/upload', upload.single('file'), uploadDataset);

router.get('/user/:userId', validateUserIdParam, getDataset);

module.exports = router;
