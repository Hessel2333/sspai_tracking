import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import dayjs from 'dayjs';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const FavoritesTimeline = ({ favorites, t }) => {
    if (!favorites || favorites.length === 0) return null;

    // Aggregate by Month
    const stats = {};
    favorites.forEach(fav => {
        // Fallback to current time if created_at is 0 or missing, to avoid "Invalid Date"
        // But better to just ignore or group into "Unknown"?
        // Let's fallback to "2023-01" or just skip if 0.
        // Actually, users prefer to see data. If 0, maybe use today? No, that's misleading.
        if (!fav.created_at || fav.created_at === 0) return;

        const month = dayjs.unix(fav.created_at).format('YYYY-MM');
        if (month === 'Invalid Date') return; // Double check
        stats[month] = (stats[month] || 0) + 1;
    });

    // Sort months (oldest to newest)
    const sortedMonths = Object.keys(stats).sort();
    // Fill gaps? Maybe simplistic for now.

    // Last 12 months only for clarity? Or all? Let's do all for now but maybe limit if too many.
    const displayMonths = sortedMonths.length > 12 ? sortedMonths.slice(sortedMonths.length - 12) : sortedMonths;

    const data = {
        labels: displayMonths,
        datasets: [
            {
                label: t('favoritesCount') || '收藏数量',
                data: displayMonths.map(m => stats[m]),
                backgroundColor: 'rgba(215, 30, 40, 0.6)',
                borderColor: 'rgba(215, 30, 40, 0.8)',
                borderWidth: 1,
                borderRadius: 4,
                hoverBackgroundColor: 'rgba(215, 30, 40, 0.8)',
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    title: (items) => {
                        return dayjs(items[0].label).format('YYYY年M月'); // Localize format if needed
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { fontSize: 10 }
            },
            y: {
                beginAtZero: true,
                ticks: { stepSize: 1 },
                grid: { borderDash: [2, 4], color: 'rgba(0,0,0,0.05)' }
            }
        },
        maintainAspectRatio: false
    };

    return (
        <div style={{ height: 250, width: '100%' }}>
            <Bar data={data} options={options} />
        </div>
    );
};

export default FavoritesTimeline;
