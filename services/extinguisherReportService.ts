import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Excel from 'exceljs';
import saveAs from 'file-saver';
import { ExtinguisherArea, Extinguisher, InspectionRecord } from '../types';
import { generateFileName, fetchImageAsBase64, getImageDimensions } from './reportUtils';

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

  doc.setFontSize(22);
  doc.text("Reporte de Inspección de Extintores", pdfPageWidth / 2, finalY, { align: 'center' });
  finalY += 20;

  const inspectionMap = new Map(inspections.map(i => [i.extinguisher_id, i]));

  for (const area of areas) {
    const extinguishersInArea = extinguishers.filter(e => e.area_id === area.id);
    if (extinguishersInArea.length === 0) continue;

    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(16);
    doc.text(`Área: ${area.name}`, 15, finalY);
    finalY += 10;
    
    for (const ext of extinguishersInArea) {
      const inspection = inspectionMap.get(ext.id);
      if (finalY > 250) {
        doc.addPage();
        finalY = 20;
      }
      doc.setFontSize(12);
      doc.text(`Extintor en: ${ext.location} (Serie: ${ext.series || 'N/A'})`, 15, finalY, { textColor: 'gray' });
      finalY += 8;

      if (inspection) {
        const head = [['#', 'Pregunta', 'Respuesta', 'Observación']];
        const body = inspectionQuestions.map((q, index) => {
          const answerData = inspection.answers[index];
          return [
            index + 1,
            doc.splitTextToSize(q, 70),
            answerData?.answer || 'N/A',
            doc.splitTextToSize(answerData?.observation || '', 60),
          ];
        });
        (doc as any).autoTable({
          head,
          body,
          startY: finalY,
          theme: 'striped',
          headStyles: { fillColor: [220, 53, 69] }, // Red
          didDrawPage: (data: any) => { finalY = data.cursor.y; }
        });
        finalY = (doc as any).lastAutoTable.finalY + 8;
        
        // Add photos
        const photosForInspection = await Promise.all(
          Object.entries(inspection.answers).map(async ([index, answerData]) => {
            if (answerData.photo) {
              const photoBase64 = await fetchImageAsBase64(answerData.photo).catch(() => null);
              return { q: inspectionQuestions[parseInt(index,10)], photoBase64 };
            }
            return null;
          })
        ).then(results => results.filter(Boolean) as { q: string, photoBase64: string | null }[]);
        
        const validPhotos = photosForInspection.filter(p => p.photoBase64) as { q: string, photoBase64: string }[];

        if (validPhotos.length > 0) {
            if (finalY > 250) { doc.addPage(); finalY = 20; }
            doc.setFontSize(11);
            doc.text(`Evidencia para extintor en ${ext.location}:`, 15, finalY);
            finalY += 8;
    
            for (const item of validPhotos) {
              if (finalY > 230) { doc.addPage(); finalY = 20; }
              doc.setFontSize(9);
              doc.text(`- Pregunta: ${item.q}`, 15, finalY, { maxWidth: pdfPageWidth - 30 });
              finalY += 4;
              try {
                const photoDims = await getImageDimensions(item.photoBase64);
                const photoWidth = 70;
                const photoHeight = photoWidth * (photoDims.height / photoDims.width);
                if (finalY + photoHeight > 280) { doc.addPage(); finalY = 20; }
                doc.addImage(item.photoBase64, 'JPEG', 20, finalY + 2, photoWidth, photoHeight);
                finalY += photoHeight + 8;
              } catch(e) { console.error("Error adding image to PDF:", e) }
            }
        }

      } else {
        doc.setFontSize(10);
        doc.text("Este extintor no ha sido inspeccionado.", 20, finalY);
        finalY += 10;
      }
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
    
    const inspectionMap = new Map(inspections.map(i => [i.extinguisher_id, i]));
    const areaMap = new Map(areas.map(a => [a.id, a.name]));

    const summarySheet = workbook.addWorksheet('Resumen');
    summarySheet.mergeCells('A1:B1');
    summarySheet.getCell('A1').value = 'Reporte de Extintores';
    summarySheet.getCell('A1').font = { size: 18, bold: true };
    summarySheet.getCell('A3').value = 'Total de Áreas';
    summarySheet.getCell('B3').value = areas.length;
    summarySheet.getCell('A4').value = 'Total de Extintores';
    summarySheet.getCell('B4').value = extinguishers.length;
    summarySheet.getCell('A5').value = 'Extintores Inspeccionados';
    summarySheet.getCell('B5').value = inspections.length;
    summarySheet.getCell('A3').font = { bold: true };
    summarySheet.getCell('A4').font = { bold: true };
    summarySheet.getCell('A5').font = { bold: true };
    
    const detailSheet = workbook.addWorksheet('Detalle Inspecciones');
    detailSheet.columns = [
        { header: 'Área', key: 'area', width: 30 },
        { header: 'Ubicación Extintor', key: 'location', width: 40 },
        { header: 'Serie', key: 'series', width: 20 },
        { header: 'Tipo', key: 'type', width: 15 },
        { header: 'Capacidad', key: 'capacity', width: 15 },
        { header: 'Fecha Inspección', key: 'date', width: 25 },
        { header: 'N° Pregunta', key: 'qNum', width: 15 },
        { header: 'Pregunta', key: 'question', width: 60 },
        { header: 'Respuesta', key: 'answer', width: 15 },
        { header: 'Observación', key: 'observation', width: 50 },
        { header: 'URL Foto', key: 'photo', width: 50 },
    ];
    
    for (const ext of extinguishers) {
        const inspection = inspectionMap.get(ext.id);
        if (inspection) {
            inspectionQuestions.forEach((q, index) => {
                const answerData = inspection.answers[index];
                detailSheet.addRow({
                    area: areaMap.get(ext.area_id) || 'Desconocida',
                    location: ext.location,
                    series: ext.series,
                    type: ext.type,
                    capacity: ext.capacity,
                    date: inspection.created_at ? new Date(inspection.created_at).toLocaleString() : 'N/A',
                    qNum: index + 1,
                    question: q,
                    answer: answerData?.answer || 'N/A',
                    observation: answerData?.observation || '',
                    photo: answerData?.photo || 'No'
                });
            });
        }
    }
    
    const photoSheet = workbook.addWorksheet('Evidencia Fotográfica');
    photoSheet.columns = [
      { header: 'Área', key: 'area', width: 30 },
      { header: 'Ubicación Extintor', key: 'location', width: 40 },
      { header: 'N° Pregunta', key: 'qNum', width: 15 },
      { header: 'Pregunta', key: 'question', width: 60 },
    ];
  
    let photoSheetRow = 2;
    for (const ext of extinguishers) {
        const inspection = inspectionMap.get(ext.id);
        if (inspection) {
            for (let i = 0; i < inspectionQuestions.length; i++) {
                const answerData = inspection.answers[i];
                if (answerData?.photo) {
                    photoSheet.addRow({
                        area: areaMap.get(ext.area_id) || 'Desconocida',
                        location: ext.location,
                        qNum: i + 1,
                        question: inspectionQuestions[i]
                    });
                    try {
                        const photoBase64 = await fetchImageAsBase64(answerData.photo);
                        const photoDims = await getImageDimensions(photoBase64);
                        const photoWidth = 200;
                        const photoHeight = photoWidth * (photoDims.height / photoDims.width);
                        const imageId = workbook.addImage({ base64: photoBase64, extension: 'png' });
                        
                        photoSheet.addImage(imageId, {
                          tl: { col: 4, row: photoSheetRow - 1 },
                          ext: { width: photoWidth, height: photoHeight }
                        });
                        
                        photoSheet.getRow(photoSheetRow).height = photoHeight * 0.75;
                    } catch(e) { console.error("Could not add image to XLSX", e); }
            
                    photoSheetRow++;
                }
            }
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), generateFileName('Reporte_Extintores', 'xlsx'));
};
