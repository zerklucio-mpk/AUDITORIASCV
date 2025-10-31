import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Excel from 'exceljs';
import saveAs from 'file-saver';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, BorderStyle, ImageRun, AlignmentType } from 'docx';
import { CompletedAudit, HistorySnapshot } from '../types';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: any;
  }
}

const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = atob(base64.replace(/^data:image\/[a-z]+;base64,/, ''));
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

type ReportStats = { averageCompliance: number, lowestComplianceArea: string };
type GroupedData = Record<string, { tableBody: string[][] }>;
type ExcelRow = {
  area: string;
  fecha: string;
  auditor: string;
  qNum: number;
  pregunta: string;
  respuesta: string | null;
  observacion?: string;
};
type QuestionAnalysisData = {
    question: string;
    stats: { area: string; counts: { 'Sí': number; 'No': number; 'N/A': number } }[];
}[];

const generateFileName = (prefix: string, extension: string) => {
    return `${prefix}_${new Date().toISOString().split('T')[0]}.${extension}`;
}

const prepareReportData = (audits: CompletedAudit[], questions: string[]) => {
  const groupedData: GroupedData = {};
  const allRowsForExcel: ExcelRow[] = [];
  
  const questionAnalysisStats: { [questionIndex: number]: { [area: string]: { 'Sí': number; 'No': number; 'N/A': number } } } = {};

  for (const audit of audits) {
    const { area, fecha, nombreAuditor } = audit.auditData;
    if (!groupedData[area]) {
      groupedData[area] = { tableBody: [] };
    }

    const auditRows = Object.entries(audit.answers).map(([indexStr, answerData]) => {
      const index = parseInt(indexStr, 10);
      const questionText = questions[index] || `Pregunta ${index + 1} no encontrada`;
      
      if (!questionAnalysisStats[index]) questionAnalysisStats[index] = {};
      if (!questionAnalysisStats[index][area]) questionAnalysisStats[index][area] = { 'Sí': 0, 'No': 0, 'N/A': 0 };
      if (answerData.answer) {
          questionAnalysisStats[index][area][answerData.answer]++;
      }

      const row: string[] = [
        `${index + 1}. ${questionText}`,
        answerData.answer || 'N/A',
        answerData.observation || '',
      ];
      
      allRowsForExcel.push({
        area,
        fecha,
        auditor: nombreAuditor,
        qNum: index + 1,
        pregunta: questionText,
        respuesta: answerData.answer,
        observacion: answerData.observation
      });

      return row;
    });

    groupedData[area].tableBody.push(...auditRows);
  }

  const questionAnalysisData: QuestionAnalysisData = questions.map((questionText, index) => {
    const statsForQuestion = questionAnalysisStats[index] || {};
    return {
      question: `${index + 1}. ${questionText}`,
      stats: Object.entries(statsForQuestion).map(([area, counts]) => ({ area, counts })),
    };
  });
  
  return { groupedData, allRowsForExcel, questionAnalysisData };
};

export const generatePdfReport = async (
  audits: CompletedAudit[],
  stats: ReportStats,
  questions: string[],
  areaChartImg: string,
  historyChartImg: string,
  questionChartImages: string[],
) => {
  const doc = new jsPDF();
  doc.setFontSize(22);
  doc.text("Reporte de Auditorías 5S", doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
  doc.setFontSize(16);
  doc.text("Resumen del Ciclo", 15, 55);
  doc.setFontSize(12);
  doc.text(`Cumplimiento Promedio: ${stats.averageCompliance.toFixed(1)}%`, 15, 65);
  doc.text(`Área con Menor Cumplimiento: ${stats.lowestComplianceArea}`, 15, 72);

  doc.text("Cumplimiento por Área", doc.internal.pageSize.getWidth() / 2, 88, { align: 'center' });
  doc.addImage(areaChartImg, 'PNG', 15, 90, 180, 90);
  
  doc.text("Histórico de Cumplimiento", doc.internal.pageSize.getWidth() / 2, 188, { align: 'center' });
  doc.addImage(historyChartImg, 'PNG', 15, 190, 180, 90);

  const { groupedData, questionAnalysisData } = prepareReportData(audits, questions);

  doc.addPage();
  let finalY: any = 20;

  for (const area of Object.keys(groupedData).sort()) {
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }
    doc.setFontSize(14);
    doc.text(`Detalle para el Área: ${area}`, 15, finalY);
    finalY += 10;
    const tableHead = [['Pregunta', 'Respuesta', 'Observación']];
    doc.autoTable({ head: tableHead, body: groupedData[area].tableBody, startY: finalY, theme: 'grid', headStyles: { fillColor: [71, 85, 105] }, styles: { cellPadding: 2, fontSize: 8 }, columnStyles: { 0: { cellWidth: 90 } } });
    finalY = doc.lastAutoTable.finalY + 15;
  }

  doc.addPage();
  finalY = 20;
  doc.setFontSize(16);
  doc.text("Análisis por Pregunta", 15, finalY);
  finalY += 15;

  questionAnalysisData.forEach((analysis, index) => {
      if (finalY > 260) {
          doc.addPage();
          finalY = 20;
      }
      doc.setFontSize(10);
      doc.text(analysis.question, 15, finalY, { maxWidth: 180 });
      finalY += 12;

      const analysisTableBody = analysis.stats.map(s => [s.area, String(s.counts['Sí']), String(s.counts['No']), String(s.counts['N/A'])]);
      if(analysisTableBody.length > 0) {
        doc.autoTable({ head: [['Área', 'Sí', 'No', 'N/A']], body: analysisTableBody, startY: finalY, theme: 'grid', headStyles: { fillColor: [100, 116, 139], fontSize: 8 }, styles: { cellPadding: 1, fontSize: 8 } });
        finalY = doc.lastAutoTable.finalY + 5;
      }
      
      const chartImg = questionChartImages[index];
      if (chartImg) {
          if (finalY > 200) { doc.addPage(); finalY = 20; }
          doc.addImage(chartImg, 'PNG', 15, finalY, 180, 90);
          finalY += 95;
      }
  });

  doc.save(generateFileName('Reporte_Auditorias_5S', 'pdf'));
};

