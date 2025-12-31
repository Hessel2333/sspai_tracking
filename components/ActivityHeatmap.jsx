import React, { useMemo } from 'react';
import dayjs from 'dayjs';

export default function ActivityHeatmap({ data, activities = [], t, style }) {
    // Generate last 365 days of activity map
    const activityMap = useMemo(() => {
        const map = {};
        const sourceData = activities.length > 0 ? activities : (data?.[data.length - 1]?.user?.engagement?.all_activities || []);

        sourceData.forEach(act => {
            const date = dayjs.unix(act.created_at).format('YYYY-MM-DD');
            map[date] = (map[date] || 0) + 1;
        });
        return map;
    }, [data, activities]);

    const days = useMemo(() => {
        const result = [];
        const today = dayjs();
        for (let i = 364; i >= 0; i--) {
            const date = today.subtract(i, 'day');
            const dateStr = date.format('YYYY-MM-DD');
            result.push({
                date: dateStr,
                count: activityMap[dateStr] || 0,
                dayOfWeek: date.day()
            });
        }
        return result;
    }, [activityMap]);

    // Group days by week (7 days each)
    const weeks = [];
    let currentWeek = [];

    // Find how many empty cells to add to the first week to align with the start of the grid
    const firstDate = dayjs(days[0].date);
    const padding = firstDate.day(); // 0 is Sunday
    for (let p = 0; p < padding; p++) currentWeek.push(null);

    days.forEach((day, i) => {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);

    const getColor = (count) => {
        if (count === 0) return '#ebedf0';
        if (count < 2) return '#9be9a8';
        if (count < 5) return '#40c463';
        if (count < 10) return '#30a14e';
        return '#216e39';
    };

    return (
        <div style={{ overflowX: 'auto', ...style }}>
            <div style={{ display: 'flex', gap: 4, minWidth: 800 }}>
                {weeks.map((week, wi) => (
                    <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {week.map((day, di) => (
                            <div
                                key={di}
                                title={day ? `${day.date}: ${day.count} ${t('interactions', 'Interactions')}` : ''}
                                style={{
                                    width: 10,
                                    height: 10,
                                    backgroundColor: day ? getColor(day.count) : 'transparent',
                                    borderRadius: 2,
                                    visibility: day ? 'visible' : 'hidden'
                                }}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>
                <div>{t('activityHeatmapDesc', 'Activity Distribution (Last Year)')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>{t('less', 'Less')}</span>
                    <div style={{ width: 10, height: 10, backgroundColor: '#ebedf0', borderRadius: 2 }} />
                    <div style={{ width: 10, height: 10, backgroundColor: '#9be9a8', borderRadius: 2 }} />
                    <div style={{ width: 10, height: 10, backgroundColor: '#40c463', borderRadius: 2 }} />
                    <div style={{ width: 10, height: 10, backgroundColor: '#30a14e', borderRadius: 2 }} />
                    <div style={{ width: 10, height: 10, backgroundColor: '#216e39', borderRadius: 2 }} />
                    <span>{t('more', 'More')}</span>
                </div>
            </div>
        </div>
    );
}
