import Link from 'next/link';
import dayjs from 'dayjs';

export default function ProfileHeader({ userData, totals, t, lang }) {
    if (!userData) return null;

    const daysJoined = userData.created_at ? Math.floor((dayjs().unix() - userData.created_at) / 86400) : '-';

    // Formatting helper
    const formatNumber = (num) => {
        if (!num) return '0';
        if (num > 10000) return (num / 10000).toFixed(1) + (t('unitTenThousand') || 'w');
        return num.toLocaleString();
    };

    return (
        <div className="profile-header card glass-panel" style={{ padding: '24px 32px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
            {/* Top Row: Info & Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                {/* User Info */}
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <div className="avatar-container" style={{ position: 'relative' }}>
                        <img
                            src={userData.avatar}
                            alt={userData.nickname}
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: '50%',
                                border: '3px solid rgba(255, 255, 255, 0.8)',
                                boxShadow: '0 6px 16px rgba(0,0,0,0.08)'
                            }}
                        />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                            {userData.nickname}
                        </h1>
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 600, lineHeight: 1.4 }}>
                            {userData.bio || t('bio')}
                        </p>
                    </div>
                </div>

                {/* Badges (Top Right) */}
                {userData.user_reward_badges && userData.user_reward_badges.length > 0 && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        {userData.user_reward_badges.slice(0, 3).map(badge => (
                            <div key={badge.id} title={badge.name} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.03)', padding: 4 }}>
                                <img src={badge.icon} alt={badge.name} style={{ width: '100%', height: '100%' }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Row: Metrics Grid */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 20 }}>
                <div style={{ display: 'flex', gap: 32 }}>
                    {/* Joined */}
                    <div className="profile-metric">
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('joinedLabel')}</span>
                        <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {daysJoined}<small style={{ fontSize: 12, fontWeight: 400, marginLeft: 2 }}>{t('days')}</small>
                        </span>
                    </div>

                    {/* Views */}
                    <div className="profile-metric">
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('viewLabel')}</span>
                        <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {formatNumber(totals.views || userData.article_view_count)}
                        </span>
                    </div>

                    {/* Likes Received */}
                    <div className="profile-metric">
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('chargingLabel')}</span>
                        <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {totals.likes || userData.liked_count || 0}<small style={{ fontSize: 12, marginLeft: 2 }}>⚡</small>
                        </span>
                    </div>

                    {/* Followers (New) */}
                    <div className="profile-metric">
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('metricsFollowers')}</span>
                        <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {userData.followers?.total || 0}
                        </span>
                    </div>

                    {/* Following */}
                    <div className="profile-metric">
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('followedUsers')}</span>
                        <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {userData.following_count || userData.engagement?.following?.total || 0}
                        </span>
                    </div>

                    {/* Comments Made */}
                    <div className="profile-metric">
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('personalComments')}</span>
                        <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {userData.engagement?.comments_made_total || 0}
                        </span>
                    </div>

                    {/* Likes Given */}
                    <div className="profile-metric">
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{t('likedGiven')}</span>
                        <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                            {userData.engagement?.likes_given_total || 0}
                        </span>
                    </div>
                </div>

                {/* External Link */}
                <a
                    href={`https://sspai.com/u/${userData.slug}/posts`}
                    target="_blank"
                    className="btn-primary"
                    style={{
                        background: '#1a1a1a',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}
                >
                    {t('viewOnSSPAI')} ↗
                </a>
            </div>
        </div>
    );
}
