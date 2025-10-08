import { PromptLearningProvider } from './context/PromptLearningContext';
import { PromptLearningPlugin } from './components/PromptLearningPlugin';
import './App.css';

function App() {
  return (
    <PromptLearningProvider>
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <PromptLearningPlugin />
      </div>
    </PromptLearningProvider>
  );
}

export default App
