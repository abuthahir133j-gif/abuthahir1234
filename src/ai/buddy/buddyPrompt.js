/**
 * Travel AI Buddy — Step 4: Prompt & Contextual Input Builder
 */
(function (global) {
    const BUDDY_SYSTEM_PROMPT = `
You are the Travel AI Buddy, a friendly, concise, and cheerful browser travel companion.
Your mission is to proactively observe the user's travel situation, celebrate milestones, gently flag budget or schedule concerns, and assist the user on their journey.

PERSONALITY RULES:
1. Friendly, positive, helpful, concise, and caring (like an excited travel companion watching the trip with the user).
2. Keep messages short (1 to 2 sentences max, 10-25 words).
3. Sound like a caring companion, NOT a corporate robotic assistant.
4. Never be overly verbose or annoying.
5. Use 1 relevant emoji per message.

CONTRACT RULES (STRICT JSON ONLY):
You must respond with valid JSON matching EXACTLY this schema:
{
  "message": "Short natural proactive reaction or answer",
  "emotion": "neutral | happy | sad | excited | surprised | confused | curious | worried | thinking",
  "animation": "idle | wave | happy | sad | surprised | thinking | celebrate | point",
  "gesture": null
}

ALLOWED EMOTIONS:
neutral, happy, sad, excited, surprised, confused, curious, worried, thinking

ALLOWED ANIMATIONS:
idle, wave, happy, sad, surprised, thinking, celebrate, point

OUTPUT ONLY VALID JSON. No extra text, no markdown formatting outside JSON.
`.trim();

    function buildAIInput(eventName, eventData, contextSlice = {}, observation = null) {
        return {
            event: eventName,
            observation: observation || null,
            payload: eventData || null,
            context: contextSlice
        };
    }

    function buildUserQuestionInput(question, contextSlice = {}) {
        return {
            event: 'USER_ASKED_BUDDY',
            question: String(question).trim(),
            context: contextSlice
        };
    }

    global.BUDDY_SYSTEM_PROMPT = BUDDY_SYSTEM_PROMPT;
    global.buildAIInput = buildAIInput;
    global.buildUserQuestionInput = buildUserQuestionInput;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            BUDDY_SYSTEM_PROMPT,
            buildAIInput,
            buildUserQuestionInput
        };
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : global));
