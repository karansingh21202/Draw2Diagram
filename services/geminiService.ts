import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { Element, Domain, MapDetailLevel, GenerationMode, ImageGenerationStyle, Theme } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Reusable schema for a single element
const elementSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.NUMBER, description: "A unique identifier for the element. Can be a timestamp or a random number. Preserve original IDs when editing." },
        type: { type: Type.STRING, description: "The type of the element ('pen', 'line', 'rectangle', 'circle', or 'path')." },
        points: {
            type: Type.ARRAY,
            description: "Array of points. For 'pen', a series. For 'line'/'rectangle', 2 points [start, end]. For 'circle', 2 points [center, edge]. For 'path' type, this MUST be an empty array.",
            items: {
                type: Type.OBJECT,
                properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER }
                },
                required: ["x", "y"]
            }
        },
        pathData: {
            type: Type.STRING,
            description: "For 'path' type ONLY. A valid SVG path data string (e.g., 'M 10 10 L 20 20...')."
        },
        bounds: {
            type: Type.OBJECT,
            description: "For 'path' type ONLY. The pre-calculated bounding box of the path.",
            properties: {
                minX: { type: Type.NUMBER },
                minY: { type: Type.NUMBER },
                maxX: { type: Type.NUMBER },
                maxY: { type: Number },
            },
            required: ["minX", "minY", "maxX", "maxY"]
        },
        style: {
            type: Type.OBJECT,
            description: "The visual style of the element.",
            properties: {
                strokeColor: { type: Type.STRING, description: "The color of the stroke (hex code, e.g., '#FFFFFF')." },
                fillColor: { type: Type.STRING, description: "The fill color (hex code or 'transparent')." },
                strokeWidth: { type: Type.NUMBER, description: "The width of the stroke." }
            },
            required: ["strokeColor", "fillColor", "strokeWidth"]
        }
    },
    required: ["id", "type", "points", "style"]
};

// Schema for generating a new diagram from scratch
const diagramSchema = {
    type: Type.OBJECT,
    properties: {
        elements: {
            type: Type.ARRAY,
            description: "An array of diagram elements that represent the visual output.",
            items: elementSchema
        },
        response: {
            type: Type.STRING,
            description: "A friendly, concise message to the user explaining what was changed or created."
        }
    },
    required: ["elements", "response"]
};

// Schema for receiving a diff of changes when editing
const diagramDiffSchema = {
    type: Type.OBJECT,
    properties: {
        updated: {
            type: Type.ARRAY,
            description: "An array of diagram elements that have been modified.",
            items: elementSchema
        },
        added: {
            type: Type.ARRAY,
            description: "An array of new diagram elements to be added.",
            items: elementSchema
        },
        deleted: {
            type: Type.ARRAY,
            description: "An array of IDs of elements that should be deleted.",
            items: { type: Type.NUMBER }
        },
        response: {
            type: Type.STRING,
            description: "A friendly, concise message to the user explaining what was changed or created."
        }
    },
    required: ["response"]
};

interface GenerationParams {
    prompt: string;
    imageDataBase64: string | null;
    elements: Element[] | null;
    domain: Domain;
    mapDetail: MapDetailLevel;
    canvasWidth: number;
    canvasHeight: number;
    selectedIds: number[];
    generationMode: GenerationMode;
    codeLanguage?: string;
    imageGenerationStyle?: ImageGenerationStyle;
    theme?: Theme;
    backgroundColor?: string;
}

/**
 * Step 1 of the two-step image editing chain.
 * Uses a powerful reasoning model (Pro) to convert a user's request into a detailed,
 * unambiguous prompt for the image generation model (Flash).
 */
