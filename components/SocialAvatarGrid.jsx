import { useLanguage } from '../contexts/LanguageContext';

export default function SocialAvatarGrid({ authors }) {
    const { t } = useLanguage();

    if (!authors || authors.length === 0) {
        return <div style={{ color: '#999', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Pending analytics...</div>;
    }

    return (
        <div className="avatar-bubble-grid">
            {authors.map((author, i) => {
                // Determine size based on interaction count (top 3 are larger)
                let size = 50;
                if (i === 0) size = 80;
                else if (i < 3) size = 65;
                else if (i < 6) size = 55;

                return (
                    <div key={i} className="avatar-bubble-item" style={{
                        width: size,
                        height: size,
                        position: 'relative'
                    }}>
                        <a
                            href={author.slug ? `https://sspai.com/u/${author.slug}` : '#'}
                            target="_blank"
                            className="avatar-link"
                        >
                            <img
                                src={author.avatar || '/avatar_placeholder.png'}
                                alt={author.name}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: i === 0 ? '3px solid var(--accent-color)' : '2px solid rgba(0,0,0,0.05)',
                                    transition: 'transform 0.2s cubic-bezier(0.12, 0, 0.39, 0)',
                                }}
                                className="bubble-img"
                            />
                            <div className="bubble-tooltip">
                                <span className="tooltip-name">{author.name}</span>
                                <span className="tooltip-count">{author.count} {t('interacts')}</span>
                            </div>
                            {i < 3 && (
                                <div className="bubble-badge" style={{
                                    position: 'absolute',
                                    bottom: -2,
                                    right: -2,
                                    background: 'var(--accent-color)',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: 20,
                                    height: 20,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10,
                                    fontWeight: 'bold',
                                    border: '2px solid white',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    {i + 1}
                                </div>
                            )}
                        </a>
                    </div>
                );
            })}
            <style jsx>{`
                .avatar-bubble-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    justify-content: center;
                    align-items: center;
                    padding: 20px 0;
                    min-height: 250px;
                }
                .avatar-bubble-item {
                    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    cursor: pointer;
                    position: relative;
                }
                .bubble-tooltip {
                    position: absolute;
                    bottom: 110%;
                    left: 50%;
                    transform: translateX(-50%) translateY(10px);
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(4px);
                    color: white;
                    padding: 6px 10px;
                    border-radius: 8px;
                    font-size: 11px;
                    white-space: nowrap;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.2s cubic-bezier(0.12, 0, 0.39, 0);
                    pointer-events: none;
                    z-index: 100;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                }
                .bubble-tooltip::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border-width: 5px;
                    border-style: solid;
                    border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
                }
                .tooltip-name {
                    font-weight: 600;
                }
                .tooltip-count {
                    font-size: 10px;
                    opacity: 0.8;
                }
                .avatar-bubble-item:hover .bubble-tooltip {
                    opacity: 1;
                    visibility: visible;
                    transform: translateX(-50%) translateY(0);
                }
                .avatar-bubble-item:hover {
                    transform: scale(1.15) translateY(-5px);
                    z-index: 10;
                }
                .avatar-link {
                    display: block;
                    width: 100%;
                    height: 100%;
                }
                .bubble-img:hover {
                    box-shadow: 0 8px 16px rgba(0,0,0,0.15);
                }
            `}</style>
        </div>
    );
}
