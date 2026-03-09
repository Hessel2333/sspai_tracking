import { useMemo } from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export default function PerformanceScatter({ data = [], t }) {
    const points = useMemo(() => {
        return (data || [])
            .filter((item) => Number.isFinite(Number(item?.created_at)) && Number.isFinite(Number(item?.views)))
            .map((item) => {
                const likes = Number(item.likes || 0);
                return {
                    value: [Number(item.created_at) * 1000, Number(item.views)],
                    title: item.title || '-',
                    likes,
                    comments: Number(item.comments || 0),
                    symbolSize: Math.max(8, Math.min(28, Math.round(likes / 8) + 8))
                };
            })
            .sort((a, b) => a.value[0] - b.value[0]);
    }, [data]);

    const option = useMemo(() => ({
        animationDuration: 400,
        grid: {
            left: 44,
            right: 20,
            top: 26,
            bottom: 26
        },
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(0,0,0,0.84)',
            borderWidth: 0,
            textStyle: { color: '#fff' },
            formatter: (params) => {
                const item = params.data || {};
                const [timestamp, views] = item.value || [];
                const date = timestamp ? new Date(timestamp).toLocaleDateString() : '-';
                return [
                    `<strong>${item.title || '-'}</strong>`,
                    `${t('columns.date', 'Date')}: ${date}`,
                    `${t('columns.views', 'Views')}: ${Number(views || 0).toLocaleString()}`,
                    `${t('columns.likes', 'Likes')}: ${Number(item.likes || 0).toLocaleString()}`,
                    `${t('columns.comments', 'Comments')}: ${Number(item.comments || 0).toLocaleString()}`
                ].join('<br/>');
            }
        },
        xAxis: {
            type: 'time',
            name: t('columns.date', 'Date'),
            nameTextStyle: { color: '#86868B', fontSize: 11, padding: [4, 0, 0, 0] },
            axisLabel: {
                color: '#86868B',
                formatter: (value) => new Date(value).toLocaleDateString()
            },
            axisLine: { lineStyle: { color: 'rgba(0,0,0,0.12)' } },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            name: t('columns.views', 'Views'),
            nameTextStyle: { color: '#86868B', fontSize: 11, padding: [0, 0, 8, 0] },
            axisLabel: {
                color: '#86868B',
                formatter: (value) => Number(value).toLocaleString()
            },
            splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } }
        },
        series: [
            {
                name: t('articles', 'Articles'),
                type: 'scatter',
                data: points,
                symbolSize: (item) => item.symbolSize || 10,
                itemStyle: {
                    color: 'rgba(217, 48, 37, 0.62)',
                    borderColor: 'rgba(217, 48, 37, 1)',
                    borderWidth: 1
                },
                emphasis: {
                    scale: 1.25,
                    itemStyle: {
                        color: 'rgba(217, 48, 37, 0.85)',
                        borderWidth: 2
                    }
                }
            }
        ]
    }), [points, t]);

    return (
        <div style={{ padding: 20, height: 300 }}>
            <ReactECharts
                option={option}
                notMerge
                lazyUpdate
                style={{ height: '100%', width: '100%' }}
            />
        </div>
    );
}
