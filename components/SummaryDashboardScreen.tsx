import React, { useState, useMemo, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import ReactMarkdown from 'react-markdown';
import { CompletedAudit, HistorySnapshot, StatsByArea, Answers, AnswerData } from '../types';
import { generateAuditSummary } from '../services/geminiService';
import { generatePdfReport, generateXlsxReport, generateDocxReport } from '../services/reportService';
import { deleteAuditsByIds } from '../services/supabaseClient';
import { calculateCompliance } from '../services/utils';
import { useAppContext } from '../context/AppContext';
import SummaryCard from './SummaryCard';
import AreaBarChart from './AreaBarChart';
import HistoryBarChart from './HistoryBarChart';
import QuestionAnalysisScreen from './QuestionAnalysisScreen';
import HistoryScreen from './HistoryScreen';
import Dropdown from './Dropdown';
import ManageAuditsModal from './ManageAuditsModal';
import AiSparkleIcon from './icons/AiSparkleIcon';
import SpinnerIcon from './icons/SpinnerIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import TrashIcon from './icons/TrashIcon';


interface Props {
  onStartNewAudit: () => void;
  onArchiveAndReset: () => void;
}

type SummaryScreenView = 'main' | 'questions' | 'history';
type ReportType = 'pdf' | 'xlsx' | 'docx';

const SummaryDashboardScreen: React.FC<Props> = ({ onStartNewAudit, onArchiveAndReset }) => {
    const { audits, snapshots: historicalSnapshots, questions, areas, refreshData } = useAppContext();
    
    const [currentView, setCurrentView] = useState<SummaryScreenView>('main');
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedAuditForSummary, setSelectedAuditForSummary] = useState<CompletedAudit | null>(null);
    const [summaryContent, setSummaryContent] = useState('');
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);
    const [isReportGenerating, setIsReportGenerating] = useState(false);
    const [reportRequest, setReportRequest] = useState<ReportType | null>(null);

    const areaChartRef = useRef<HTMLDivElement>(null);
    const historyChartRef = useRef<HTMLDivElement>(null);
    const questionChartRefs = useRef<(HTMLDivElement | null)[]>([]);
    
    const questionTexts = useMemo(() => questions.map(q => q.text), [questions]);

    const auditedAreasCount = useMemo(() => new Set(audits.map(a => a.auditData.area)).size, [audits]);
    const totalAreasCount = areas.length;
    const isCycleComplete = auditedAreasCount >= totalAreasCount;

    const stats = useMemo(() => {
        if (audits.length === 0) {
            return {
                averageCompliance: 0,
                lowestComplianceArea: 'N/A',
            };
        }

        const totalCompliance = audits.reduce((sum, audit) => sum + calculateCompliance(audit.answers), 0);
        const averageCompliance = totalCompliance / audits.length;

        const complianceByArea: { [area: string]: { total: number, count: number } } = {};
        audits.forEach(audit => {
            const area = audit.auditData.area;
            if (!complianceByArea[area]) {
                complianceByArea[area] = { total: 0, count: 0 };
            }
            complianceByArea[area].total += calculateCompliance(audit.answers);
            complianceByArea[area].count++;
        });

        let lowestCompliance = 101;
        let lowestComplianceArea = 'N/A';
        for (const area in complianceByArea) {
            const avg = complianceByArea[area].total / complianceByArea[area].count;
            if (avg < lowestCompliance) {
                lowestCompliance = avg;
                lowestComplianceArea = area;
            }
        }

        return {
            averageCompliance,
            lowestComplianceArea,
        };
    }, [audits]);

    const statsByArea = useMemo<StatsByArea[]>(() => {
        const areaData: { [key: string]: { 'Sí': number, 'No': number, 'N/A': number } } = {};

        audits.forEach(audit => {
            const area = audit.auditData.area;
            if (!areaData[area]) {
                areaData[area] = { 'Sí': 0, 'No': 0, 'N/A': 0 };
            }
            Object.values(audit.answers).forEach((answerData: AnswerData) => {
                if (answerData.answer) {
                    areaData[area][answerData.answer]++;
                }
            });
        });
        
        return Object.entries(areaData).map(([name, counts]) => ({ name, ...counts }));
    }, [audits]);

    const historyData = useMemo(() => {
        return historicalSnapshots.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    }, [historicalSnapshots]);
    
    useEffect(() => {
        if (!reportRequest) return;
    
        const generateReport = () => {
          if (!areaChartRef.current || !historyChartRef.current || questionChartRefs.current.some(ref => !ref)) {
              return;
          }
      
          requestAnimationFrame(() => {
            requestAnimationFrame(async () => {
              try {
                const imageOptions = { cacheBust: true, pixelRatio: 3, backgroundColor: '#0f172a' };
                
                const areaChartImg = await toPng(areaChartRef.current!, imageOptions);
                const historyChartImg = await toPng(historyChartRef.current!, imageOptions);
                
                const questionChartImages = await Promise.all(
                  questionChartRefs.current.map(ref => {
                    if (ref) return toPng(ref, imageOptions);
                    return Promise.resolve('');
                  })
                );
    
                const reportStats = { averageCompliance: stats.averageCompliance, lowestComplianceArea: stats.lowestComplianceArea };
    
                switch (reportRequest) {
                  case 'pdf':
                    await generatePdfReport(audits, reportStats, questionTexts, areaChartImg, historyChartImg, questionChartImages);
                    break;
                  case 'xlsx':
                    await generateXlsxReport(audits, reportStats, questionTexts, areaChartImg, historyChartImg, questionChartImages);
                    break;
                  case 'docx':
                    await generateDocxReport(audits, reportStats, questionTexts, areaChartImg, historyChartImg, questionChartImages);
                    break;
                }
              } catch (error) {
                console.error('Error generating report:', error);
                alert('Hubo un error al generar el reporte. Por favor, revisa la consola para más detalles.');
              } finally {
                setIsReportGenerating(false);
                setReportRequest(null);
              }
            });
          });
        };
    
        generateReport();
      }, [reportRequest, audits, questionTexts, stats]);

    const handleGenerateSummary = async (audit: CompletedAudit) => {
        setSelectedAuditForSummary(audit);
        setIsSummaryModalOpen(true);
        setIsSummaryLoading(true);
        setSummaryContent('');

        try {
            const summary = await generateAuditSummary(audit, questionTexts);
            setSummaryContent(summary);
        } catch (error) {
            console.error(error);
            setSummaryContent("Error al generar el resumen. Inténtelo de nuevo.");
        } finally {
            setIsSummaryLoading(false);
        }
    };

    const handleRequestReport = (type: ReportType) => {
        if (isReportGenerating) return;
        setIsReportGenerating(true);
        setReportRequest(type);
    };

    const handleDeleteAudits = async (ids: string[]) => {
      try {
        await deleteAuditsByIds(ids);
        await refreshData();
      } catch (error) {
        console.error("Error al eliminar las auditorías:", error);
        throw error;
      }
    };
    
    const renderMainDashboard = () => (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Resumen General</h2>
                    <p className="mt-2 text-lg leading-8 text-slate-400">
                        Auditorias Internas CV Directo
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
                    {isCycleComplete && (
                         <button
                            onClick={onArchiveAndReset}
                            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-colors duration-200"
                        >
                            Archivar y Reiniciar Ciclo
                        </button>
                    )}
                    <button
                        onClick={onStartNewAudit}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors duration-200"
                    >
                        Nueva Auditoría
                    </button>
                    <button
                        onClick={() => setIsManageModalOpen(true)}
                        disabled={audits.length === 0}
                        className="flex items-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600 transition-colors disabled:bg-slate-800 disabled:cursor-not-allowed"
                        title="Gestionar auditorías"
                    >
                        <TrashIcon className="h-4 w-4" />
                        Gestionar
                    </button>
                    <Dropdown
                        trigger={
                            <button disabled={audits.length === 0 || isReportGenerating} className="flex items-center gap-2 rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition-colors disabled:bg-slate-800 disabled:cursor-not-allowed">
                                {isReportGenerating ? <SpinnerIcon className="h-4 w-4 animate-spin"/> : 'Exportar'}
                                {!isReportGenerating && <ChevronDownIcon className="h-4 w-4"/>}
                            </button>
                        }
                        items={[
                            { label: 'Exportar PDF', onClick: () => handleRequestReport('pdf') },
                            { label: 'Exportar Excel (.xlsx)', onClick: () => handleRequestReport('xlsx') },
                            { label: 'Exportar Word (.docx)', onClick: () => handleRequestReport('docx') },
                        ]}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <SummaryCard title="Cumplimiento Promedio" value={`${stats.averageCompliance.toFixed(1)}%`} color="blue" />
                <SummaryCard title="Área de Menor Rendimiento" value={stats.lowestComplianceArea} color="yellow" />
                <SummaryCard title="Áreas Auditadas (Ciclo)" value={`${auditedAreasCount} / ${totalAreasCount}`} color="green" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg"><AreaBarChart data={statsByArea} title="Cumplimiento por Área" /></div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg"><HistoryBarChart data={historyData} title="Histórico de Cumplimiento" /></div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={() => setCurrentView('questions')} className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">Ver Análisis por Pregunta</button>
                <span className="hidden sm:inline text-slate-600">|</span>
                <button onClick={() => setCurrentView('history')} className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">Ver Historial Completo</button>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-white">Auditorías Recientes</h3>
                <div className="max-h-96 overflow-y-auto">
                    {audits.length > 0 ? (
                        <table className="w-full text-sm text-left text-slate-400">
                            <thead className="text-xs text-slate-300 uppercase bg-slate-800 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Fecha</th>
                                    <th scope="col" className="px-6 py-3">Área</th>
                                    <th scope="col" className="px-6 py-3">Auditor</th>
                                    <th scope="col" className="px-6 py-3 text-center">Cumplimiento</th>
                                    <th scope="col" className="px-6 py-3 text-center">Análisis IA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...audits].reverse().map((audit, index) => (
                                    <tr key={audit.id || index} className="bg-slate-900 border-b border-slate-800 hover:bg-slate-800/50">
                                        <td className="px-6 py-4">{audit.auditData.fecha}</td>
                                        <td className="px-6 py-4">{audit.auditData.area}</td>
                                        <td className="px-6 py-4">{audit.auditData.nombreAuditor}</td>
                                        <td className="px-6 py-4 text-center font-semibold text-white">{calculateCompliance(audit.answers).toFixed(1)}%</td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => handleGenerateSummary(audit)} className="text-indigo-400 hover:text-indigo-300 transition-colors p-1 rounded-full hover:bg-slate-700" title="Generar resumen con IA">
                                                <AiSparkleIcon className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center text-slate-400 py-8">No hay auditorías para mostrar.</p>
                    )}
                </div>
            </div>
        </div>
    );

    if (currentView === 'questions') {
        return <QuestionAnalysisScreen onBack={() => setCurrentView('main')} />;
    }

    if (currentView === 'history') {
        return <HistoryScreen onBack={() => setCurrentView('main')} />;
    }

    return (
        <>
            {renderMainDashboard()}
            {isManageModalOpen && (
                <ManageAuditsModal
                    isOpen={isManageModalOpen}
                    onClose={() => setIsManageModalOpen(false)}
                    onDelete={handleDeleteAudits}
                />
            )}
            {isReportGenerating && (
                <div style={{ position: 'absolute', left: '-9999px', width: '1100px', top: 0, zIndex: -1 }}>
                    <div ref={areaChartRef}>
                        <AreaBarChart data={statsByArea} title="Cumplimiento por Área" forExport={true} />
                    </div>
                    <div ref={historyChartRef}>
                        <HistoryBarChart data={historyData} title="Histórico de Cumplimiento" forExport={true} />
                    </div>
                    <QuestionAnalysisScreen onBack={()=>{}} chartRefs={questionChartRefs} />
                </div>
            )}
            {isSummaryModalOpen && selectedAuditForSummary && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsSummaryModalOpen(false)}>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white">Análisis con IA de Gemini</h3>
                                <p className="text-sm text-slate-400">
                                    Auditoría de {selectedAuditForSummary.auditData.area} del {selectedAuditForSummary.auditData.fecha}
                                </p>
                            </div>
                             <button onClick={() => setIsSummaryModalOpen(false)} className="text-slate-500 hover:text-white text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {isSummaryLoading ? (
                                <div className="flex flex-col items-center justify-center gap-4 py-10">
                                    <SpinnerIcon className="h-10 w-10 text-indigo-500 animate-spin" />
                                    <p className="text-slate-400">Analizando auditoría...</p>
                                </div>
                            ) : (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{summaryContent}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-800 text-right bg-slate-900/50 rounded-b-xl">
                            <button onClick={() => setIsSummaryModalOpen(false)} className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 transition-colors">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SummaryDashboardScreen;
