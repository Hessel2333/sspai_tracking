import React, { useMemo } from 'react';
import { Radar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
} from 'chart.js';
import dayjs from 'dayjs';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function HabitClock({ data = [], t }) {
    const hourlyData = useMemo(() => {
        const hours = new Array(24).fill(0);
        data.forEach(act => {
            const hour = dayjs.unix(act.created_at).hour();
            hours[hour]++;
        });
        return hours;
    }, [data]);

    const chartData = {
        labels: new Array(24).fill(0).map((_, i) => `${String(i).padStart(2, '0')}:00`),
        datasets: [
            {
                label: t('activityDensity', 'Activity Density'),
                data: hourlyData,
                backgroundColor: 'rgba(215, 0, 15, 0.2)',
                borderColor: 'rgba(215, 0, 15, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(215, 0, 15, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(215, 0, 15, 1)'
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: { display: true },
                suggestedMin: 0,
                ticks: { display: false }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.label}: ${context.raw} Interactions`
                }
            }
        }
    };

    return (
        <div style={{ height: 350, width: '100%' }}>
            <Radar data={chartData} options={options} />
        </div>
    );
}
