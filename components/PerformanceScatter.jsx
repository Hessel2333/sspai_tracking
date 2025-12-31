import React from 'react';
import { Scatter } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    TimeScale
} from 'chart.js';
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import dayjs from 'dayjs';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, TimeScale);

export default function PerformanceScatter({ data = [], t }) {
    const chartData = {
        datasets: [
            {
                label: t('articles', 'Articles'),
                data: data.map(art => ({
                    x: art.created_at * 1000,
                    y: art.views,
                    r: Math.max(4, Math.min(20, (art.likes / 10) + 4)), // Radius based on likes
                    title: art.title
                })),
                backgroundColor: 'rgba(215, 0, 15, 0.6)',
                borderColor: 'rgba(215, 0, 15, 1)',
                borderWidth: 1,
                hoverBackgroundColor: 'rgba(215, 0, 15, 0.8)',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'month',
                },
                title: {
                    display: true,
                    text: t('columns.date', 'Date'),
                    font: { size: 10 }
                },
                grid: { display: false }
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: t('columns.views', 'Views'),
                    font: { size: 10 }
                },
                grid: { color: 'rgba(0,0,0,0.03)' }
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const art = context.raw;
                        return `${art.title}: ${art.y} Views`;
                    }
                }
            }
        },
        elements: {
            point: {
                radius: (context) => context.raw?.r || 5,
            }
        }
    };

    return (
        <div style={{ padding: 20, height: 300 }}>
            <Scatter data={chartData} options={options} />
        </div>
    );
}
