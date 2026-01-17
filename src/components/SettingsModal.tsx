import { X, Settings as SettingsIcon, Save } from 'lucide-react';
import { useAIStore } from '../store/aiStore';

export const SettingsModal = () => {
    const { isSettingsOpen, setSettingsOpen, provider, updateProvider } = useAIStore();

    if (!isSettingsOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-120 bg-[#1e1e1e] border border-[#3e3e3e] rounded-lg shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="h-12 border-b border-[#3e3e3e] flex items-center justify-between px-4 bg-[#252526]">
                    <div className="flex items-center gap-2 text-gray-200 font-medium">
                        <SettingsIcon size={18} />
                        <span>AI Configuration</span>
                    </div>
                    <button
                        onClick={() => setSettingsOpen(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-5">

                    {/* Base URL */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Base URL</label>
                        <input
                            type="text"
                            value={provider.baseUrl}
                            onChange={(e) => updateProvider({ baseUrl: e.target.value })}
                            placeholder="https://api.openai.com/v1"
                            className="bg-[#2d2d2d] border border-[#3e3e3e] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-600"
                        />
                        <div className="text-[10px] text-gray-500">
                            Compatible with OpenAI, DeepSeek, Ollama, etc. (e.g. https://api.deepseek.com)
                        </div>
                    </div>

                    {/* API Key */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">API Key</label>
                        <input
                            type="password"
                            value={provider.apiKey}
                            onChange={(e) => updateProvider({ apiKey: e.target.value })}
                            placeholder="sk-..."
                            className="bg-[#2d2d2d] border border-[#3e3e3e] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-600 font-mono"
                        />
                    </div>

                    {/* Model Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Model Name</label>
                        <input
                            type="text"
                            value={provider.model}
                            onChange={(e) => updateProvider({ model: e.target.value })}
                            placeholder="gpt-4o"
                            className="bg-[#2d2d2d] border border-[#3e3e3e] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-gray-600"
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="h-14 border-t border-[#3e3e3e] bg-[#252526] px-4 flex items-center justify-end">
                    <button
                        onClick={() => setSettingsOpen(false)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
                    >
                        <Save size={14} />
                        <span>Save & Close</span>
                    </button>
                </div>

            </div>
        </div>
    );
};