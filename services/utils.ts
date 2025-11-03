import { Answers, AnswerData, CompletedAudit } from '../types';

export const calculateCompliance = (answers: Answers): number => {
    const relevantAnswers = Object.values(answers).filter((a: AnswerData) => a.answer === 'Sí' || a.answer === 'No');
    if (relevantAnswers.length === 0) return 100;
    const yesCount = relevantAnswers.filter((a: AnswerData) => a.answer === 'Sí').length;
    return (yesCount / relevantAnswers.length) * 100;
};

export const calculateAverageCompliance = (audits: CompletedAudit[]): number => {
    if (audits.length === 0) return 0;
    const totalCompliance = audits.reduce((sum, audit) => sum + calculateCompliance(audit.answers), 0);
    return totalCompliance / audits.length;
};
