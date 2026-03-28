// Exportar reportes financieros en PDF usando jsPDF

export async function exportFinancialReport(data: {
    userName: string
    totalIncome: number
    totalExpenses: number
    balance: number
    totalDebt: number
    transactions?: any[]
    period?: string
}) {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const now = new Date()
    const period = data.period || now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    const W = 210

    // ── Header gradient band ──────────────────────────────────────────────
    doc.setFillColor(3, 7, 18)
    doc.rect(0, 0, W, 52, 'F')

    // Accent line
    doc.setFillColor(16, 185, 129)
    doc.rect(0, 52, W, 1.5, 'F')

    // Logo text
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(28)
    doc.setTextColor(16, 185, 129)
    doc.text('FINNOVA', 15, 22)

    // Tagline
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text('Tu Copiloto Financiero con IA', 15, 30)

    // Report title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(241, 245, 249)
    doc.text(`Reporte Financiero — ${period}`, 15, 42)

    // Date right-aligned
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`Generado: ${now.toLocaleString('es-CO')}`, W - 15, 42, { align: 'right' })

    // ── Greeting ─────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    doc.text(`Hola, ${data.userName} 👋`, 15, 64)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text('Aquí tienes un resumen de tu situación financiera para el período seleccionado.', 15, 71)

    // ── KPI Cards (2×2) ──────────────────────────────────────────────────
    const kpis = [
        { label: 'Ingresos Totales', value: formatCOP(data.totalIncome), icon: '↑', color: [16, 185, 129] as RGB, bg: [240, 253, 244] as RGB },
        { label: 'Gastos Totales', value: formatCOP(data.totalExpenses), icon: '↓', color: [239, 68, 68] as RGB, bg: [254, 242, 242] as RGB },
        { label: 'Balance Neto', value: formatCOP(data.balance), icon: '=', color: data.balance >= 0 ? [16, 185, 129] as RGB : [239, 68, 68] as RGB, bg: data.balance >= 0 ? [240, 253, 244] as RGB : [254, 242, 242] as RGB },
        { label: 'Deuda Total', value: formatCOP(data.totalDebt), icon: '!', color: [245, 158, 11] as RGB, bg: [255, 251, 235] as RGB },
    ]

    kpis.forEach((kpi, i) => {
        const x = 15 + (i % 2) * 93
        const y = 78 + Math.floor(i / 2) * 30

        // Card bg
        doc.setFillColor(...kpi.bg)
        doc.roundedRect(x, y, 87, 25, 3, 3, 'F')

        // Left accent bar
        doc.setFillColor(...kpi.color)
        doc.roundedRect(x, y, 3, 25, 1.5, 1.5, 'F')

        // Label
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        doc.text(kpi.label, x + 8, y + 9)

        // Value
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(13)
        doc.setTextColor(...kpi.color)
        doc.text(kpi.value, x + 8, y + 20)
    })

    // ── Savings rate bar ─────────────────────────────────────────────────
    const savingsRate = data.totalIncome > 0 ? Math.max(0, Math.min(100, ((data.totalIncome - data.totalExpenses) / data.totalIncome) * 100)) : 0
    const barY = 142

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text('Tasa de Ahorro', 15, barY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text(`${savingsRate.toFixed(1)}%`, W - 15, barY, { align: 'right' })

    // Track
    doc.setFillColor(226, 232, 240)
    doc.roundedRect(15, barY + 3, W - 30, 5, 2.5, 2.5, 'F')
    // Fill
    const fillW = Math.max(4, ((W - 30) * savingsRate) / 100)
    const fillColor: RGB = savingsRate >= 20 ? [16, 185, 129] : savingsRate >= 10 ? [245, 158, 11] : [239, 68, 68]
    doc.setFillColor(...fillColor)
    doc.roundedRect(15, barY + 3, fillW, 5, 2.5, 2.5, 'F')

    // ── Transactions table ────────────────────────────────────────────────
    if (data.transactions && data.transactions.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(15, 23, 42)
        doc.text('Historial de Transacciones', 15, 160)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.text(`Mostrando ${Math.min(data.transactions.length, 30)} de ${data.transactions.length} transacciones`, 15, 166)

        autoTable(doc, {
            startY: 170,
            head: [['Fecha', 'Descripción', 'Categoría', 'Tipo', 'Monto']],
            body: data.transactions.slice(0, 30).map(t => [
                new Date(t.date || t.createdAt).toLocaleDateString('es-CO'),
                t.description || t.type || '-',
                t.category || '-',
                t.type === 'income' ? '↑ Ingreso' : '↓ Gasto',
                formatCOP(t.amount)
            ]),
            headStyles: {
                fillColor: [3, 7, 18],
                textColor: [16, 185, 129],
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: 4,
            },
            bodyStyles: { fontSize: 8.5, cellPadding: 3.5 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 24 },
                1: { cellWidth: 52 },
                2: { cellWidth: 32 },
                3: { cellWidth: 22 },
                4: { cellWidth: 30, halign: 'right' },
            },
            didParseCell(data) {
                if (data.section === 'body' && data.column.index === 3) {
                    const val = String(data.cell.raw)
                    data.cell.styles.textColor = val.includes('Ingreso') ? [16, 185, 129] : [239, 68, 68]
                    data.cell.styles.fontStyle = 'bold'
                }
                if (data.section === 'body' && data.column.index === 4) {
                    const rowRaw = data.row.raw as string[]
                    const isIncome = rowRaw[3]?.toString().includes('Ingreso')
                    data.cell.styles.textColor = isIncome ? [16, 185, 129] : [239, 68, 68]
                    data.cell.styles.fontStyle = 'bold'
                }
            },
        })
    }

    // ── Footer ────────────────────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)

        // Footer band
        doc.setFillColor(3, 7, 18)
        doc.rect(0, 284, W, 13, 'F')
        doc.setFillColor(16, 185, 129)
        doc.rect(0, 284, W, 0.8, 'F')

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(100, 116, 139)
        doc.text('© 2026 FINNOVA — Reporte generado automáticamente. Los datos son de carácter informativo.', 15, 291)
        doc.text(`Página ${i} / ${pageCount}`, W - 15, 291, { align: 'right' })
    }

    doc.save(`FINNOVA_Reporte_${now.toISOString().split('T')[0]}.pdf`)
}

type RGB = [number, number, number]

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}
