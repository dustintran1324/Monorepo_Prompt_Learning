const mongoose = require('mongoose');

const sampleSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  }
}, { _id: false });

const datasetSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  samples: {
    type: [sampleSchema],
    required: true
  },
  metadata: {
    rowCount: Number,
    originalFilename: String,
    labels: [String]
  }
}, {
  timestamps: true,
  collection: 'datasets'
});

const Dataset = mongoose.model('Dataset', datasetSchema);

module.exports = Dataset;
