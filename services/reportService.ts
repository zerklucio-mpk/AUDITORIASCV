import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Excel from 'exceljs';
import saveAs from 'file-saver';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, ImageRun, AlignmentType } from 'docx';
// FIX: Import AnswerData to correctly type the audit answer objects.
import { CompletedAudit, AnswerData, ExtinguisherArea, Extinguisher, InspectionRecord, InspectionAnswers, FirstAidKitArea, FirstAidKit } from '../types';

const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = atob(base64.replace(/^data:image\/[a-z]+;base64,/, ''));
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const getImageDimensions = (base64: string): Promise<{ width: number, height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = (err) => reject(`Could not load image from base64: ${err}`);
        img.src = base64;
    });
};

type ReportStats = { averageCompliance: number, lowestComplianceArea: string };

type ReportRow = {
  area: string;
  fecha: string;
  auditor: string;
  qNum: number;
  pregunta: string;
  respuesta: string | null;
  observacion?: string;
  photo?: string;
};
type QuestionAnalysisData = {
    question: string;
    stats: { area: string; counts: { 'Sí': number; 'No': number; 'N/A': number } }[];
}[];

const generateFileName = (prefix: string, extension: string) => {
    return `${prefix}_${new Date().toISOString().split('T')[0]}.${extension}`;
}