export const generateXlsxReport = async (
  audits: CompletedAudit[],
  stats: ReportStats,
  questions: string[],
  areaChartImg: string,
  historyChartImg: string,
  questionChartImages: string[],
) => {
    const workbook = new Excel.Workbook();
    
    const summarySheet = workbook.addWorksheet('Resumen');
    summarySheet.addRow(['Reporte de Auditorías 5S']).font = { size: 16, bold: true };
    summarySheet.addRow([]);
    summarySheet.addRow(['Resumen del Ciclo']).font = { bold: true };
    summarySheet.addRow(['Cumplimiento Promedio', `${stats.averageCompliance.toFixed(1)}%`]);
    summarySheet.addRow(['Área con Menor Cumplimiento', stats.lowestComplianceArea]);

    const chartSheet = workbook.addWorksheet('Gráficas Principales');
    const areaChartImgId = workbook.addImage({ base64: areaChartImg.replace(/^data:image\/png;base64,/, ''), extension: 'png' });
    const historyChartImgId = workbook.addImage({ base64: historyChartImg.replace(/^data:image\/png;base64,/, ''), extension: 'png' });
    chartSheet.getCell('B1').value = 'Cumplimiento por Área';
    chartSheet.getCell('B1').font = { bold: true, size: 14 };
    chartSheet.addImage(areaChartImgId, { tl: { col: 1, row: 2 }, ext: { width: 600, height: 300 } });
    chartSheet.getCell('B18').value = 'Histórico de Cumplimiento';
    chartSheet.getCell('B18').font = { bold: true, size: 14 };
    chartSheet.addImage(historyChartImgId, { tl: { col: 1, row: 19 }, ext: { width: 600, height: 300 } });

    const { allRowsForExcel, questionAnalysisData } = prepareReportData(audits, questions);
    
    const detailSheet = workbook.addWorksheet('Detalle de Auditorías');
    detailSheet.columns = [{ header: 'Área', key: 'area', width: 30 }, { header: 'Fecha', key: 'fecha', width: 15 }, { header: 'Auditor', key: 'auditor', width: 30 }, { header: 'N° Pregunta', key: 'qNum', width: 15 }, { header: 'Pregunta', key: 'pregunta', width: 80 }, { header: 'Respuesta', key: 'respuesta', width: 15 }, { header: 'Observación', key: 'observacion', width: 50 }];
    detailSheet.getRow(1).font = { bold: true };
    if(allRowsForExcel.length > 0) detailSheet.addRows(allRowsForExcel);
    
    const analysisSheet = workbook.addWorksheet('Análisis por Pregunta');
    let currentRow = 1;
    for (const analysis of questionAnalysisData) {
        analysisSheet.getCell(`A${currentRow}`).value = analysis.question;
        analysisSheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
        analysisSheet.mergeCells(`A${currentRow}:D${currentRow}`);
        currentRow++;
        const headerRow = analysisSheet.addRow(['Área', 'Sí', 'No', 'N/A']);
        headerRow.font = { bold: true };
        currentRow++;
        analysis.stats.forEach(s => { analysisSheet.addRow([s.area, s.counts['Sí'], s.counts['No'], s.counts['N/A']]); currentRow++; });
        analysisSheet.addRow([]); currentRow++;
    }

    const questionChartsSheet = workbook.addWorksheet('Gráficas por Pregunta');
    let questionChartRow = 1;
    questionChartImages.forEach((imgBase64, index) => {
        if (imgBase64) {
            const imgId = workbook.addImage({ base64: imgBase64.replace(/^data:image\/png;base64,/, ''), extension: 'png' });
            questionChartsSheet.getCell(`A${questionChartRow}`).value = questionAnalysisData[index].question;
            questionChartsSheet.getCell(`A${questionChartRow}`).font = { bold: true };
            questionChartsSheet.addImage(imgId, { tl: { col: 0, row: questionChartRow + 1 }, ext: { width: 600, height: 300 } });
            questionChartRow += 17;
        }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), generateFileName('Reporte_Auditorias_5S', 'xlsx'));
};

