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
    TimeScale
} from 'chart.js';
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import dayjs from 'dayjs';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
);

export default function StatsChart({ history, title = 'Trend', dataKey = 'views', color = 'rgb(217, 48, 37)' }) {
    const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const data = {
        datasets: [
            {
                label: title,
                data: sortedHistory.map(h => {
                    // Helper to access nested properties safely
                    const getNested = (obj, path) => path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);

                    let val = getNested(h, dataKey);

                    // Fallback for legacy flat structure
                    if (val === undefined) {
                        if (dataKey === 'totals.views') val = h.total_views;
                        if (dataKey === 'totals.likes') val = h.total_likes;
                        if (dataKey === 'totals.comments') val = h.total_comments;
                    }

                    return {
                        x: h.timestamp, // Use ISO timestamp for X
                        y: val !== undefined ? val : 0
                    };
                }),
                borderColor: color,
                backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.5)'),
                tension: 0, // 设为 0，禁用曲线，改为直线连接
                pointRadius: 4, // 稍微加大点的大小，方便查看
                pointHoverRadius: 6,
                fill: false
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
                type: 'time',
                time: {
                    tooltipFormat: 'MM-DD HH:mm',
                    displayFormats: {
                        hour: 'MM-DD HH:mm',
                        day: 'MM-DD'
                    }
                },
                grid: { display: false },
                ticks: { maxTicksLimit: 8, color: '#86868B', font: { size: 11 } }
            },
            y: {
                border: { display: false },
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: {
                    color: '#86868B',
                    font: { size: 11 },
                    stepSize: 1, // Force integers
                    precision: 0 // No decimals
                },
                beginAtZero: false,
                grace: '20%' // Add 20% padding to top/bottom
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