const prepareReportData = (audits: CompletedAudit[], questions: string[]) => {
  const allRowsForReporting: ReportRow[] = [];
  const questionAnalysisStats: { [questionIndex: number]: { [area: string]: { 'Sí': number; 'No': number; 'N/A': number } } } = {};

  for (const audit of audits) {
    const { area, fecha, nombreAuditor } = audit.auditData;

    // FIX: Explicitly type the destructured 'answerData' object to ensure correct property access.
    Object.entries(audit.answers).forEach(([indexStr, answerData]: [string, AnswerData]) => {
      const index = parseInt(indexStr, 10);
      const questionText = questions[index] || `Pregunta ${index + 1} no encontrada`;
      
      if (!questionAnalysisStats[index]) questionAnalysisStats[index] = {};
      if (!questionAnalysisStats[index][area]) questionAnalysisStats[index][area] = { 'Sí': 0, 'No': 0, 'N/A': 0 };
      if (answerData.answer) {
          questionAnalysisStats[index][area][answerData.answer]++;
      }
      
      allRowsForReporting.push({
        area,
        fecha,
        auditor: nombreAuditor,
        qNum: index + 1,
        pregunta: questionText,
        respuesta: answerData.answer,
        observacion: answerData.observation,
        photo: answerData.photo,
      });
    });
  }

  const questionAnalysisData: QuestionAnalysisData = questions.map((questionText, index) => {
    const statsForQuestion = questionAnalysisStats[index] || {};
    return {
      question: `${index + 1}. ${questionText}`,
      stats: Object.entries(statsForQuestion).map(([area, counts]) => ({ area, counts })),
    };
  });
  
  return { allRowsForReporting, questionAnalysisData };
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
  const pdfPageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pdfPageWidth - margin * 2;

  doc.setFontSize(22);
  doc.text("Reporte de Auditorías 5S", pdfPageWidth / 2, 25, { align: 'center' });
  doc.setFontSize(16);
  doc.text("Resumen del Ciclo", 15, 45);
  doc.setFontSize(12);
  doc.text(`Cumplimiento Promedio: ${stats.averageCompliance.toFixed(1)}%`, 15, 55);
  doc.text(`Área con Menor Cumplimiento: ${stats.lowestComplianceArea}`, 15, 62);

  // Add Area Chart with correct aspect ratio
  const areaChartDims = await getImageDimensions(areaChartImg);
  const areaChartHeight = maxWidth * (areaChartDims.height / areaChartDims.width);
  doc.text("Cumplimiento por Área", pdfPageWidth / 2, 78, { align: 'center' });
  doc.addImage(areaChartImg, 'PNG', margin, 80, maxWidth, areaChartHeight);
  
  // Add History Chart on a new page
  doc.addPage();
  const historyChartDims = await getImageDimensions(historyChartImg);
  const historyChartHeight = maxWidth * (historyChartDims.height / historyChartDims.width);
  doc.text("Histórico de Cumplimiento", pdfPageWidth / 2, 25, { align: 'center' });
  doc.addImage(historyChartImg, 'PNG', margin, 30, maxWidth, historyChartHeight);

  const { allRowsForReporting } = prepareReportData(audits, questions);

  const auditsByArea = allRowsForReporting.reduce((acc, row) => {
    (acc[row.area] = acc[row.area] || []).push(row);
    return acc;
  }, {} as Record<string, typeof allRowsForReporting>);

  doc.addPage();
  doc.setFontSize(16);
  doc.text("Detalle de Auditorías", 15, 20);
  let finalY = 25;

  for (const area of Object.keys(auditsByArea).sort()) {
    if (finalY > 250) {
        doc.addPage();
        finalY = 20;
    }
    doc.setFontSize(14);
    doc.text(`Área: ${area}`, 15, finalY);
    finalY += 7;

    const areaRows = auditsByArea[area];
    const head = [['#', 'Pregunta', 'Respuesta', 'Observación']];
    const body = areaRows.map(row => [
        row.qNum,
        doc.splitTextToSize(row.pregunta, 80),
        row.respuesta,
        doc.splitTextToSize(row.observacion || '', 60),
    ]);

    (doc as any).autoTable({
        head, body, startY: finalY, theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        didDrawPage: (data: any) => { finalY = data.cursor.y; }
    });
    finalY = (doc as any).lastAutoTable.finalY + 5;
    
    const rowsWithPhotos = areaRows.filter(r => r.photo);
    if(rowsWithPhotos.length > 0) {
        if (finalY > 250) { doc.addPage(); finalY = 20; }
        doc.setFontSize(12);
        doc.text(`Evidencia fotográfica para ${area}:`, 15, finalY);
        finalY += 8;

        for (const row of rowsWithPhotos) {
             if (finalY > 230) { doc.addPage(); finalY = 20; }
             doc.setFontSize(10);
             doc.text(`- Pregunta #${row.qNum}: ${row.pregunta}`, 15, finalY, { maxWidth: maxWidth });
             finalY += 5;
             try {
                const photoDims = await getImageDimensions(row.photo!);
                const photoWidth = 80; // A larger width for better clarity
                const photoHeight = photoWidth * (photoDims.height / photoDims.width);
                if (finalY + photoHeight > 280) { doc.addPage(); finalY = 20; }
                doc.addImage(row.photo!, 'JPEG', 20, finalY + 2, photoWidth, photoHeight, undefined, 'NONE');
                finalY += photoHeight + 8;
             } catch(e) { console.error("Error adding image to PDF:", e) }
        }
    }
  }

  const { questionAnalysisData } = prepareReportData(audits, questions);
  doc.addPage();
  doc.setFontSize(16);
  doc.text("Análisis por Pregunta", pdfPageWidth / 2, 25, { align: 'center' });
  finalY = 35;

  for (let i = 0; i < questionAnalysisData.length; i++) {
      if (questionChartImages[i]) {
          const qChartDims = await getImageDimensions(questionChartImages[i]);
          const qChartHeight = maxWidth * (qChartDims.height / qChartDims.width);

          if (finalY + qChartHeight > 280) { doc.addPage(); finalY = 20; }
          
          doc.setFontSize(12);
          doc.text(questionAnalysisData[i].question, 15, finalY, { maxWidth: 180 });
          finalY += 10;
          doc.addImage(questionChartImages[i], 'PNG', margin, finalY, maxWidth, qChartHeight);
          finalY += qChartHeight + 5;
      }
  }

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
  workbook.creator = 'AuditApp';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.mergeCells('A1:D1');
  summarySheet.getCell('A1').value = 'Reporte de Auditorías 5S';
  summarySheet.getCell('A1').font = { size: 20, bold: true };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };
  summarySheet.getCell('A3').value = 'Cumplimiento Promedio';
  summarySheet.getCell('B3').value = `${stats.averageCompliance.toFixed(1)}%`;
  summarySheet.getCell('A4').value = 'Área con Menor Cumplimiento';
  summarySheet.getCell('B4').value = stats.lowestComplianceArea;
  [summarySheet.getCell('A3'), summarySheet.getCell('A4')].forEach(cell => { cell.font = { bold: true }; });

  const xlsxSummaryWidth = 800;
  
  const areaChartDims = await getImageDimensions(areaChartImg);
  const areaChartHeight = xlsxSummaryWidth * (areaChartDims.height / areaChartDims.width);
  const areaChartImageId = workbook.addImage({ base64: areaChartImg, extension: 'png' });
  summarySheet.addImage(areaChartImageId, { tl: { col: 0, row: 6 }, ext: { width: xlsxSummaryWidth, height: areaChartHeight } });
  
  const rowsForAreaChart = Math.ceil(areaChartHeight / 20);
  const historyChartStartRow = 6 + rowsForAreaChart + 2;

  const historyChartDims = await getImageDimensions(historyChartImg);
  const historyChartHeight = xlsxSummaryWidth * (historyChartDims.height / historyChartDims.width);
  const historyChartImageId = workbook.addImage({ base64: historyChartImg, extension: 'png' });
  summarySheet.addImage(historyChartImageId, { tl: { col: 0, row: historyChartStartRow }, ext: { width: xlsxSummaryWidth, height: historyChartHeight } });

  const dataSheet = workbook.addWorksheet('Datos Crudos');
  dataSheet.columns = [
    { header: 'Área', key: 'area', width: 20 }, { header: 'Fecha', key: 'fecha', width: 15 },
    { header: 'Auditor', key: 'auditor', width: 25 }, { header: 'N° Pregunta', key: 'qNum', width: 15 },
    { header: 'Pregunta', key: 'pregunta', width: 70 }, { header: 'Respuesta', key: 'respuesta', width: 15 },
    { header: 'Observación', key: 'observacion', width: 50 }, { header: 'Tiene Foto', key: 'photo', width: 15 },
  ];
  const { allRowsForReporting } = prepareReportData(audits, questions);
  allRowsForReporting.forEach(row => { dataSheet.addRow({ ...row, photo: row.photo ? 'Sí' : 'No' }); });

  const photoSheet = workbook.addWorksheet('Evidencia Fotográfica');
  photoSheet.columns = [
    { header: 'Área', key: 'area', width: 25 },
    { header: 'N° Pregunta', key: 'qNum', width: 15 },
    { header: 'Pregunta', key: 'pregunta', width: 70 },
  ];
  let photoSheetRow = 2;
  const photos = allRowsForReporting.filter(row => row.photo);
  for (const row of photos) {
    photoSheet.addRow({ area: row.area, qNum: row.qNum, pregunta: row.pregunta });
    const photoDims = await getImageDimensions(row.photo!);
    const photoWidth = 250;
    const photoHeight = photoWidth * (photoDims.height / photoDims.width);
    const imageId = workbook.addImage({ base64: row.photo!, extension: 'png' });
    photoSheet.addImage(imageId, {
        tl: { col: 3, row: photoSheetRow - 1 },
        ext: { width: photoWidth, height: photoHeight }
    });
    photoSheet.getRow(photoSheetRow).height = photoHeight * 0.75; // Set row height (points)
    photoSheetRow++;
  }


  const questionSheet = workbook.addWorksheet('Análisis por Pregunta');
  let currentRow = 1;
  const xlsxQuestionChartWidth = 800;
  for (let i = 0; i < questionChartImages.length; i++) {
    const imgBase64 = questionChartImages[i];
    if (imgBase64) {
        questionSheet.mergeCells(`A${currentRow}:J${currentRow}`);
        questionSheet.getCell(`A${currentRow}`).value = questions[i];
        questionSheet.getCell(`A${currentRow}`).font = { size: 14, bold: true };
        currentRow++;
        
        const qChartDims = await getImageDimensions(imgBase64);
        const qChartHeight = xlsxQuestionChartWidth * (qChartDims.height / qChartDims.width);
        const imageId = workbook.addImage({ base64: imgBase64, extension: 'png' });
        questionSheet.addImage(imageId, { tl: { col: 0, row: currentRow }, ext: { width: xlsxQuestionChartWidth, height: qChartHeight } });
        currentRow += Math.ceil(qChartHeight * 0.05) + 1; // Approximate row height calculation
    }
  }

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
    const docxMaxWidth = 600;

    const areaChartDims = await getImageDimensions(areaChartImg);
    const areaChartHeight = docxMaxWidth * (areaChartDims.height / areaChartDims.width);

    const historyChartDims = await getImageDimensions(historyChartImg);
    const historyChartHeight = docxMaxWidth * (historyChartDims.height / historyChartDims.width);

    const docChildren = [
        new Paragraph({ text: "Reporte de Auditorías 5S", heading: "Title", alignment: AlignmentType.CENTER }),
        new Paragraph({ text: "Resumen del Ciclo", heading: "Heading1" }),
        new Paragraph({ children: [ new TextRun({ text: "Cumplimiento Promedio: ", bold: true }), new TextRun(`${stats.averageCompliance.toFixed(1)}%`), ] }),
        new Paragraph({ children: [ new TextRun({ text: "Área con Menor Cumplimiento: ", bold: true }), new TextRun(stats.lowestComplianceArea), ] }),
        new Paragraph({ text: "Cumplimiento por Área", heading: "Heading2", alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [ new ImageRun({ data: base64ToUint8Array(areaChartImg), transformation: { width: docxMaxWidth, height: areaChartHeight } }) ], alignment: AlignmentType.CENTER }),
        
        new Paragraph({ text: "Histórico de Cumplimiento", heading: "Heading2", alignment: AlignmentType.CENTER, pageBreakBefore: true }),
        new Paragraph({ children: [ new ImageRun({ data: base64ToUint8Array(historyChartImg), transformation: { width: docxMaxWidth, height: historyChartHeight } }) ], alignment: AlignmentType.CENTER }),
    ];

    const { allRowsForReporting, questionAnalysisData } = prepareReportData(audits, questions);
    docChildren.push(new Paragraph({ text: "Detalle de Auditorías", pageBreakBefore: true, heading: "Heading1" }));
    const auditsByArea = allRowsForReporting.reduce((acc, row) => {
        (acc[row.area] = acc[row.area] || []).push(row);
        return acc;
    }, {} as Record<string, ReportRow[]>);

    for (const area of Object.keys(auditsByArea).sort()) {
        docChildren.push(new Paragraph({ text: `Área: ${area}`, heading: "Heading2" }));
        const tableRows = [
            new TableRow({
                children: ['#', 'Pregunta', 'Respuesta', 'Observación'].map(header => new TableCell({ children: [new Paragraph({ text: header, bold: true })], shading: { fill: "DDDDDD" } })),
                tableHeader: true,
            })
        ];
        for (const row of auditsByArea[area]) {
            tableRows.push(new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(String(row.qNum))] }),
                    new TableCell({ children: [new Paragraph(row.pregunta)] }),
                    new TableCell({ children: [new Paragraph(row.respuesta || '')] }),
                    new TableCell({ children: [new Paragraph(row.observacion || '')] }),
                ]
            }));
            if (row.photo) {
                 const photoDims = await getImageDimensions(row.photo);
                 const photoWidth = 200;
                 const photoHeight = photoWidth * (photoDims.height / photoDims.width);
                tableRows.push(new TableRow({
                    children: [ new TableCell({ columnSpan: 4, children: [
                        new Paragraph({ children: [ new ImageRun({ data: base64ToUint8Array(row.photo), transformation: { width: photoWidth, height: photoHeight } }) ], alignment: AlignmentType.CENTER })
                    ]})]
                }));
            }
        }
        docChildren.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    }

    docChildren.push(new Paragraph({ text: "Análisis por Pregunta", pageBreakBefore: true, heading: "Heading1" }));
    for (let i = 0; i < questionAnalysisData.length; i++) {
        const data = questionAnalysisData[i];
        const imgBase64 = questionChartImages[i];
        docChildren.push(new Paragraph({ text: data.question, heading: "Heading2"}));
        if (imgBase64) {
            const qChartDims = await getImageDimensions(imgBase64);
            const qChartHeight = docxMaxWidth * (qChartDims.height / qChartDims.width);
            docChildren.push(new Paragraph({
                children: [ new ImageRun({ data: base64ToUint8Array(imgBase64), transformation: { width: docxMaxWidth, height: qChartHeight } }) ],
                alignment: AlignmentType.CENTER,
            }));
        } else {
            docChildren.push(new Paragraph("Sin datos para esta pregunta."));
        }
    }

    const doc = new Document({ sections: [{ properties: {}, children: docChildren }] });
    const buffer = await Packer.toBlob(doc);
    saveAs(buffer, generateFileName('Reporte_Auditorias_5S', 'docx'));
};

