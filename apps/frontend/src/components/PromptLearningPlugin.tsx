import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { usePromptLearning } from '../context/PromptLearningContext';
import { submitAttemptSSE, checkHealth, getTechniques, uploadDataset, getDataset, type PromptingTechnique } from '../services/api';
import type { DatasetSample } from '../types';
import styles from '../styles/PluginWindow.module.css';

// Color palette for dynamic label colors
const LABEL_COLORS = [
  { bg: '#e8f5e8', text: '#2d5a2d' }, // green
  { bg: '#ffe8e8', text: '#8b2635' }, // red
  { bg: '#e8f0ff', text: '#1e40af' }, // blue
  { bg: '#fff3e8', text: '#9a3412' }, // orange
  { bg: '#f3e8ff', text: '#6b21a8' }, // purple
  { bg: '#e8fff3', text: '#065f46' }, // teal
  { bg: '#fff8e8', text: '#92400e' }, // amber
  { bg: '#ffe8f3', text: '#9d174d' }, // pink
];

// Get consistent color for a label based on its index in unique labels
const getLabelColor = (label: string, uniqueLabels: string[]) => {
  const index = uniqueLabels.indexOf(label);
  return LABEL_COLORS[index % LABEL_COLORS.length];
};

const SAMPLE_DATASET: DatasetSample[] = [
  { text: "Miami-Dade orders coastal evacuation as Hurricane Irma threatens CLICK BELOW FOR FULL STORY", label: "humanitarian" },
  { text: "@joenapoli7 @JohnKasich Look @ Moonbeams law on sex trafficked children! Opens flood gates wide open! #WeRAwake #WeRWatchingU #SaveOurChildren", label: "not_humanitarian" },
  { text: "Flood warning for Northwestern Marion Country til 9pm.", label: "humanitarian" },
  { text: "CFB & NFL weekend, Where will Vols/Gators be played, Irma kills Outkick servers", label: "not_humanitarian" },
  { text: "Calling all nurses! Florida is in desperate need in assistance. #Irma", label: "humanitarian" },
  { text: "#Lava Details • #Etna #Sicily", label: "not_humanitarian" },
  { text: "The number to call to donate to Irma victims through the @WBRCnews Salvation Army phone bank is: (205)583-4303", label: "humanitarian" },
  { text: "I'm not a scientist, but 4 degrees warmer water kicked our butts. Those are my findings.", label: "not_humanitarian" },
  { text: "Did your HVAC system get damaged by flooding?", label: "humanitarian" },
  { text: "Great commandments #exo100thwin #BattleofBritainDay #FeelGoodFriday #earthquake #Londra #BREAKING #쟤보지마 #Texans #GrandFinale #yesukraine2017", label: "not_humanitarian" },
  { text: "We've offered up our West Park Place parking lot to support @FLSERT & @FLGuard in Hurricane #Irma relief efforts. ➡️", label: "humanitarian" },
  { text: "You are not alone there are plenty of rolling stones. There was a wave in 2014 expect Tsunami in 2019.", label: "not_humanitarian" },
  { text: "My heart is with everyone affected by #HurricaneIrma. Stay safe out there, guys.", label: "humanitarian" },
  { text: "Helped Grandpa cut down two dead trees today in preparation for #HurricaneIrma. As you can see, I'm doing the heavy lifting. 💪 ~Maizy", label: "not_humanitarian" },
  { text: "#Breaking Evacuation Assistance Bus Routes for #NassauCounty Public Shelters #HurricaneIrma", label: "humanitarian" },
  { text: "@Newsweek The douchebaggery of the man's organization exceeds even that of his callow half-assed administration. Ick. #trump #HurricaneIrma #badtaste", label: "not_humanitarian" },
  { text: "Buyer Beware: Harvey and Irma damaged cars could enter used car market", label: "humanitarian" },
  { text: "10 CRAZIEST MINECRAFT STORMS! (TSUNAMI, TORNADOES, METEORS, MORE!)", label: "not_humanitarian" },
  { text: "RT @AJAYNY: the Caribbean needs our help: Hurricane #Irma Relief - by @anthoknees", label: "humanitarian" },
  { text: "Yes, 3 days after Mexico withdrew their offer 2 send aid & U cost victims because U were an inconsiderate ASS.", label: "not_humanitarian" }
];