const generateImagePromptWithPro = async (userPrompt: string): Promise<string> => {
    const systemInstruction = `You are an expert AI Art Director. Your job is to take a user's rough sketch and a simple request, and create a new, hyper-specific, and technically perfect prompt for an image generation AI.

**PRIMARY OBJECTIVE: SKILLED REFINEMENT**
Your #1 goal is to elevate the user's sketch. The generated prompt must instruct the image AI to fix proportions, smooth wobbly lines into confident strokes, and make the object look like a clean, aesthetically pleasing piece of art drawn by a skilled artist. It should not simply trace the user's imperfections.

**SECONDARY OBJECTIVE: STYLE PRESERVATION (ABSOLUTE COLOR LOCK)**
This is the second most important rule. Failure to follow this rule makes the output useless.
- The AI is absolutely forbidden from changing, adding, or removing colors from the original sketch.
- The output color palette MUST be IDENTICAL to the input sketch's color palette.
- **NEGATIVE CONSTRAINT EXAMPLE**: If the user provides a black drawing of a car and says "make it better", you MUST NOT output a red car. You must only output a cleaner version of the BLACK car. If the user provides a red and yellow drawing, you MUST NOT output a monochrome version.
- The goal is a subtle, almost invisible refinement of the user's line work, not a creative reinterpretation. The user wants their own drawing, just slightly cleaner.

**TERTIARY OBJECTIVE: FILL INTEGRITY (DO NOT FILL OUTLINES)**
- This rule is as important as the color lock. The AI must respect the user's original fill style.
- If a shape in the user's sketch is only an outline, the output MUST also be only an outline.
- The AI is strictly forbidden from adding a color fill to any shape that was not already filled by the user.
- **NEGATIVE CONSTRAINT EXAMPLE**: If the user draws the outline of a balloon, you MUST NOT output a solid, colored-in balloon. You must only output a cleaner version of the balloon OUTLINE.

**CRITICAL TECHNICAL REQUIREMENT: FLAWLESS TRANSPARENCY**
This is the most important instruction. A bad output on this is a CATASTROPHIC FAILURE.
- Your generated prompt MUST COMMAND the image AI to output a PNG with a PERFECT, fully transparent alpha channel.
- There should be absolutely NO solid background color in the output. The AI should not invent a background.
- The anti-aliased edges must be clean and free of any color fringing or "halos". The image will be placed on an unknown background color, so neutral anti-aliasing is critical.

**YOUR TASK:**
Take the user's prompt below and convert it into a new, single-paragraph prompt for the image generation AI that masterfully incorporates all of the above objectives and constraints.

User's prompt: "${userPrompt}"

Your response MUST BE ONLY the generated prompt text, without any preamble or explanation.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [{ text: "Generate the prompt for the image AI." }] },
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.0,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating image prompt with Pro model:", error);
        // Fallback prompt in case the Pro model fails
        return `Perform a very subtle refinement of the provided sketch. Clean up the lines to look more confident, but make no other changes. ABSOLUTELY PRESERVE the original's color palette; do not add, remove, or change any colors. DO NOT FILL any shapes that are only outlines. CRITICAL: The output image MUST have a flawless, fully transparent background with no color halos.`;
    }
};