// --- Reporte de Extintores ---

const inspectionQuestions = [
  "¿El extintor cuenta con presión?",
  "¿El extintor cuenta con manguera, boquilla y cono?",
  "¿El extintor cuenta con manómetro?",
  "¿El extintor se encuentra en buen estado?",
  "¿La señalización se encuentra visible?",
  "¿El extintor cuenta con su sello y pasador de seguridad?",
  "¿El extintor se encuentra libre de obstáculos?"
];

export const generateExtinguisherReportPdf = async (
  areas: ExtinguisherArea[],
  extinguishers: Extinguisher[],
  inspections: InspectionRecord[]
) => {
  const doc = new jsPDF();
  const pdfPageWidth = doc.internal.pageSize.getWidth();
  let finalY = 25;

  const inspectedExtinguisherIds = new Set(inspections.map(i => i.extinguisher_id));
  const inspectionsMap = new Map(inspections.map(i => [i.extinguisher_id, i]));

  // --- Página de Título y Resumen ---
  doc.setFontSize(22);
  doc.text("Reporte de Extintores", pdfPageWidth / 2, finalY, { align: 'center' });
  finalY += 20;
  doc.setFontSize(16);
  doc.text("Resumen General", 15, finalY);
  finalY += 10;
  doc.setFontSize(12);
  doc.text(`Total de Áreas: ${areas.length}`, 15, finalY);
  doc.text(`Total de Extintores: ${extinguishers.length}`, 80, finalY);
  doc.text(`Total de Inspecciones: ${inspections.length}`, 150, finalY);
  finalY += 15;

  // --- Detalle por Área ---
  for (const area of areas) {
    const extinguishersInArea = extinguishers.filter(e => e.area_id === area.id);
    if (extinguishersInArea.length === 0) continue;

    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(14);
    doc.text(`Área: ${area.name}`, 15, finalY);
    finalY += 8;

    const headExtinguishers = [['Ubicación', 'Serie', 'Tipo', 'Capacidad', 'Estado']];
    const bodyExtinguishers = extinguishersInArea.map(ext => [
      ext.location,
      ext.series || 'N/A',
      ext.type,
      ext.capacity,
      inspectedExtinguisherIds.has(ext.id) ? 'Inspeccionado' : 'Pendiente'
    ]);

    (doc as any).autoTable({
      head: headExtinguishers,
      body: bodyExtinguishers,
      startY: finalY,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }, // Azul
      didDrawPage: (data: any) => { finalY = data.cursor.y; }
    });
    finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // --- Detalle de Inspecciones por Extintor ---
    const inspectedInArea = extinguishersInArea.filter(e => inspectedExtinguisherIds.has(e.id));
    
    if (inspectedInArea.length > 0) {
       if (finalY > 250) {
        doc.addPage();
        finalY = 20;
       }
       doc.setFontSize(12);
       doc.text(`Resultados de Inspecciones en ${area.name}`, 15, finalY);
       finalY += 8;
    }

    for (const ext of inspectedInArea) {
      const inspection = inspectionsMap.get(ext.id);
      if (!inspection) continue;

      if (finalY > 250) {
        doc.addPage();
        finalY = 20;
      }

      doc.setFontSize(10);
      doc.text(`Inspección para: ${ext.location} (Serie: ${ext.series || 'N/A'})`, 15, finalY, { textColor: 'gray' });
      finalY += 6;

      const headInspection = [['Pregunta', 'Respuesta', 'Observación', 'Foto']];
      const bodyInspection = inspectionQuestions.map((q, index) => {
        const answerData = inspection.answers[index];
        return [
          doc.splitTextToSize(q, 70),
          answerData?.answer || 'N/A',
          doc.splitTextToSize(answerData?.observation || '', 60),
          answerData?.photo ? 'Sí' : 'No'
        ];
      });

      (doc as any).autoTable({
        head: headInspection,
        body: bodyInspection,
        startY: finalY,
        theme: 'striped',
        headStyles: { fillColor: [80, 80, 80] }, // Gris oscuro
        didDrawPage: (data: any) => { finalY = data.cursor.y; }
      });
      finalY = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  doc.save(generateFileName('Reporte_Extintores', 'pdf'));
};

export const generateExtinguisherReportXlsx = async (
  areas: ExtinguisherArea[],
  extinguishers: Extinguisher[],
  inspections: InspectionRecord[]
) => {
  const workbook = new Excel.Workbook();
  workbook.creator = 'AuditApp';
  workbook.created = new Date();

  const inspectedExtinguisherIds = new Set(inspections.map(i => i.extinguisher_id));
  const inspectionsMap = new Map(inspections.map(i => [i.extinguisher_id, i]));
  const areaMap = new Map(areas.map(a => [a.id, a.name]));

  // --- Hoja de Resumen ---
  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.mergeCells('A1:B1');
  summarySheet.getCell('A1').value = 'Reporte de Extintores';
  summarySheet.getCell('A1').font = { size: 18, bold: true };
  summarySheet.getCell('A3').value = 'Total de Áreas';
  summarySheet.getCell('B3').value = areas.length;
  summarySheet.getCell('A4').value = 'Total de Extintores';
  summarySheet.getCell('B4').value = extinguishers.length;
  summarySheet.getCell('A5').value = 'Total de Inspecciones';
  summarySheet.getCell('B5').value = inspections.length;
  summarySheet.getCell('A3').font = { bold: true };
  summarySheet.getCell('A4').font = { bold: true };
  summarySheet.getCell('A5').font = { bold: true };

  // --- Hoja de Detalle de Extintores ---
  const detailSheet = workbook.addWorksheet('Detalle Extintores');
  detailSheet.columns = [
    { header: 'Área', key: 'area', width: 30 },
    { header: 'Ubicación', key: 'location', width: 30 },
    { header: 'Serie', key: 'series', width: 20 },
    { header: 'Tipo', key: 'type', width: 15 },
    { header: 'Capacidad', key: 'capacity', width: 15 },
    { header: 'Estado', key: 'status', width: 20 },
  ];
  extinguishers.forEach(ext => {
    detailSheet.addRow({
      area: areaMap.get(ext.area_id) || 'Desconocida',
      location: ext.location,
      series: ext.series || 'N/A',
      type: ext.type,
      capacity: ext.capacity,
      status: inspectedExtinguisherIds.has(ext.id) ? 'Inspeccionado' : 'Pendiente'
    });
  });

  // --- Hoja de Resultados de Inspecciones ---
  const inspectionSheet = workbook.addWorksheet('Resultados Inspecciones');
  inspectionSheet.columns = [
    { header: 'Área', key: 'area', width: 30 },
    { header: 'Ubicación Extintor', key: 'location', width: 30 },
    { header: 'Serie Extintor', key: 'series', width: 20 },
    { header: 'N° Pregunta', key: 'qNum', width: 15 },
    { header: 'Pregunta', key: 'question', width: 60 },
    { header: 'Respuesta', key: 'answer', width: 15 },
    { header: 'Observación', key: 'observation', width: 50 },
    { header: 'Tiene Foto', key: 'photo', width: 15 },
  ];
  extinguishers.forEach(ext => {
    if (inspectedExtinguisherIds.has(ext.id)) {
      const inspection = inspectionsMap.get(ext.id);
      if (inspection) {
        inspectionQuestions.forEach((q, index) => {
          const answerData = inspection.answers[index];
          inspectionSheet.addRow({
            area: areaMap.get(ext.area_id) || 'Desconocida',
            location: ext.location,
            series: ext.series || 'N/A',
            qNum: index + 1,
            question: q,
            answer: answerData?.answer || 'N/A',
            observation: answerData?.observation || '',
            photo: answerData?.photo ? 'Sí' : 'No'
          });
        });
      }
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), generateFileName('Reporte_Extintores', 'xlsx'));
};


// --- Reporte de Botiquines ---

const firstAidKitQuestions = [
  "¿Se encuentra libre de obstáculos?",
  "¿Cuenta con su señalización?",
  "¿Presenta daños el botiquín?",
  "¿Cuenta con todos los materiales?",
  "¿Cuenta con checklist?"
];

export const generateFirstAidKitReportPdf = async (
  areas: FirstAidKitArea[],
  kits: FirstAidKit[]
) => {
  const doc = new jsPDF();
  const pdfPageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pdfPageWidth - margin * 2;
  let finalY = 25;

  // --- Página de Título y Resumen ---
  doc.setFontSize(22);
  doc.text("Reporte de Botiquines", pdfPageWidth / 2, finalY, { align: 'center' });
  finalY += 20;
  doc.setFontSize(16);
  doc.text("Resumen General", 15, finalY);
  finalY += 10;
  doc.setFontSize(12);
  doc.text(`Total de Áreas: ${areas.length}`, 15, finalY);
  doc.text(`Total de Botiquines Registrados: ${kits.length}`, 80, finalY);
  finalY += 15;

  // --- Detalle por Área ---
  for (const area of areas) {
    const kitsInArea = kits.filter(k => k.area_id === area.id);
    if (kitsInArea.length === 0) continue;

    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(14);
    doc.text(`Área: ${area.name}`, 15, finalY);
    finalY += 10;
    
    for (const kit of kitsInArea) {
      if (finalY > 250) {
        doc.addPage();
        finalY = 20;
      }
      doc.setFontSize(12);
      doc.text(`Inspección de Registro para Botiquín en: ${kit.location}`, 15, finalY, { textColor: 'gray' });
      finalY += 8;

      const headInspection = [['Pregunta', 'Respuesta', 'Observación', 'Foto']];
      const bodyInspection = firstAidKitQuestions.map((q, index) => {
        const answerData = kit.inspection_data[index];
        return [
          doc.splitTextToSize(q, 70),
          answerData?.answer || 'N/A',
          doc.splitTextToSize(answerData?.observation || '', 60),
          answerData?.photo ? 'Sí' : 'No'
        ];
      });

      (doc as any).autoTable({
        head: headInspection,
        body: bodyInspection,
        startY: finalY,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] }, // Verde
        didDrawPage: (data: any) => { finalY = data.cursor.y; }
      });
      finalY = (doc as any).lastAutoTable.finalY + 8;

      // --- Sección de Evidencia Fotográfica ---
      const photosForKit = firstAidKitQuestions
        .map((q, index) => ({ q, answer: kit.inspection_data[index] }))
        .filter(item => item.answer?.photo);

      if (photosForKit.length > 0) {
        if (finalY > 250) { doc.addPage(); finalY = 20; }
        doc.setFontSize(11);
        doc.text(`Evidencia para Botiquín en ${kit.location}:`, 15, finalY);
        finalY += 8;

        for (const item of photosForKit) {
          if (finalY > 230) { doc.addPage(); finalY = 20; }
          doc.setFontSize(9);
          doc.text(`- Pregunta: ${item.q}`, 15, finalY, { maxWidth: maxWidth });
          finalY += 4;
          try {
            const photo = item.answer.photo!;
            const photoDims = await getImageDimensions(photo);
            const photoWidth = 70;
            const photoHeight = photoWidth * (photoDims.height / photoDims.width);
            if (finalY + photoHeight > 280) { doc.addPage(); finalY = 20; }
            doc.addImage(photo, 'JPEG', 20, finalY + 2, photoWidth, photoHeight, undefined, 'NONE');
            finalY += photoHeight + 8;
          } catch(e) { console.error("Error adding image to PDF:", e) }
        }
      }
    }
  }

  doc.save(generateFileName('Reporte_Botiquines', 'pdf'));
};

