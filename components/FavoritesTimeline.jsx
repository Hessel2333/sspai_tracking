import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import dayjs from 'dayjs';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

const FavoritesTimeline = ({ favorites, t }) => {
    const { months, values } = useMemo(() => {
        if (!favorites || favorites.length === 0) {
            return { months: [], values: [] };
        }

        const stats = {};
        favorites.forEach((fav) => {
            if (!fav.created_at || fav.created_at === 0) return;
            const month = dayjs.unix(fav.created_at).format('YYYY-MM');
            if (month === 'Invalid Date') return;
            stats[month] = (stats[month] || 0) + 1;
        });

        const sortedMonths = Object.keys(stats).sort();
        const displayMonths = sortedMonths.length > 18 ? sortedMonths.slice(sortedMonths.length - 18) : sortedMonths;
        return {
            months: displayMonths,
            values: displayMonths.map((month) => stats[month])
        };
    }, [favorites]);

    if (months.length === 0) return null;

    const option = {
        animationDuration: 400,
        grid: {
            left: 34,
            right: 18,
            top: 22,
            bottom: 22
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(0,0,0,0.84)',
            borderWidth: 0,
            textStyle: { color: '#fff' },
            axisPointer: { type: 'shadow' },
            formatter: (params) => {
                const item = params?.[0];
                if (!item) return '';
                const title = dayjs(`${item.axisValue}-01`).format('YYYY年M月');
                return `${title}<br/>${t('favoritesCount', '收藏数量')}: ${Number(item.data || 0).toLocaleString()}`;
            }
        },
        xAxis: {
            type: 'category',
            data: months,
            axisLabel: {
                color: '#86868B',
                fontSize: 10
            },
            axisLine: { lineStyle: { color: 'rgba(0,0,0,0.12)' } },
            axisTick: { show: false }
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            axisLabel: {
                color: '#86868B',
                formatter: (value) => Number(value).toLocaleString()
            },
            splitLine: { lineStyle: { color: 'rgba(0,0,0,0.05)', type: 'dashed' } }
        },
        series: [
            {
                type: 'bar',
                data: values,
                barMaxWidth: 24,
                itemStyle: {
                    color: 'rgba(217, 48, 37, 0.72)',
                    borderRadius: [5, 5, 0, 0]
                },
                emphasis: {
                    itemStyle: {
                        color: 'rgba(217, 48, 37, 0.95)'
                    }
                }
            }
        ]
    };

    return (
        <div style={{ height: 250, width: '100%' }}>
            <ReactECharts
                option={option}
                notMerge
                lazyUpdate
                style={{ height: '100%', width: '100%' }}
            />
        </div>
    );
};

export default FavoritesTimeline;
