const express = require('express');
const { upload, uploadDataset, getDataset, deleteDataset } = require('../controllers/datasetController');
const { validateUserIdParam } = require('../middleware/validation');

const router = express.Router();

router.post('/upload', upload.single('file'), uploadDataset);

router.get('/user/:userId', validateUserIdParam, getDataset);

router.delete('/user/:userId', validateUserIdParam, deleteDataset);

module.exports = router;