export const generateDocxReport = async (
  audits: CompletedAudit[],
  stats: ReportStats,
  questions: string[],
  areaChartImg: string,
  historyChartImg: string,
  questionChartImages: string[],
) => {
    
    const { groupedData, questionAnalysisData } = prepareReportData(audits, questions);
    
    const areaSections: (Paragraph | Table)[] = [];
    for (const area of Object.keys(groupedData).sort()) {
        areaSections.push(new Paragraph({ text: `Detalle para el Área: ${area}`, heading: "Heading2" }));
        const table = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [ new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: "Pregunta", style: "strong" })] }), new TableCell({ children: [new Paragraph({ text: "Respuesta", style: "strong" })] }), new TableCell({ children: [new Paragraph({ text: "Observación", style: "strong" })] }), ], }), ...groupedData[area].tableBody.map(row => new TableRow({ children: row.map(cellText => new TableCell({ children: [new Paragraph(cellText)] })), })), ], });
        areaSections.push(table);
        areaSections.push(new Paragraph(""));
    }

    const questionAnalysisSections: (Paragraph | Table)[] = [ new Paragraph({ text: "Análisis por Pregunta", heading: "Heading1" }) ];
    questionAnalysisData.forEach((analysis, index) => {
        questionAnalysisSections.push(new Paragraph({ text: analysis.question, heading: "Heading2" }));
        const table = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [ new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: "Área", style: "strong" })] }), new TableCell({ children: [new Paragraph({ text: "Sí", style: "strong" })] }), new TableCell({ children: [new Paragraph({ text: "No", style: "strong" })] }), new TableCell({ children: [new Paragraph({ text: "N/A", style: "strong" })] }), ], }), ...analysis.stats.map(s => new TableRow({ children: [ new TableCell({ children: [new Paragraph(s.area)] }), new TableCell({ children: [new Paragraph(String(s.counts['Sí']))] }), new TableCell({ children: [new Paragraph(String(s.counts['No']))] }), new TableCell({ children: [new Paragraph(String(s.counts['N/A']))] }), ] })) ], });
        questionAnalysisSections.push(table);
        
        const chartImg = questionChartImages[index];
        if (chartImg) {
            // FIX: Corrected ImageRun `type` to 'png' to match the image data format.
            questionAnalysisSections.push(new Paragraph({ children: [ new ImageRun({ type: 'png', data: base64ToUint8Array(chartImg), transformation: { width: 540, height: 270 } }) ], alignment: AlignmentType.CENTER }));
        }
        questionAnalysisSections.push(new Paragraph(""));
    });

    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({ text: "Reporte de Auditorías 5S", heading: "Title" }),
                new Paragraph({ text: "Resumen del Ciclo", heading: "Heading1" }),
                new Paragraph({ children: [new TextRun({ text: "Cumplimiento Promedio: ", bold: true }), new TextRun(stats.averageCompliance.toFixed(1) + "%")] }),
                new Paragraph({ children: [new TextRun({ text: "Área con Menor Cumplimiento: ", bold: true }), new TextRun(stats.lowestComplianceArea)] }),
                new Paragraph({ text: "Cumplimiento por Área", style: "strong", alignment: AlignmentType.CENTER }),
                // FIX: Corrected ImageRun `type` to 'png' to match the image data format.
                new Paragraph({ children: [ new ImageRun({ type: 'png', data: base64ToUint8Array(areaChartImg), transformation: { width: 540, height: 270 } }) ], alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "Histórico de Cumplimiento", style: "strong", alignment: AlignmentType.CENTER }),
                // FIX: Corrected ImageRun `type` to 'png' to match the image data format.
                new Paragraph({ children: [ new ImageRun({ type: 'png', data: base64ToUint8Array(historyChartImg), transformation: { width: 540, height: 270 } }) ], alignment: AlignmentType.CENTER }),
                ...areaSections,
                ...questionAnalysisSections,
            ],
        }],
        styles: { paragraphStyles: [{ id: "strong", name: "Strong", basedOn: "Normal", next: "Normal", run: { bold: true } }] },
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, generateFileName('Reporte_Auditorias_5S', 'docx'));
};