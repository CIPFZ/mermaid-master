import { fetch } from '@tauri-apps/plugin-http';
import { AIProvider } from '../store/aiStore';

// 定义一个简单的消息类型，解耦对 chatStore 的依赖
export interface APIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// 系统预设指令：教 AI 做人 (核心 Prompt)
const SYSTEM_PROMPT = `
You are an expert in Mermaid.js. 
Your task is to generate valid Mermaid diagrams based on user requests.
Rules:
1. Output ONLY the Mermaid code inside a markdown block like \`\`\`mermaid ... \`\`\`.
2. Do not include explanations unless requested.
3. If the user asks to modify an existing diagram, output the full updated code.
4. Use the "graph TD" or "sequenceDiagram" syntax by default unless specified otherwise.
5. Do not output any markdown formatting outside of the code block.
`;

export async function* streamChatCompletion(
    messages: APIMessage[],
    config: AIProvider,
    currentCode: string, // 把当前编辑器里的代码发给 AI，作为上下文
    signal?: AbortSignal,
) {
    // 1. 准备请求头
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
    };

    // 2. 准备上下文 (系统指令 + 当前代码 + 用户指令)
    const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        // 技巧：把当前 Mermaid 代码作为 System Context 告诉 AI
        { role: 'system', content: `Current Diagram Code:\n\`\`\`mermaid\n${currentCode}\n\`\`\`` },
        ...messages.map(m => ({ role: m.role, content: m.content }))
    ];
    console.log("🚀 [AI Debug] Sending Request to:", `${config.baseUrl}/chat/completions`);


    // 3. 发起 Fetch 请求
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: config.model,
            messages: apiMessages,
            stream: true, // 开启流式传输
        }),
        signal,
    });

    console.log(response.ok)
    console.log(response)

    if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [AI Debug] API Error:", errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    if (!response.body) throw new Error('No response body');

    console.log("✅ [AI Debug] Response Headers:", response.headers);

    // 4. 处理流式响应 (SSE Parsing)
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            console.log("🏁 [AI Debug] Stream Finished");
            break;
        }

        const chunk = decoder.decode(value, { stream: true });
        // console.log("📦 [AI Debug] Raw Chunk:", chunk);
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留未完整的行

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;

            // 解析 SSE 格式: data: {...}
            if (trimmed.match(/^data:\s?/)) {
                // 去掉 "data:" 前缀和可能存在的空格
                const jsonStr = trimmed.replace(/^data:\s?/, '').trim();

                if (jsonStr === '[DONE]') continue;

                try {
                    const json = JSON.parse(jsonStr);
                    const content = json.choices[0]?.delta?.content || '';

                    if (content) {
                        console.log("💬 [AI Debug] Content:", JSON.stringify(content));
                        yield content;
                    }
                } catch (e) {
                    console.warn("⚠️ [AI Debug] Parse Error:", e);
                }
            } else {
                // 🔥 调试点 3: 捕获非 'data:' 开头的异常行 🔥
                console.log("❓ [AI Debug] Unexpected Line:", trimmed);
            }
        }
    }
}