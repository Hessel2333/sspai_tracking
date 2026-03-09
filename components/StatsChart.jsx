import { useMemo } from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

const AGGREGATION_THRESHOLD = 72;

function getNestedValue(obj, path) {
    return path.split('.').reduce((cur, key) => (cur ? cur[key] : undefined), obj);
}

function extractValue(entry, dataKey) {
    let val = getNestedValue(entry, dataKey);

    if (val === undefined) {
        if (dataKey === 'totals.views') val = entry.total_views;
        if (dataKey === 'totals.likes') val = entry.total_likes;
        if (dataKey === 'totals.comments') val = entry.total_comments;
        if (dataKey === 'views') val = entry.total_views ?? entry.views;
        if (dataKey === 'likes') val = entry.total_likes ?? entry.likes;
        if (dataKey === 'comments') val = entry.total_comments ?? entry.comments;
    }

    const numeric = Number(val);
    return Number.isFinite(numeric) ? numeric : 0;
}

function colorWithAlpha(color, alpha) {
    if (color.startsWith('rgb(')) {
        return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    if (color.startsWith('rgba(')) return color;
    if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
        const hex = color.length === 4
            ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
            : color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
}

function formatLocalDateKey(timestamp) {
    const dt = new Date(timestamp);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatPointLabel(timestamp, aggregated) {
    const dt = new Date(timestamp);
    return aggregated
        ? dt.toLocaleDateString()
        : dt.toLocaleString();
}

export default function StatsChart({ history, title = 'Trend', dataKey = 'views', color = 'rgb(217, 48, 37)' }) {
    const rawPoints = useMemo(() => {
        return [...(history || [])]
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map((entry) => {
                const ts = new Date(entry.timestamp).getTime();
                if (!Number.isFinite(ts)) return null;
                return {
                    value: [ts, extractValue(entry, dataKey)],
                    rawTimestamp: ts,
                    sampleCount: 1,
                    aggregated: false
                };
            })
            .filter(Boolean);
    }, [history, dataKey]);

    const points = useMemo(() => {
        if (rawPoints.length <= AGGREGATION_THRESHOLD) {
            return rawPoints;
        }

        const buckets = new Map();
        rawPoints.forEach((point) => {
            const key = formatLocalDateKey(point.rawTimestamp);
            const existing = buckets.get(key);
            if (!existing) {
                buckets.set(key, {
                    ...point,
                    sampleCount: 1,
                    aggregated: false
                });
                return;
            }

            buckets.set(key, {
                ...point,
                sampleCount: existing.sampleCount + 1,
                aggregated: true
            });
        });

        return Array.from(buckets.values()).map((point) => ({
            ...point,
            aggregated: point.sampleCount > 1
        }));
    }, [rawPoints]);

    const options = useMemo(() => ({
        animationDuration: 260,
        grid: {
            left: 40,
            right: 18,
            top: 18,
            bottom: 28
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(0,0,0,0.84)',
            borderWidth: 0,
            textStyle: { color: '#fff' },
            axisPointer: {
                type: 'line',
                lineStyle: { color: colorWithAlpha(color, 0.45) }
            },
            formatter: (items) => {
                const point = Array.isArray(items) ? items[0] : items;
                if (!point) return '';
                const currentPoint = points[point.dataIndex];
                const prevPoint = point.dataIndex > 0 ? points[point.dataIndex - 1] : null;
                const dt = formatPointLabel(point.value[0], currentPoint?.aggregated);
                const value = Number(point.value[1] || 0).toLocaleString();
                const delta = prevPoint
                    ? Number(point.value[1] - prevPoint.value[1]).toLocaleString()
                    : null;
                const sampleLine = currentPoint?.sampleCount > 1
                    ? `<br/>采样点: ${currentPoint.sampleCount}`
                    : '';
                const deltaLine = delta !== null
                    ? `<br/>增量: ${delta}`
                    : '';
                return `${dt}<br/>${title}: ${value}${deltaLine}${sampleLine}`;
            }
        },
        xAxis: {
            type: 'time',
            boundaryGap: false,
            axisLine: { lineStyle: { color: 'rgba(0,0,0,0.12)' } },
            axisLabel: {
                color: '#86868B',
                formatter: (value) => {
                    const dt = new Date(value);
                    return `${dt.getMonth() + 1}/${dt.getDate()}`;
                }
            },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            scale: true,
            axisLabel: {
                color: '#86868B',
                formatter: (value) => Number(value).toLocaleString()
            },
            splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)' } }
        },
        series: [
            {
                name: title,
                type: 'line',
                smooth: 0.18,
                smoothMonotone: 'x',
                symbol: 'circle',
                showSymbol: points.length <= 36,
                symbolSize: points.length <= 36 ? 6 : 3,
                lineStyle: {
                    width: 3,
                    color,
                    cap: 'round',
                    join: 'round'
                },
                itemStyle: {
                    color,
                    borderColor: '#fff',
                    borderWidth: 1.5
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: colorWithAlpha(color, 0.18) },
                            { offset: 1, color: colorWithAlpha(color, 0.02) }
                        ]
                    }
                },
                emphasis: { focus: 'series' },
                data: points
            }
        ]
    }), [color, points, title]);

    if (points.length === 0) {
        return <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#86868B', fontSize: 13 }}>No data</div>;
    }

    return (
        <div style={{ height: '300px', position: 'relative' }}>
            <ReactECharts
                option={options}
                notMerge
                lazyUpdate
                style={{ height: '100%', width: '100%' }}
            />
        </div>
    );
}
