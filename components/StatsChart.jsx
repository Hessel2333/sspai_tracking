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
                    // Helper to access nested properties safely
                    const getNested = (obj, path) => path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);

                    let val = getNested(h, dataKey);

                    // Fallback for legacy flat structure (e.g. totals.views -> total_views)
                    if (val === undefined) {
                        if (dataKey === 'totals.views') val = h.total_views;
                        if (dataKey === 'totals.likes') val = h.total_likes;
                        if (dataKey === 'totals.comments') val = h.total_comments;
                    }

                    return val !== undefined ? val : 0;
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
