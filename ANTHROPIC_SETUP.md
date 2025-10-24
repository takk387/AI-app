# Anthropic Claude Setup

Your app now uses **Claude 3.5 Sonnet** (or Claude Sonnet 4.5 if available) instead of OpenAI GPT models!

## Getting Your API Key

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **Settings** → **API Keys**
4. Click **Create Key**
5. Copy your API key (starts with `sk-ant-`)

## Configure Your App

1. Open `.env.local` in your project root
2. Add your key:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
3. Restart your dev server:
   ```bash
   npm run dev
   ```

## Model Information

The app attempts to use:
- **Primary**: `claude-sonnet-4.5` (if it exists as of Oct 2025)
- **Fallback**: The system will suggest checking Anthropic docs if the model isn't found

If you get a model error, update the model name in `src/app/api/ai-builder/route.ts` to:
- `claude-3-5-sonnet-20241022` (latest as of late 2024)
- Or check [Anthropic's model documentation](https://docs.anthropic.com/claude/docs/models-overview)

## Benefits of Claude

✅ Superior code quality for React/TypeScript
✅ Better at following complex instructions
✅ More reliable and fewer hallucinations
✅ Excellent understanding of modern frameworks
✅ Great for full-app architecture

## Pricing

Claude 3.5 Sonnet pricing (subject to change):
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens

Still very affordable for component generation!
