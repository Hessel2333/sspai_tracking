import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const FavoritesAuthors = ({ favorites, t }) => {
    if (!favorites || favorites.length === 0) return null;

    // Aggregate Authors
    const authorStats = {};
    favorites.forEach(fav => {
        const name = fav.author?.nickname || 'Unknown';
        authorStats[name] = (authorStats[name] || 0) + 1;
    });

    // Sort and Top 5
    const sortedAuthors = Object.entries(authorStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5

    const data = {
        labels: sortedAuthors.map(([name]) => name),
        datasets: [
            {
                data: sortedAuthors.map(([, count]) => count),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
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

export default FavoritesAuthors;