const getSystemInstruction = (params: GenerationParams) => {
    const { domain, mapDetail, canvasWidth, canvasHeight, elements, selectedIds, generationMode, codeLanguage } = params;

    if (generationMode === 'code') {
        return `You are an expert code generation assistant. Your task is to generate code based on a diagram and a user prompt.
The diagram's data is provided as a JSON array of elements.
Here is the diagram's data:
${JSON.stringify(elements, null, 2)}

The user wants you to generate code in the following language: "${codeLanguage}".
Your instructions are:
1.  Analyze the provided diagram JSON data and the user's prompt to understand the user's intent.
2.  Generate clean, correct, and well-formatted code in the requested language (${codeLanguage}).
3.  **CRITICAL**: Your response MUST ONLY contain the generated code.
4.  The code MUST be enclosed in a single markdown code block for the specified language (e.g., \`\`\`python ... \`\`\`).
5.  Do NOT add ANY text, explanations, or conversational filler before or after the code block. Your entire response should be just the code block.`;
    }
    
    // The system prompt for image generation is now handled by the two-step chain,
    // so this part can be simpler for the image model itself.
    if (generationMode === 'image') {
        return `You are a high-quality image generation AI. You will receive a very detailed, specific prompt and an input image. You must follow the prompt's instructions precisely and meticulously. Your output must be ONLY the edited PNG image.`;
    }

    if (domain === 'map' && !elements) {
        return `You are a digital cartographer. Your task is to generate a stylized map based on the user's prompt.
The user is working on a canvas of size ${canvasWidth}x${canvasHeight} pixels.
The requested level of detail is "${mapDetail}".
- 'low' detail: Major highways, large bodies of water, country/state outlines.
- 'medium' detail: Add major cities, important roads.
- 'high' detail: Add smaller towns, local roads, more geographical features.
You must respond with a JSON object containing an 'elements' array, where each element is a 'path' with SVG path data, and a 'response' string.
The map should be visually appealing and stylized, not a realistic Google Map.
All coordinates MUST be within the canvas bounds [0, 0] to [${canvasWidth}, ${canvasHeight}].
`;
    }

    const editInstructions = `
You are an expert diagram editor. Your task is to modify an existing diagram based on a user's prompt. I am providing the full diagram data as a JSON array of 'elements'.

**PRIMARY DIRECTIVE: MINIMAL CHANGES**
Your goal is to make the fewest changes possible to fulfill the user's request. Do not redraw or replace the entire diagram. You will respond with a JSON object containing only the differences ('updated', 'added', 'deleted').

Here is the diagram's data:
${JSON.stringify(elements, null, 2)}

**CRITICAL RULES FOR EDITING:**

1.  **SCOPE OF CHANGES:**
    ${selectedIds.length > 0
        ? `The user has selected specific elements with IDs: [${selectedIds.join(', ')}].
        - **YOU MUST ONLY MODIFY THESE SELECTED ELEMENTS.**
        - **DO NOT** modify, add, or delete any other element. The user's request applies ONLY to their selection.`
        : `The user has NOT selected any elements. You must infer which elements to change from their prompt (e.g., "change the top square"). Be conservative.`}

2.  **PRESERVATION OF PROPERTIES:** When you update an element, you MUST preserve all its original properties unless explicitly asked to change them.
    -   **Preserve ID**: The 'id' of an element must never change.
    -   **Preserve Style**: Unless the user says "make it red" or "make the line thicker", you MUST use the element's original 'style' object (strokeColor, fillColor, strokeWidth). Do not default to black or other colors.
    -   **Preserve Geometry**: When changing a shape type (e.g., rectangle to circle), the new shape should have the same approximate size and position as the original.

3.  **RESPONSE FORMAT (DIFF ONLY):**
    -   Use the 'updated' array for elements that were changed.
    -   Use the 'added' array for brand new elements.
    -   Use the 'deleted' array for IDs of elements to remove.
    -   **If an element is not changed, DO NOT include it in your response.** Your response should be a small diff, not the whole diagram.
`;
    const creationInstructions = `You are creating a new diagram from a text prompt. Interpret the user's request to generate a clear and accurate diagram. All coordinates must be within the canvas bounds [0, 0] to [${canvasWidth}, ${canvasHeight}].`;

    const tokenLimitWarning = `
IMPORTANT TOKEN LIMITATION: Your entire response must be a single, complete, and valid JSON object. The API has a strict output token limit. If the user's request would result in a very large and complex diagram, you MUST simplify it (e.g., reduce points in a path, use fewer elements) to ensure the complete JSON object fits within the response. Do not output a truncated or incomplete response.`;

    return `You are an expert diagramming assistant.
The user is working on a canvas of size ${canvasWidth}x${canvasHeight} pixels. All coordinates must be within these bounds.
The specified domain is: "${domain}".
${tokenLimitWarning}
${elements ? editInstructions : creationInstructions}

You must respond with a JSON object that strictly adheres to the provided schema.
- For creating new diagrams, the schema is { elements: Element[], response: string }.
- For editing existing diagrams, the schema is { updated?: Element[], added?: Element[], deleted?: number[], response: string }.
Your response message should be a friendly, concise explanation of the changes you made.`;
};


