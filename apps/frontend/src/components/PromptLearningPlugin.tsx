import { useState, useEffect } from 'react';
import { usePromptLearning } from '../context/PromptLearningContext';
import { submitAttempt, checkHealth } from '../services/api';
import type { DatasetSample } from '../types';
import styles from '../styles/PluginWindow.module.css';

const SAMPLE_DATASET: DatasetSample[] = [
  { text: "This movie was absolutely fantastic!", label: "positive" },
  { text: "I really hated this film", label: "negative" },
  { text: "The acting was superb and the plot engaging", label: "positive" },
  { text: "Boring and predictable storyline", label: "negative" },
  { text: "One of the best movies I've ever seen", label: "positive" }
];

interface PromptLearningPluginProps {
  onClose?: () => void;
}

export function PromptLearningPlugin({ onClose }: PromptLearningPluginProps) {
  const { state, dispatch, resetProgress } = usePromptLearning();
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendHealth, setBackendHealth] = useState<'checking' | 'healthy' | 'unhealthy'>('checking');

  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      await checkHealth();
      setBackendHealth('healthy');
    } catch (error) {
      console.error('Backend health check failed:', error);
      setBackendHealth('unhealthy');
    }
  };

  const handleSubmitPrompt = async () => {
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_STREAMING', payload: true });
    dispatch({ type: 'SET_STREAMING_CONTENT', payload: 'Processing your prompt...' });

    try {
      dispatch({ type: 'APPEND_STREAMING_CONTENT', payload: '\n\nRunning classification on dataset...' });
      
      const result = await submitAttempt({
        userId: state.userId,
        prompt: prompt.trim(),
        attemptNumber: state.currentAttempt,
        taskType: 'binary'
      });

      dispatch({ type: 'APPEND_STREAMING_CONTENT', payload: '\n\nGenerating feedback...' });
      
      setTimeout(() => {
        dispatch({ type: 'SET_STREAMING', payload: false });
        dispatch({ type: 'ADD_ATTEMPT', payload: result });
        setPrompt('');
      }, 1000);

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
  const isCompleted = state.currentAttempt > 3 || (state.currentAttempt === 3 && currentAttemptData);

  return (
    <div className={styles.pluginWindow}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Prompt Learning Assistant</h1>
          <p className={styles.subtitle}>Learn to write better prompts for AI classification</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
            Your task is to write prompts that can accurately classify movie reviews as positive or negative. 
            You have 3 attempts to improve your prompting skills. Study the sample dataset below, then write 
            a prompt that will help an AI model classify similar text correctly.
          </p>
          
          <h3 className={styles.sectionTitle}>Sample Dataset</h3>
          <div className={styles.datasetGrid}>
            {SAMPLE_DATASET.map((item, index) => (
              <div key={index} className={styles.datasetItem}>
                <p className={styles.datasetText}>"{item.text}"</p>
                <p className={styles.datasetLabel}>{item.label}</p>
              </div>
            ))}
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
              
              <button
                className={styles.submitButton}
                onClick={handleSubmitPrompt}
                disabled={!canSubmit}
              >
                {isSubmitting ? 'Processing...' : `Submit Attempt ${state.currentAttempt}`}
              </button>
              
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
                <p className={styles.feedbackText}>{currentAttemptData.feedback}</p>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className={styles.feedbackCard}>
              <h3 className={styles.sectionTitle}>🎉 Training Complete!</h3>
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
        </section>
      </div>
    </div>
  );
}