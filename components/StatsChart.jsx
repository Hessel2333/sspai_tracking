import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import dayjs from 'dayjs';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export default function StatsChart({ history, title = 'Trend', dataKey = 'views', color = 'rgb(217, 48, 37)' }) {
    const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const data = {
        labels: sortedHistory.map(h => dayjs(h.timestamp).format('MM-DD HH:mm')),
        datasets: [
            {
                label: title,
                data: sortedHistory.map(h => {
                    // If h has 'totals' (it's a daily snapshot), look in totals or articles
                    // If dataKey suggests looking into a specific article, the history passed here should already be "article history" (flat objects)
                    // or "global history".
                    // Let's assume the parent prepares the data correctly: an array of objects { timestamp, [dataKey]: value }
                    return h[dataKey] !== undefined ? h[dataKey] : 0;
                }),
                borderColor: color,
                backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.5)'),
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 5
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleFont: { size: 13 },
                bodyFont: { size: 13 },
                padding: 10,
                cornerRadius: 8,
                displayColors: false
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { maxTicksLimit: 8, color: '#86868B', font: { size: 11 } }
            },
            y: {
                border: { display: false },
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: { color: '#86868B', font: { size: 11 } },
                beginAtZero: false
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    return <div style={{ height: '300px' }}><Line options={options} data={data} /></div>;
}
