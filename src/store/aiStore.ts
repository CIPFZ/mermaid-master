import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AIProvider {
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
}

interface AIState {
    provider: AIProvider;
    isSettingsOpen: boolean;

    // 🔥 新增：指令栏开关 🔥
    isCommandBarOpen: boolean;
    // 🔥 新增：全局生成状态 🔥
    isGenerating: boolean;

    updateProvider: (partial: Partial<AIProvider>) => void;
    setSettingsOpen: (isOpen: boolean) => void;

    // 🔥 新增 action 🔥
    setCommandBarOpen: (isOpen: boolean) => void;
    setGenerating: (isGenerating: boolean) => void;
}

// 默认配置 (以 OpenAI 格式为例，用户可改为 DeepSeek 等)
const DEFAULT_PROVIDER: AIProvider = {
    id: 'custom',
    name: 'Custom OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o', // 或者 deepseek-chat
};

export const useAIStore = create<AIState>()(
    persist(
        (set) => ({
            provider: DEFAULT_PROVIDER,
            isSettingsOpen: false,
            isCommandBarOpen: false,
            isGenerating: false,

            updateProvider: (partial) =>
                set((state) => ({
                    provider: { ...state.provider, ...partial }
                })),

            setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
            setCommandBarOpen: (isOpen) => set({ isCommandBarOpen: isOpen }),
            setGenerating: (isGenerating) => set({ isGenerating }),
        }),
        {
            name: 'mermaid-master-ai-config',
            storage: createJSONStorage(() => localStorage),
            // 只持久化 provider 配置，不持久化弹窗开关状态，isGenerating 不需要持久化，刷新后应该重置
            partialize: (state) => ({ provider: state.provider } as any),
        }
    )
);