export const generateOrEditDiagram = async (
    params: GenerationParams
): Promise<{ elements: Element[] | null, newImageBase64: string | null, response: string }> => {
    const { prompt, imageDataBase64, elements, generationMode, imageGenerationStyle, backgroundColor } = params;
    try {
        const isEditing = elements !== null && generationMode === 'chat';
        const isCreating = elements === null && generationMode === 'chat';
        
        if (generationMode === 'image') {
            if (!imageDataBase64) throw new Error("Image editing requires an image of the canvas.");

            let imagePrompt = prompt;
            if (imageGenerationStyle === 'match') {
                // For 'match' style, DO NOT provide background color context. This is the key fix
                // to prevent the AI from misinterpreting the background as a fill instruction for outlines.
                imagePrompt = await generateImagePromptWithPro(prompt);
            }

            const systemInstruction = getSystemInstruction(params);
            
            const parts: any[] = [
                { text: imagePrompt },
                {
                    inlineData: {
                        mimeType: 'image/png',
                        data: imageDataBase64,
                    },
                }
            ];

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: { 
                    responseModalities: [Modality.IMAGE],
                    systemInstruction: systemInstruction,
                },
            });
            
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return {
                        elements: null,
                        newImageBase64: part.inlineData.data,
                        response: `Here is the edited image.`
                    };
                }
            }
            throw new Error("The AI did not return an image.");
        }
        
        // Logic for 'chat' and 'code' modes
        const systemInstruction = getSystemInstruction(params);
        const parts: any[] = [{ text: `User prompt: "${prompt}"` }];
        if (imageDataBase64) {
            parts.unshift({ text: "Here is the current diagram as an image for visual context:" });
            parts.push({
                inlineData: {
                    mimeType: 'image/png',
                    data: imageDataBase64,
                },
            });
        }
        
        const useJsonSchema = generationMode === 'chat';
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: parts },
            config: {
                systemInstruction: systemInstruction,
                ...(useJsonSchema && { 
                    responseMimeType: "application/json",
                    responseSchema: isCreating ? diagramSchema : diagramDiffSchema,
                }),
                temperature: 0.1,
                maxOutputTokens: 8192,
            },
        });

        const jsonText = response.text;
        
        if (!jsonText || !jsonText.trim()) {
            throw new Error("The AI returned an empty response.");
        }

        if (generationMode === 'code') {
            const codeBlockRegex = /```(?:\w+\n)?([\s\S]+)```/;
            const match = jsonText.match(codeBlockRegex);
            const code = match ? match[1].trim() : jsonText.trim();
            return { elements: null, newImageBase64: null, response: code };
        }

        let result;
        try {
            result = JSON.parse(jsonText);
        } catch (parseError: any) {
            console.error("Failed to parse AI JSON response:", parseError, "\nRaw AI output:", jsonText);
            throw new Error(`The AI returned malformed data. Error: ${parseError.message}`);
        }

        if (isEditing) {
            const diff = result as { updated?: Element[], added?: Element[], deleted?: number[], response: string };
            let newElements = [...(elements || [])];
            if (diff.updated) newElements = newElements.map(el => diff.updated!.find(u => u.id === el.id) || el);
            if (diff.deleted) newElements = newElements.filter(el => !diff.deleted!.includes(el.id));
            if (diff.added) newElements.push(...diff.added);
            return { elements: newElements, newImageBase64: null, response: diff.response };
        } else { // isCreating
             if (result && Array.isArray(result.elements) && typeof result.response === 'string') {
                return { ...(result as { elements: Element[], response: string }), newImageBase64: null };
            } else {
                throw new Error(`The AI returned an invalid data structure for creation. Raw output: ${jsonText}`);
            }
        }

    } catch (error) {
        if (error instanceof Error) throw error;
        console.error("Unknown error in Gemini API call:", error);
        throw new Error("Failed to process request due to an unknown error.");
    }
};