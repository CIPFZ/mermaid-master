import { useEffect } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { EditorPanel } from './components/EditorPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { TabBar } from './components/TabBar';
import { saveFile, openFile } from './utils/fileManager';
import { SettingsModal } from './components/SettingsModal';
import { useAIStore } from './store/aiStore';
import { CommandBar } from './components/CommandBar';

function App() {

    // 4. 全局快捷键监听
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isCmd = e.ctrlKey || e.metaKey;

            // Ctrl + S: 保存
            if (isCmd && e.key === 's') {
                e.preventDefault();
                saveFile();
            }

            // Ctrl + O: 打开
            if (isCmd && e.key === 'o') {
                e.preventDefault();
                openFile();
            }

            // 🔥 已删除 Ctrl + E 逻辑 🔥

            // Ctrl + K: 唤起 AI 指令栏
            if (isCmd && e.key === 'k') {
                const { isSettingsOpen, isCommandBarOpen, setCommandBarOpen } = useAIStore.getState();

                if (isSettingsOpen) return;

                e.preventDefault();
                setCommandBarOpen(!isCommandBarOpen);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="h-screen w-screen bg-slate-950 text-white flex flex-col">
            <TabBar />
            <div className="flex-1 overflow-hidden relative">
                <Group orientation="horizontal">
                    <Panel defaultSize={40} minSize={20} className="flex flex-col">
                        <EditorPanel />
                    </Panel>

                    <Separator
                        className="w-1 bg-transparent hover:bg-blue-500/20 active:bg-blue-500/50 transition-colors duration-200 cursor-col-resize z-50 -ml-0.5 outline-none focus:outline-none"
                    />

                    <Panel defaultSize={60} minSize={20} className="flex flex-col">
                        <PreviewPanel />
                    </Panel>
                </Group>
            </div>
            <SettingsModal />
            <CommandBar />
        </div>
    );
}

export default App;