interface PromptLearningPluginProps {
  onClose?: () => void;
}

export function PromptLearningPlugin({ onClose }: PromptLearningPluginProps) {
  const { state, dispatch, resetProgress } = usePromptLearning();
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendHealth, setBackendHealth] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState<string>('zero-shot');
  const [techniques, setTechniques] = useState<PromptingTechnique[]>([]);
  const [customDataset, setCustomDataset] = useState<DatasetSample[]>([]);
  const [isUploadingDataset, setIsUploadingDataset] = useState(false);

  // Compute unique labels for color assignment
  const uniqueLabels = useMemo(() => {
    const dataset = customDataset.length > 0 ? customDataset : SAMPLE_DATASET;
    return [...new Set(dataset.map(item => item.label))];
  }, [customDataset]);

  const checkBackendHealth = async () => {
    try {
      await checkHealth();
      setBackendHealth('healthy');
    } catch (error) {
      console.error('Backend health check failed:', error);
      setBackendHealth('unhealthy');
    }
  };

  const loadTechniques = async () => {
    try {
      const loadedTechniques = await getTechniques();
      setTechniques(loadedTechniques);
    } catch (error) {
      console.error('Failed to load techniques:', error);
    }
  };

  const loadCustomDataset = async () => {
    try {
      const dataset = await getDataset(state.userId);
      if (dataset && dataset.length > 0) {
        setCustomDataset(dataset);
      }
    } catch (error) {
      console.error('Failed to load custom dataset:', error);
    }
  };

  useEffect(() => {
    checkBackendHealth();
    loadTechniques();
    loadCustomDataset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmitPrompt = async () => {
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_STREAMING', payload: true });
    dispatch({ type: 'SET_STREAMING_CONTENT', payload: 'Initializing...' });

    try {
      const result = await submitAttemptSSE(
        {
          userId: state.userId,
          prompt: prompt.trim(),
          attemptNumber: state.currentAttempt,
          taskType: 'binary',
          technique: selectedTechnique as 'zero-shot' | 'few-shot' | 'chain-of-thought' | 'structured'
        },
        (message: string) => {
          // Real-time progress updates
          dispatch({ type: 'SET_STREAMING_CONTENT', payload: message });
        }
      );

      dispatch({ type: 'SET_STREAMING', payload: false });
      dispatch({ type: 'ADD_ATTEMPT', payload: result });
      setPrompt('');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_STREAMING', payload: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentAttemptData = state.attempts.find(a => a.attempt === state.currentAttempt);
  const canSubmit = prompt.trim().length >= 10 && !isSubmitting && backendHealth === 'healthy';
  const isCompleted = state.currentAttempt >= 3 && currentAttemptData;
  const hasCompletedCurrentAttempt = currentAttemptData !== undefined;
  const canMoveToNext = hasCompletedCurrentAttempt && state.currentAttempt < 3;
  const canMoveToPrevious = state.currentAttempt > 1;

  const handleNextAttempt = () => {
    dispatch({ type: 'SET_CURRENT_ATTEMPT', payload: state.currentAttempt + 1 });
    setPrompt('');
  };

  const handlePreviousAttempt = () => {
    dispatch({ type: 'SET_CURRENT_ATTEMPT', payload: state.currentAttempt - 1 });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingDataset(true);
    try {
      const result = await uploadDataset(state.userId, file);
      console.log('Dataset uploaded:', result);

      // Reload the custom dataset
      await loadCustomDataset();

      alert(`Dataset uploaded successfully! ${result.rowCount} rows loaded.`);
      setShowUploadModal(false);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setIsUploadingDataset(false);
    }
  };

  return (
    <div className={styles.pluginWindow}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>SMIDGen Prompt Training</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className={styles.uploadButton} onClick={() => setShowUploadModal(true)}>
            Upload CSV
          </button>
          <button className={styles.resetButton} onClick={resetProgress}>
            Reset
          </button>
          {onClose && (
            <button className={styles.closeButton} onClick={onClose}>
              ✕
            </button>
          )}
        </div>
      </header>

      <div className={styles.content}>
        {/* Instructions Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Instructions</h2>
          <p className={styles.instructionText}>
            You will <strong>write a prompt</strong> that instructs the Large-Language-Model (LLM) <strong>GPT-4o-mini</strong> to label Hurricane Irma tweets as either <strong><em>humanitarian</em></strong> or <strong><em>not_humanitarian</em></strong>.
          </p>

          <h3 className={styles.sectionTitle}>Category Definitions</h3>
          <p className={styles.instructionText}>
            <strong>humanitarian:</strong> Tweets that are useful for humanitarian aid during Hurricane Irma—for example: safety warnings; reports of injured or affected people; rescue, volunteering, or donation requests; descriptions of damage to homes, streets, or infrastructure; blocked roads/bridges; or disaster-area maps.
          </p>
          <p className={styles.instructionText}>
            <strong>not_humanitarian:</strong> Tweets that do not provide useful humanitarian information (e.g., unrelated commentary, opinions, or general statements not tied to disaster relief).
          </p>

          <h3 className={styles.sectionTitle}>
            Dataset Examples with Ground Truth
            {customDataset.length > 0 && (
              <span style={{ fontSize: '12px', color: '#4a5568', fontWeight: 'normal', marginLeft: '8px' }}>
                (Custom Dataset: {customDataset.length} items)
              </span>
            )}
          </h3>
          <div className={styles.datasetTableContainer}>
            <table className={styles.datasetTable}>
              <thead>
                <tr>
                  <th style={{width: '60%'}}>Text</th>
                  <th style={{width: '40%'}}>Ground Truth</th>
                </tr>
              </thead>
              <tbody>
                {(customDataset.length > 0 ? customDataset : SAMPLE_DATASET).map((item, index) => (
                  <tr key={index}>
                    <td>{item.text}</td>
                    <td>
                      <span style={{
                        backgroundColor: getLabelColor(item.label, uniqueLabels).bg,
                        color: getLabelColor(item.label, uniqueLabels).text,
                        fontWeight: 'bold',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        display: 'inline-block'
                      }}>
                        {item.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Prompt Input Section */}
        {!isCompleted && (
          <section className={`${styles.section} ${styles.promptSection}`}>
            <div className={styles.attemptCounter}>
              <span className={styles.attemptBadge}>Attempt {state.currentAttempt} / 3</span>
              {backendHealth === 'unhealthy' && (
                <span style={{ color: '#e53e3e', fontSize: '12px', marginLeft: '8px' }}>
                  ⚠️ Backend unavailable - check connection
                </span>
              )}
            </div>

            <div className={styles.promptForm}>
              <textarea
                className={styles.promptInput}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Write your classification prompt here... (minimum 10 characters)\n\nExample: 'Analyze the sentiment of the following text and classify it as either positive or negative based on the overall tone and emotional content.'"
                disabled={isSubmitting}
              />

              <div className={styles.submitRow}>
                <div className={styles.submitButtonGroup}>
                  <button
                    className={styles.submitButton}
                    onClick={handleSubmitPrompt}
                    disabled={!canSubmit}
                  >
                    {isSubmitting ? 'Processing...' : `Submit Attempt ${state.currentAttempt}`}
                  </button>

                  {techniques.length > 0 && (
                    <div className={styles.techniqueButtonsInline}>
                      <span className={styles.techniqueLabelInline}>with</span>
                      {techniques.map((tech) => (
                        <button
                          key={tech.id}
                          className={`${styles.techniqueButtonInline} ${selectedTechnique === tech.id ? styles.techniqueButtonInlineActive : ''}`}
                          onClick={() => setSelectedTechnique(tech.id)}
                          disabled={isSubmitting}
                          title={`${tech.description}\n\nBest for: ${tech.bestFor}`}
                        >
                          {tech.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedTechnique && techniques.find(t => t.id === selectedTechnique) && (
                  <p className={styles.techniqueHint}>
                    💡 {techniques.find(t => t.id === selectedTechnique)?.description}
                  </p>
                )}
              </div>
              
              {state.error && (
                <div className={styles.errorMessage}>
                  {state.error}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Results Section */}
        <section className={`${styles.section} ${styles.resultsSection}`}>
          <h2 className={styles.sectionTitle}>Results</h2>
          
          {state.isStreaming && (
            <div className={styles.streamingContent}>
              <div style={{ marginBottom: '12px', fontWeight: '600', color: '#2d3748' }}>
                Processing... This may take up to 2 minutes.
              </div>
              {state.streamingContent}
            </div>
          )}

          {currentAttemptData && !state.isStreaming && (
            <div className={styles.resultsGrid}>
              <div className={styles.metricsCard}>
                <h3 className={styles.sectionTitle}>Performance Metrics</h3>
                <div className={styles.metricsGrid}>
                  <div className={styles.metricItem}>
                    <p className={styles.metricValue}>
                      {(currentAttemptData.metrics.accuracy * 100).toFixed(1)}%
                    </p>
                    <p className={styles.metricLabel}>Accuracy</p>
                  </div>
                  <div className={styles.metricItem}>
                    <p className={styles.metricValue}>
                      {(currentAttemptData.metrics.precision * 100).toFixed(1)}%
                    </p>
                    <p className={styles.metricLabel}>Precision</p>
                  </div>
                  <div className={styles.metricItem}>
                    <p className={styles.metricValue}>
                      {(currentAttemptData.metrics.recall * 100).toFixed(1)}%
                    </p>
                    <p className={styles.metricLabel}>Recall</p>
                  </div>
                  <div className={styles.metricItem}>
                    <p className={styles.metricValue}>
                      {(currentAttemptData.metrics.f1Score * 100).toFixed(1)}%
                    </p>
                    <p className={styles.metricLabel}>F1 Score</p>
                  </div>
                </div>
              </div>

              <div className={styles.feedbackCard}>
                <h3 className={styles.sectionTitle}>AI Feedback</h3>
                <div className={styles.feedbackText}>
                  <ReactMarkdown>{currentAttemptData.feedback}</ReactMarkdown>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
                {canMoveToPrevious && (
                  <button
                    className={styles.previousButton}
                    onClick={handlePreviousAttempt}
                  >
                    View Attempt {state.currentAttempt - 1}
                  </button>
                )}
                {canMoveToNext && (
                  <button
                    className={styles.nextButton}
                    onClick={handleNextAttempt}
                  >
                    Continue to Attempt {state.currentAttempt + 1}
                  </button>
                )}
              </div>
            </div>
          )}

          {isCompleted && (
            <div className={styles.feedbackCard}>
              <h3 className={styles.sectionTitle}>Training Complete!</h3>
              <p className={styles.feedbackText}>
                You've completed all 3 attempts! Review your results above and use the insights
                you've gained to improve your prompting skills in real AI labeling tasks.
              </p>
            </div>
          )}

          {state.attempts.length === 0 && !state.isStreaming && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
              Submit your first prompt to see results here.
            </div>
          )}

          {/* Navigation buttons when no current attempt data */}
          {!currentAttemptData && !state.isStreaming && state.attempts.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
              {canMoveToPrevious && (
                <button
                  className={styles.previousButton}
                  onClick={handlePreviousAttempt}
                >
                  View Attempt {state.currentAttempt - 1}
                </button>
              )}
              {canMoveToNext && (
                <button
                  className={styles.nextButton}
                  onClick={handleNextAttempt}
                >
                  Continue to Attempt {state.currentAttempt + 1}
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {showUploadModal && (
        <div className={styles.modalOverlay} onClick={() => setShowUploadModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Upload Custom Dataset</h2>
            <p className={styles.modalDescription}>
              Upload a CSV file with your own labeled dataset for training. Required columns: <strong>text</strong>, <strong>label</strong>, <strong>id</strong>
            </p>

            <div className={styles.uploadArea}>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="csv-upload"
                disabled={isUploadingDataset}
              />
              <label htmlFor="csv-upload" className={`${styles.uploadLabel} ${isUploadingDataset ? styles.uploadLabelDisabled : ''}`}>
                {isUploadingDataset ? 'Uploading...' : 'Choose CSV File'}
              </label>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowUploadModal(false)}
                disabled={isUploadingDataset}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}