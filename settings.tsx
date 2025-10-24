import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import type { Settings } from './types';

const PROVIDER_MODELS = {
  openai: [
    { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Multimodal - Text, images, voice' },
    { id: 'gpt-5', name: 'GPT-5', description: 'Latest GPT model' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', description: 'Latest Claude model' },
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Opus 4.1', description: 'Most capable Claude' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Balance of speed and capability' },
  ],
  google: [
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: '1M token context' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast and efficient' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Optimized for speed' },
  ],
};

function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4.1',
    toolMode: 'tool-router',
    composioApiKey: '',
  });
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showComposioKey, setShowComposioKey] = useState(false);

  useEffect(() => {
    // Load settings from chrome.storage
    chrome.storage.local.get(['atlasSettings'], (result) => {
      if (result.atlasSettings) {
        setSettings(result.atlasSettings);
      }
    });
  }, []);

  const handleSave = () => {
    chrome.storage.local.set({ atlasSettings: settings }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const handleProviderChange = (provider: 'openai' | 'anthropic' | 'google') => {
    setSettings({
      ...settings,
      provider,
      model: PROVIDER_MODELS[provider][0].id,
    });
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Configure your AI provider and preferences</p>
      </div>

      <div className="settings-content">
        <div className="setting-group">
          <label>AI Provider</label>
          <div className="provider-buttons">
            {(['openai', 'anthropic', 'google'] as const).map((provider) => (
              <button
                key={provider}
                className={`provider-button ${settings.provider === provider ? 'active' : ''}`}
                onClick={() => handleProviderChange(provider)}
              >
                {provider === 'openai' && 'OpenAI'}
                {provider === 'anthropic' && 'Anthropic'}
                {provider === 'google' && 'Google'}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-group">
          <label>Model</label>
          <select
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            className="model-select"
          >
            {PROVIDER_MODELS[settings.provider].map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} - {model.description}
              </option>
            ))}
          </select>
        </div>

        <div className="setting-group">
          <label>Composio API Key</label>
          <div className="api-key-input-wrapper">
            <input
              type={showComposioKey ? 'text' : 'password'}
              value={settings.composioApiKey || ''}
              onChange={(e) => setSettings({ ...settings, composioApiKey: e.target.value })}
              placeholder="Enter your Composio API key (optional)"
              className="api-key-input"
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowComposioKey(!showComposioKey)}
            >
              {showComposioKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <p className="help-text">
            Enable Composio Tool Router for access to 500+ app integrations. Get your key from{' '}
            <a href="https://app.composio.dev/settings" target="_blank" rel="noopener noreferrer">
              Composio Dashboard
            </a>
          </p>
        </div>

        <div className="setting-group">
          <label>{settings.provider.charAt(0).toUpperCase() + settings.provider.slice(1)} API Key</label>
          <div className="api-key-input-wrapper">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder={`Enter your ${settings.provider.toUpperCase()} API key`}
              className="api-key-input"
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <p className="help-text">
            Get your API key from:{' '}
            {settings.provider === 'openai' && (
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                OpenAI Platform
              </a>
            )}
            {settings.provider === 'anthropic' && (
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">
                Anthropic Console
              </a>
            )}
            {settings.provider === 'google' && (
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                Google AI Studio
              </a>
            )}
          </p>
        </div>

        <button
          className={`save-button ${saved ? 'saved' : ''}`}
          onClick={handleSave}
          disabled={!settings.apiKey}
        >
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>

        <div className="feature-cards">
          <div className="feature-card">
            <div className="feature-icon">◉</div>
            <h3>Browser Tools</h3>
            <p>Click the Browser Tools button (◉) to enable Gemini 2.5 Computer Use for direct browser automation with screenshots</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔧</div>
            <h3>Tool Router</h3>
            <p>Add Composio API key to access 500+ integrations (Gmail, Slack, GitHub, etc.) via AI SDK</p>
          </div>
        </div>

        <div className="info-box">
          <h3>🔒 Privacy & Security</h3>
          <p>Your API keys are stored locally in your browser and only sent to the respective AI providers. Never shared with third parties.</p>
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<SettingsPage />);
