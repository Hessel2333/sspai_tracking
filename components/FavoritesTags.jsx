import { useMemo } from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

const COLORS = ['#F57C00', '#00897B', '#1E88E5', '#8E24AA', '#607D8B', '#D81B60', '#43A047', '#FB8C00'];

const FavoritesTags = ({ favorites, t }) => {
    const data = useMemo(() => {
        if (!favorites || favorites.length === 0) {
            return [];
        }

        const tagStats = {};
        favorites.forEach((fav) => {
            if (!fav.tags || !Array.isArray(fav.tags)) return;
            fav.tags.forEach((tag) => {
                tagStats[tag] = (tagStats[tag] || 0) + 1;
            });
        });

        return Object.entries(tagStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, value]) => ({ name, value }));
    }, [favorites]);

    if (!favorites || favorites.length === 0) return null;

    if (data.length === 0) {
        return (
            <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 13 }}>
                {t('noTagData') || '无标签数据'}
            </div>
        );
    }

    const option = {
        animationDuration: 400,
        color: COLORS,
        tooltip: {
            trigger: 'item',
            backgroundColor: 'rgba(0,0,0,0.84)',
            borderWidth: 0,
            textStyle: { color: '#fff' },
            formatter: (params) => `${params.name}<br/>${t('favoritesCount', '收藏数量')}: ${Number(params.value || 0).toLocaleString()}`
        },
        legend: {
            orient: 'vertical',
            right: 0,
            top: 'center',
            textStyle: {
                color: '#86868B',
                fontSize: 12
            },
            icon: 'circle'
        },
        series: [
            {
                type: 'pie',
                radius: ['44%', '68%'],
                center: ['34%', '50%'],
                avoidLabelOverlap: true,
                label: { show: false },
                labelLine: { show: false },
                itemStyle: {
                    borderColor: '#fff',
                    borderWidth: 2
                },
                emphasis: {
                    scale: true,
                    scaleSize: 6
                },
                data
            }
        ]
    };

    return (
        <div style={{ height: 250, width: '100%', position: 'relative' }}>
            <ReactECharts option={option} notMerge lazyUpdate style={{ height: '100%', width: '100%' }} />
        </div>
    );
};

export default FavoritesTags;
