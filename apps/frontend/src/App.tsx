import { PromptLearningProvider } from './context/PromptLearningContext';
import { PromptLearningPlugin } from './components/PromptLearningPlugin';
import './App.css';

function App() {
  return (
    <PromptLearningProvider>
      <PromptLearningPlugin />
    </PromptLearningProvider>
  );
}

export default App
