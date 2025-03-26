// outputHelpers.js
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';

export const exportCSV = (results, statKeys, outPath) => {
  const headers = ['name', 'id', ...statKeys];
  const rows = [headers.join(',')];
  for (const row of results) {
    const line = headers.map(h => JSON.stringify(row[h] ?? 0)).join(',');
    rows.push(line);
  }
  fs.writeFileSync(outPath, rows.join('\n'), 'utf8');
  console.log(`📄 Saved CSV export to ${outPath}`);
};

export const generateBarChart = async (data, statKey, outputFileName) => {
  const truncate = (name, max = 12) => name.length > max ? name.slice(0, max) + '…' : name;
  const labels = data.map(d => truncate(d.name));
  const values = data.map(d => d[statKey]);
  const chartWidth = Math.max(800, labels.length * 15);

  const chartConfig = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: `${statKey} - Delta (Past Month)`,
        data: values,
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: `${statKey} (Past Month)` }
      },
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 45,
            font: { size: 10 }
          }
        },
        y: { beginAtZero: true }
      }
    }
  };

  const response = await axios({
    method: 'POST',
    url: 'https://quickchart.io/chart',
    responseType: 'arraybuffer',
    data: {
      width: chartWidth,
      height: 400,
      format: 'png',
      version: '3',
      chart: chartConfig
    }
  });

  const filePath = path.join('output/charts', `${outputFileName}.png`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, response.data);
  console.log(`📈 Saved chart to ${filePath}`);
};

export const generateTextReport = (data, statKeys) => {
  const reportDate = dayjs().startOf('month').format('MMMM YYYY');
  let output = `📊 Faction Monthly Report — ${reportDate}\n\n`;

  output += `🏆 Top Stats This Month:\n`;
  statKeys.forEach(stat => {
    const total = data.reduce((sum, d) => sum + (d[stat] || 0), 0);
    const top = data.reduce((best, d) => (d[stat] > (best[stat] || 0) ? d : best), {});
    output += `- ${stat}: ${total.toLocaleString()} total | Top: ${top.name} (+${(top[stat] || 0).toLocaleString()})\n`;
  });
  output += `\n`;

  statKeys.forEach(stat => {
    const top10 = [...data].sort((a, b) => (b[stat] || 0) - (a[stat] || 0)).slice(0, 10);
    output += `📈 Past Month Top 10 — ${stat}:\n`;
    top10.forEach((p, i) => {
      output += `${(i + 1).toString().padStart(2)}. ${p.name.padEnd(16)} +${(p[stat] || 0).toLocaleString()}\n`;
    });
    output += `\n`;
  });

  statKeys.forEach(stat => {
    const top10 = [...data]
      .map(p => ({ name: p.name, value: p.current?.[stat] || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    output += `📈 All-Time Top 10 — ${stat}:\n`;
    top10.forEach((p, i) => {
      output += `${(i + 1).toString().padStart(2)}. ${p.name.padEnd(16)} ${p.value.toLocaleString()}\n`;
    });
    output += `\n`;
  });

  console.log(output);
};

export const generatePDFReport = (data, statKeys, chartDir, outputPath) => {
  const doc = new PDFDocument({ autoFirstPage: false });
  doc.pipe(fs.createWriteStream(outputPath));
  const reportDate = dayjs().startOf('month').format('MMMM YYYY');

  const addPageFooter = () => {
    doc.fontSize(8).fillColor('gray').text(`Page ${doc.page.number}`, doc.page.margins.left, doc.page.height - 40, { align: 'right' });
  };

  const drawTopTable = (stat) => {
    const top10 = [...data].sort((a, b) => (b[stat] || 0) - (a[stat] || 0)).slice(0, 10);
    doc.moveDown(2);
    doc.fontSize(13).fillColor('black').text(`Top 10 by ${stat}:`, { underline: true });
    doc.font('Courier-Bold').text('Rank  Name               Value');
    doc.font('Courier');
    top10.forEach((p, i) => {
      const rank = `${i + 1}.`;
      const name = p.name.padEnd(18);
      const value = (p[stat] || 0).toLocaleString().padStart(10);
      doc.text(`${rank}  ${name}  ${value}`);
    });
    doc.moveDown(1);
  };

  // Cover Page
  doc.addPage();
  doc.fontSize(28).fillColor('black').text('Faction Monthly Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(16).text(`Report Period: ${reportDate}`, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(12).fillColor('gray').text(`Generated on: ${dayjs().format('MMMM D, YYYY')}`, { align: 'center' });
  addPageFooter();

  // Summary
  doc.addPage();
  doc.fontSize(22).fillColor('black').text('Summary Overview', { underline: true });
  doc.moveDown();
  statKeys.forEach(stat => {
    const total = data.reduce((acc, d) => acc + (d[stat] || 0), 0);
    const top = data.reduce((best, d) => (d[stat] > (best[stat] || 0) ? d : best), {});
    doc.fontSize(14).fillColor('black').text(`${stat}:`);
    doc.fontSize(12).text(`  • Total Gained: ${total.toLocaleString()}`);
    doc.text(`  • Top Performer: ${top.name} (+${(top[stat] || 0).toLocaleString()})`);
    doc.moveDown(0.5);
  });
  addPageFooter();

  // Chart Pages
  const chartFiles = fs.readdirSync(chartDir).filter(f => f.endsWith('.png'));
  for (const file of chartFiles) {
    const statKey = file.replace('chart_', '').replace('.png', '');
    doc.addPage();
    doc.fontSize(20).fillColor('black').text(`${statKey.toUpperCase()}`, { align: 'center' });
    doc.moveDown();
    drawTopTable(statKey);
    doc.moveDown(1);
    const imgPath = path.join(chartDir, file);
    doc.image(imgPath, { fit: [500, 300], align: 'center', valign: 'center' });
    addPageFooter();
  }

  doc.end();
  console.log(`📄 PDF report saved to ${outputPath}`);
};
