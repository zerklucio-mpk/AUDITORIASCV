// FIX: Implemented Gemini service for AI-powered audit analysis.
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
// FIX: Import AnswerData to correctly type audit answers.
import { CompletedAudit, AnswerData } from "../types";

// FIX: Initialize the GoogleGenAI client.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to remove base64 prefix
const stripBase64Prefix = (base64: string) => base64.split(',')[1] || base64;


export async function generateAuditSummary(audit: CompletedAudit, questions: string[]): Promise<string> {
    const { auditData, answers } = audit;

    const parts: any[] = [];
    const photosToAnalyze: string[] = [];

    const answeredQuestionsText = Object.entries(answers)
        .map(([index, data]) => {
            const questionText = questions[parseInt(index, 10)];
            let answerString = `- Pregunta: "${questionText}"\n  Respuesta: ${data.answer}`;
            if (data.observation) {
                answerString += `\n  Observación: ${data.observation}`;
            }
            if (data.answer === 'No' && data.photo) {
                const photoIndex = photosToAnalyze.length + 1;
                answerString += `\n  (Ver Imagen ${photoIndex} adjunta para análisis contextual)`;
                photosToAnalyze.push(data.photo);
            }
            return answerString;
        })
        .join('\n');

    const promptText = `
        Eres un asistente de control de calidad experto. Analiza la siguiente auditoría de 5S y genera un resumen conciso y recomendaciones accionables.
        El resumen debe destacar los puntos fuertes y las áreas de mejora.
        Las recomendaciones deben ser específicas, claras y priorizadas, enfocadas en resolver los puntos con respuesta "No".
        Para las respuestas "No" que incluyan una imagen, analiza la imagen para entender mejor el contexto del problema y haz tu recomendación más precisa.
        Formatea la respuesta en Markdown, usando encabezados, listas y negritas para una mejor legibilidad.

        Detalles de la Auditoría:
        - Auditor: ${auditData.nombreAuditor}
        - Área: ${auditData.area}
        - Fecha: ${auditData.fecha}

        Resultados:
        ${answeredQuestionsText}
    `;

    parts.push({ text: promptText });

    photosToAnalyze.forEach(photoBase64 => {
        parts.push({
            inlineData: {
                mimeType: 'image/jpeg', // The browser's readAsDataURL provides a jpeg or png
                data: stripBase64Prefix(photoBase64),
            },
        });
    });

    try {
        // FIX: Use ai.models.generateContent to query the Gemini API.
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: parts },
        });
        // FIX: Extract text directly from the response.
        return response.text;
    } catch (error) {
        console.error("Error al generar el resumen con Gemini:", error);
        return "Hubo un error al generar el resumen. Por favor, inténtalo de nuevo.";
    }
}