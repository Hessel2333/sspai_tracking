import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const FavoritesTags = ({ favorites, t }) => {
    if (!favorites || favorites.length === 0) return null;

    // Aggregate Tags
    const tagStats = {};
    favorites.forEach(fav => {
        if (fav.tags && Array.isArray(fav.tags)) {
            fav.tags.forEach(tag => {
                tagStats[tag] = (tagStats[tag] || 0) + 1;
            });
        }
    });

    // Check if we have tags
    if (Object.keys(tagStats).length === 0) {
        return <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 13 }}>{t('noTagData') || '无标签数据'}</div>;
    }

    // Sort and Top 5
    const sortedTags = Object.entries(tagStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5

    const data = {
        labels: sortedTags.map(([name]) => name),
        datasets: [
            {
                data: sortedTags.map(([, count]) => count),
                backgroundColor: [
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(201, 203, 207, 0.7)',
                ],
                borderColor: [
                    'rgba(255, 159, 64, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(201, 203, 207, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    font: { size: 12 }
                }
            }
        },
        maintainAspectRatio: false
    };

    return (
        <div style={{ height: 250, width: '100%', position: 'relative' }}>
            <Doughnut data={data} options={options} />
        </div>
    );
};

export default FavoritesTags;
