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

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

export default function SocialRadar({ data, labels, title = 'DNA' }) {
    const chartData = {
        labels: labels,
        datasets: [
            {
                label: title,
                data: data,
                backgroundColor: 'rgba(240, 147, 251, 0.2)',
                borderColor: 'rgba(245, 87, 108, 0.8)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(245, 87, 108, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(245, 87, 108, 1)',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: {
                    display: true,
                    color: 'rgba(0,0,0,0.05)'
                },
                grid: {
                    color: 'rgba(0,0,0,0.05)'
                },
                suggestedMin: 0,
                ticks: {
                    display: false,
                    stepSize: 1
                },
                pointLabels: {
                    font: {
                        size: 11,
                        family: "'SF Pro Text', 'Myriad Set Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif"
                    },
                    color: '#86868B'
                }
            }
        },
        plugins: {
            legend: {
                display: false
            }
        }
    };

    return (
        <div style={{ height: '300px', width: '100%' }}>
            <Radar data={chartData} options={options} />
        </div>
    );
}
