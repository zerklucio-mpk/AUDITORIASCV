// FIX: Implemented Gemini service for AI-powered audit analysis.
import { GoogleGenAI } from "@google/genai";
// FIX: Import AnswerData to correctly type audit answers.
import { CompletedAudit, AnswerData } from "../types";

// FIX: Initialize the GoogleGenAI client.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateAuditSummary(audit: CompletedAudit, questions: string[]): Promise<string> {
    const { auditData, answers } = audit;

    const answeredQuestions = Object.entries(answers)
        .map(([index, data]) => {
            const questionText = questions[parseInt(index, 10)];
            let answerString = `- Pregunta: "${questionText}"\n  Respuesta: ${data.answer}`;
            if (data.observation) {
                answerString += `\n  Observación: ${data.observation}`;
            }
            return answerString;
        })
        .join('\n');

    const prompt = `
        Eres un asistente de control de calidad experto. Analiza la siguiente auditoría de 5S y genera un resumen conciso y recomendaciones accionables.
        El resumen debe destacar los puntos fuertes y las áreas de mejora.
        Las recomendaciones deben ser específicas, claras y priorizadas, enfocadas en resolver los puntos con respuesta "No".
        Formatea la respuesta en Markdown, usando encabezados, listas y negritas para una mejor legibilidad.

        Detalles de la Auditoría:
        - Auditor: ${auditData.nombreAuditor}
        - Área: ${auditData.area}
        - Fecha: ${auditData.fecha}

        Resultados:
        ${answeredQuestions}
    `;

    try {
        // FIX: Use ai.models.generateContent to query the Gemini API.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        // FIX: Extract text directly from the response.
        return response.text;
    } catch (error) {
        console.error("Error al generar el resumen con Gemini:", error);
        return "Hubo un error al generar el resumen. Por favor, inténtalo de nuevo.";
    }
}