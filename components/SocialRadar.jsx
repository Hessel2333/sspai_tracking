import { useMemo } from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function SocialRadar({ data = [], labels = [], title = 'DNA' }) {
    const option = useMemo(() => {
        const safeLabels = Array.isArray(labels) ? labels : [];
        const safeData = Array.isArray(data) ? data : [];
        const radarValues = safeLabels.map((_, index) => {
            const value = Number(safeData[index] || 0);
            return Number.isFinite(value) ? value : 0;
        });
        const maxValue = Math.max(0, ...radarValues);
        const axisMax = maxValue > 0 ? Math.ceil(maxValue * 1.2) : 1;
        const indicator = safeLabels.map((name) => ({ name, max: axisMax }));

        return {
            animationDuration: 400,
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(0,0,0,0.84)',
                borderWidth: 0,
                textStyle: { color: '#fff' },
                formatter: () => safeLabels
                    .map((name, idx) => `${name}: ${radarValues[idx].toLocaleString()}`)
                    .join('<br/>')
            },
            radar: {
                center: ['50%', '52%'],
                radius: '66%',
                splitNumber: 5,
                indicator,
                axisName: {
                    color: '#86868B',
                    fontSize: 11
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
                        color: ['rgba(0,0,0,0.008)', 'rgba(0,0,0,0.014)']
                    }
                }
            },
            series: [
                {
                    type: 'radar',
                    symbol: 'circle',
                    symbolSize: 6,
                    data: [
                        {
                            value: radarValues,
                            name: title,
                            areaStyle: {
                                color: 'rgba(245, 87, 108, 0.18)'
                            },
                            lineStyle: {
                                color: 'rgba(245, 87, 108, 0.9)',
                                width: 2
                            },
                            itemStyle: {
                                color: 'rgba(245, 87, 108, 1)'
                            }
                        }
                    ]
                }
            ]
        };
    }, [data, labels, title]);

    return (
        <div style={{ height: '300px', width: '100%' }}>
            <ReactECharts option={option} notMerge lazyUpdate style={{ height: '100%', width: '100%' }} />
        </div>
    );
}
