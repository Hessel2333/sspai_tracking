import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import dayjs from 'dayjs';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function HabitClock({ data = [], t }) {
    const hourlyData = useMemo(() => {
        const hours = new Array(24).fill(0);
        data.forEach((act) => {
            const hour = dayjs.unix(act.created_at).hour();
            hours[hour] += 1;
        });
        return hours;
    }, [data]);

    const option = useMemo(() => {
        const labels = new Array(24).fill(0).map((_, i) => `${String(i).padStart(2, '0')}:00`);
        const maxValue = Math.max(0, ...hourlyData);
        const axisMax = maxValue > 0 ? Math.ceil(maxValue * 1.2) : 1;

        return {
            animationDuration: 400,
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(0,0,0,0.84)',
                borderWidth: 0,
                textStyle: { color: '#fff' },
                formatter: (params) => {
                    const index = Number(params?.dataIndex || 0);
                    const value = hourlyData[index] || 0;
                    return `${labels[index]}: ${Number(value).toLocaleString()} ${t('interacts', 'Interactions')}`;
                }
            },
            radar: {
                center: ['50%', '52%'],
                radius: '70%',
                splitNumber: 4,
                indicator: labels.map((label) => ({ name: label, max: axisMax })),
                axisName: {
                    color: '#86868B',
                    fontSize: 9
                },
                axisLine: {
                    lineStyle: {
                        color: 'rgba(0,0,0,0.08)'
                    }
                },
                splitLine: {
                    lineStyle: {
                        color: 'rgba(0,0,0,0.06)'
                    }
                },
                splitArea: {
                    areaStyle: {
                        color: ['rgba(0,0,0,0.005)', 'rgba(0,0,0,0.014)']
                    }
                }
            },
            series: [
                {
                    type: 'radar',
                    symbol: 'circle',
                    symbolSize: 4,
                    data: [
                        {
                            value: hourlyData,
                            name: t('activityDensity', 'Activity Density'),
                            areaStyle: { color: 'rgba(217, 48, 37, 0.18)' },
                            lineStyle: { color: 'rgba(217, 48, 37, 0.95)', width: 2 },
                            itemStyle: { color: 'rgba(217, 48, 37, 1)' }
                        }
                    ]
                }
            ]
        };
    }, [hourlyData, t]);

    return (
        <div style={{ height: 350, width: '100%' }}>
            <ReactECharts option={option} notMerge lazyUpdate style={{ height: '100%', width: '100%' }} />
        </div>
    );
}
