import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function DigitalPersona({ data }) {
    const { t } = useLanguage();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!data) return null;

    return (
        <div className="section" style={{ marginBottom: 24 }}>
            <div className="section-header">
                <span className="card-title">🤖 {t('digitalPersona', 'AI Digital Persona')}</span>
                <span className="meta-text" style={{ fontSize: 12 }}>
                    {t('generatedAt', 'Generated at')}: {mounted ? new Date(data.generated_at).toLocaleDateString() : '--'}
                </span>
            </div>

            <div className="card" style={{ padding: 24, background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', border: '1px solid rgba(0,0,0,0.06)' }}>
                {/* 1. Header with Nickname & Keywords */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-color)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24
                        }}>
                            🧠
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{data.nickname}</h3>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('personaSubtitle', 'AI Analysis based on historical activity')}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {data.keywords && data.keywords.map((kw, i) => (
                            <span key={i} style={{
                                padding: '4px 12px', borderRadius: 20, background: 'rgba(215, 0, 15, 0.08)',
                                color: 'var(--accent-color)', fontSize: 13, fontWeight: 500
                            }}>
                                #{kw}
                            </span>
                        ))}
                    </div>
                </div>

                {/* 2. Impression */}
                <div style={{ marginBottom: 24 }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--text-primary)', opacity: 0.8 }}>{t('digitalImpression', 'Digital Impression')}</h4>
                    <p style={{
                        margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--text-secondary)',
                        background: 'white', padding: 16, borderRadius: 12, border: '1px solid rgba(0,0,0,0.04)',
                        fontStyle: 'italic'
                    }}>
                        {data.impression}
                    </p>
                </div>

                {/* 3. Suggestions */}
                <div>
                    <h4 style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--text-primary)', opacity: 0.8 }}>{t('creativeSuggestions', 'Creative Suggestions')}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                        {data.suggestions && data.suggestions.map((sug, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'start', gap: 8, padding: 12,
                                background: 'rgba(0,0,0,0.02)', borderRadius: 8
                            }}>
                                <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{i + 1}.</span>
                                <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{sug}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
