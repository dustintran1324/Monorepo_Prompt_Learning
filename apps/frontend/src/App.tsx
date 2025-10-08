import { PromptLearningProvider } from './context/PromptLearningContext';
import { PromptLearningPlugin } from './components/PromptLearningPlugin';
import './App.css';

function App() {
  return (
    <PromptLearningProvider>
      <div style={{
        minHeight: '100vh',
        background: '#ffffff',
        padding: '20px'
      }}>
        <PromptLearningPlugin />
      </div>
    </PromptLearningProvider>
  );
}

export default App