export const generateFirstAidKitReportXlsx = async (
  areas: FirstAidKitArea[],
  kits: FirstAidKit[]
) => {
  const workbook = new Excel.Workbook();
  workbook.creator = 'AuditApp';
  workbook.created = new Date();
  
  const areaMap = new Map(areas.map(a => [a.id, a.name]));

  // --- Hoja de Resumen ---
  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.mergeCells('A1:B1');
  summarySheet.getCell('A1').value = 'Reporte de Botiquines';
  summarySheet.getCell('A1').font = { size: 18, bold: true };
  summarySheet.getCell('A3').value = 'Total de Áreas';
  summarySheet.getCell('B3').value = areas.length;
  summarySheet.getCell('A4').value = 'Total de Botiquines';
  summarySheet.getCell('B4').value = kits.length;
  summarySheet.getCell('A3').font = { bold: true };
  summarySheet.getCell('A4').font = { bold: true };

  // --- Hoja de Detalle de Botiquines ---
  const detailSheet = workbook.addWorksheet('Detalle Botiquines');
  detailSheet.columns = [
    { header: 'Área', key: 'area', width: 30 },
    { header: 'Ubicación', key: 'location', width: 40 },
    { header: 'Fecha de Registro', key: 'created_at', width: 25 },
  ];
  kits.forEach(kit => {
    detailSheet.addRow({
      area: areaMap.get(kit.area_id) || 'Desconocida',
      location: kit.location,
      created_at: new Date(kit.created_at).toLocaleString()
    });
  });

  // --- Hoja de Resultados de Inspección de Registro ---
  const inspectionSheet = workbook.addWorksheet('Resultados Inspección');
  inspectionSheet.columns = [
    { header: 'Área', key: 'area', width: 30 },
    { header: 'Ubicación Botiquín', key: 'location', width: 40 },
    { header: 'N° Pregunta', key: 'qNum', width: 15 },
    { header: 'Pregunta', key: 'question', width: 60 },
    { header: 'Respuesta', key: 'answer', width: 15 },
    { header: 'Observación', key: 'observation', width: 50 },
    { header: 'Tiene Foto', key: 'photo', width: 15 },
  ];
  kits.forEach(kit => {
    firstAidKitQuestions.forEach((q, index) => {
      const answerData = kit.inspection_data[index];
      inspectionSheet.addRow({
        area: areaMap.get(kit.area_id) || 'Desconocida',
        location: kit.location,
        qNum: index + 1,
        question: q,
        answer: answerData?.answer || 'N/A',
        observation: answerData?.observation || '',
        photo: answerData?.photo ? 'Sí' : 'No'
      });
    });
  });
  
  // --- Hoja de Evidencia Fotográfica ---
  const photoSheet = workbook.addWorksheet('Evidencia Fotográfica');
  photoSheet.columns = [
    { header: 'Área', key: 'area', width: 30 },
    { header: 'Ubicación Botiquín', key: 'location', width: 40 },
    { header: 'N° Pregunta', key: 'qNum', width: 15 },
    { header: 'Pregunta', key: 'question', width: 60 },
  ];

  let photoSheetRow = 2;
  for (const kit of kits) {
    for (let i = 0; i < firstAidKitQuestions.length; i++) {
      const answerData = kit.inspection_data[i];
      if (answerData?.photo) {
        photoSheet.addRow({
          area: areaMap.get(kit.area_id) || 'Desconocida',
          location: kit.location,
          qNum: i + 1,
          question: firstAidKitQuestions[i]
        });

        const photoDims = await getImageDimensions(answerData.photo);
        const photoWidth = 200;
        const photoHeight = photoWidth * (photoDims.height / photoDims.width);
        const imageId = workbook.addImage({ base64: answerData.photo, extension: 'png' });
        
        photoSheet.addImage(imageId, {
          tl: { col: 4, row: photoSheetRow - 1 },
          ext: { width: photoWidth, height: photoHeight }
        });
        
        photoSheet.getRow(photoSheetRow).height = photoHeight * 0.75;
        photoSheetRow++;
      }
    }
  }


  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), generateFileName('Reporte_Botiquines', 'xlsx'));
};
