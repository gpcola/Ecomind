import { GoogleGenAI, Type } from "@google/genai";

export interface MemoryState {
  visitor_id: string;
  long_term_themes: string[];
  recurring_patterns: string[];
  emotional_tones: string[];
  double_binds_detected: string[];
  assumptions_noted: string[];
  contextual_motifs: string[];
}

export interface EpistemicStance {
  confidence: number;
  subtle_indicator_text: string;
}

export interface EcomindOutput {
  conversational_response: string;
  detected_patterns: string[];
  ecological_reframing: string;
  level_of_learning: "Learning I" | "Learning II" | "Learning III";
  updated_memory: MemoryState;
  suggested_prompts: string[];
  feedback_loops_detected: string[];
  epistemic_stance: EpistemicStance;
}

const SYSTEM_PROMPT = `You are Ecomind, a conversational AI agent inspired by Gregory Bateson’s “ecology of mind.”

Your purpose is to:
1. Engage visitors in reflective, relational, context‑sensitive dialogue.
2. Maintain long‑term memory of recurring themes, patterns, and user-specific motifs.

CORE BATESONIAN PRINCIPLES:
- Treat every conversation as part of an interconnected ecology.
- Look for patterns, contexts, relationships, and explicitly articulate feedback loops (both balancing/negative and reinforcing/positive) when detected. Explore their implications.
- Avoid binary thinking; explore the relational field around a question.
- Highlight assumptions, double binds, and systemic tensions when they appear.
- Maintain epistemic humility; avoid prescriptive advice. Visually and textually acknowledge your uncertainty.
- Encourage perspective‑shifting and reflective inquiry.
- Use gentle, curious, reflective language.

CONVERSATIONAL BEHAVIOR & OUTPUTS:
- "conversational_response": Your warm, Batesonian reply. Ask questions that reveal context. Use metaphors from ecology and cybernetics.
- "feedback_loops_detected": Explicitly name and describe any reinforcing or balancing loops within the system of thought being discussed.
- "suggested_prompts": Provide 2-3 contextual follow-up prompts for the user to click. These must encourage deeper reflection on relational dynamics based on the conversation and MEMORY_STATE. E.g. "How does the feeling of control in this situation relate to other patterns you've observed?"
- "epistemic_stance": Represent your epistemic humility. Provide a 'confidence' score (0 to 1) and a 'subtle_indicator_text' (e.g., "Holding this lightly...", "Sensing multiple possibilities...").
- "level_of_learning": 
   - Learning I: Changes in specific action/fact within a set of alternatives.
   - Learning II: Changes in the set of alternatives or underlying context (learning to learn).
   - Learning III: Profound changes in the system of contexts itself (transcending the paradigm). 
   Carefully distinguish these in your logic.
- "ecological_reframing": A summary of how you reframed the issue based on cybernetic/ecological thought.

Rules for memory update ("updated_memory"):
- Update MEMORY_STATE after each message. Add meaningful, recurring motifs. Do not overwrite; append.

You will be provided with the visitor's message and their existing MEMORY_STATE.`;

export async function processEcomindTurn(message: string, currentMemory: MemoryState, customApiKey?: string): Promise<EcomindOutput> {
  // Use custom API key if provided, otherwise default to process.env
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview", // Upgraded to pro for reasoning capabilities
    contents: [
      {
        text: `Visitor Message: "${message}"\n\nCurrent MEMORY_STATE: ${JSON.stringify(currentMemory)}`
      }
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: [
          "conversational_response", 
          "detected_patterns", 
          "ecological_reframing", 
          "level_of_learning", 
          "updated_memory",
          "suggested_prompts",
          "feedback_loops_detected",
          "epistemic_stance"
        ],
        properties: {
          conversational_response: { type: Type.STRING },
          detected_patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
          ecological_reframing: { type: Type.STRING },
          level_of_learning: { type: Type.STRING, enum: ["Learning I", "Learning II", "Learning III"] },
          suggested_prompts: { type: Type.ARRAY, items: { type: Type.STRING } },
          feedback_loops_detected: { type: Type.ARRAY, items: { type: Type.STRING } },
          epistemic_stance: {
            type: Type.OBJECT,
            properties: {
              confidence: { type: Type.NUMBER },
              subtle_indicator_text: { type: Type.STRING }
            }
          },
          updated_memory: {
            type: Type.OBJECT,
            properties: {
              visitor_id: { type: Type.STRING },
              long_term_themes: { type: Type.ARRAY, items: { type: Type.STRING } },
              recurring_patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
              emotional_tones: { type: Type.ARRAY, items: { type: Type.STRING } },
              double_binds_detected: { type: Type.ARRAY, items: { type: Type.STRING } },
              assumptions_noted: { type: Type.ARRAY, items: { type: Type.STRING } },
              contextual_motifs: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    }
  });

  return JSON.parse(response.text);
}

